import './load-env.js'; // must be first -- see the comment inside that file

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

import { cleanText, chunkText, estimateTokens } from '../lib/chunk.js';
import { embedBatch, saveStore, CATEGORIES } from '../lib/vectorStore.js';
import { MODELS } from '../lib/openai.js';

// pdf-parse is CommonJS, and importing its package entry point runs a debug
// block that tries to read a test PDF that does not exist here. Requiring the
// library file directly skips that. This is a long-standing quirk of the
// package, not something we did wrong.
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse/lib/pdf-parse.js');

// Your RAG knowledge-base documents live here, organised into subfolders.
// The ingest script reads this folder recursively, so every PDF in every
// subfolder is picked up automatically.
const DOCUMENTS_DIR = path.join(process.cwd(), 'data', 'RAG DOCS');
const CATEGORY_CONFIG = path.join(process.cwd(), 'config', 'categories.json');

// Embeddings are cheap but rate limits are real. 64 chunks per request keeps
// us well inside the payload limit while cutting the number of round trips by
// two orders of magnitude versus one call per chunk.
const BATCH_SIZE = 64;

/**
 * Work out which topic a file belongs to.
 *
 * Priority 1: manual override in config/categories.json (keyed by filename).
 * Priority 2: parent subfolder name — since the user organised files into
 *             named category folders (e.g. "AGRI OR PM KISAN"), we map those
 *             folder names directly to canonical categories.
 * Priority 3: keyword scan of the filename itself.
 * Fallback   : 'scheme' (the broadest bucket).
 */
function categoriseFile(filePath, manualMap) {
  const filename = path.basename(filePath);
  if (manualMap[filename]) return manualMap[filename];

  // Use the immediate parent folder name as a strong category hint.
  const folderName = path.basename(path.dirname(filePath)).toLowerCase();
  const folderRules = [
    { category: 'pmfby',    keywords: ['agri', 'pm kisan', 'kisan', 'pmfby', 'crop', 'insurance'] },
    { category: 'scheme',   keywords: ['cooperative', 'coooperative'] },
    { category: 'finance',  keywords: ['financial', 'finaincial', 'finance'] },
    { category: 'grievance',keywords: ['grievance', 'complaint'] },
    { category: 'scheme',   keywords: ['regional', 'regonall', 'kerala', 'state'] },
  ];
  for (const rule of folderRules) {
    if (rule.keywords.some((k) => folderName.includes(k))) return rule.category;
  }

  // Fall back to filename keyword scan.
  const name = filename.toLowerCase();
  const rules = [
    { category: 'pmfby',    keywords: ['pmfby', 'fasal', 'crop', 'insurance', 'bima', 'kisan'] },
    { category: 'grievance',keywords: ['grievance', 'complaint', 'redress', 'shikayat', 'ombudsman'] },
    { category: 'finance',  keywords: ['financial', 'finance', 'literacy', 'credit', 'loan', 'saving', 'banking'] },
    { category: 'law',      keywords: ['act', 'law', 'bylaw', 'by-law', 'rule', 'legal', 'amendment', 'section'] },
    { category: 'scheme',   keywords: ['scheme', 'yojana', 'ministry', 'pacs', 'nabard', 'programme', 'policy'] },
  ];
  for (const rule of rules) {
    if (rule.keywords.some((k) => name.includes(k))) return rule.category;
  }

  return 'scheme'; // broadest fallback
}

async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.pdf') {
    const data = await pdfParse(fs.readFileSync(filePath));
    return data.text;
  }

  if (['.txt', '.md', '.csv', '.json'].includes(ext)) {
    return fs.readFileSync(filePath, 'utf8');
  }

  return null; // unsupported type -- skipped with a warning
}

/** Walk /documents recursively so you can organise files into subfolders. */
function listFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('\n  OPENAI_API_KEY is not set.');
    console.error('  Copy .env.local.example to .env.local and paste your key in.\n');
    process.exit(1);
  }

  if (!fs.existsSync(DOCUMENTS_DIR)) {
    console.error(`\n  No /documents folder found at ${DOCUMENTS_DIR}\n`);
    process.exit(1);
  }

  let manualMap = {};
  if (fs.existsSync(CATEGORY_CONFIG)) {
    manualMap = JSON.parse(fs.readFileSync(CATEGORY_CONFIG, 'utf8'));
  }

  const files = listFiles(DOCUMENTS_DIR).filter((f) => !f.endsWith('README.md'));

  if (!files.length) {
    console.error('\n  /documents is empty. Drop some PDF or .txt files in there first.\n');
    process.exit(1);
  }

  console.log(`\nIngesting ${files.length} file(s) from data/RAG DOCS\n`);

  // ---- Step 1: read every file and split it into chunks --------------------
  const pending = [];

  for (const filePath of files) {
    const filename = path.basename(filePath);
    let raw;

    try {
      raw = await extractText(filePath);
    } catch (err) {
      console.warn(`  ! ${filename}: could not read (${err.message})`);
      continue;
    }

    if (raw === null) {
      console.warn(`  - ${filename}: skipped (unsupported file type)`);
      continue;
    }

    const text = cleanText(raw);
    if (text.length < 100) {
      console.warn(`  - ${filename}: skipped (almost no text -- is it a scanned PDF?)`);
      continue;
    }

    const category = categoriseFile(filePath, manualMap);
    const chunks = chunkText(text);

    chunks.forEach((chunkTextValue, i) => {
      pending.push({
        id: `${filename}#${i}`,
        source: filename,
        category,
        index: i,
        text: chunkTextValue,
        tokens: estimateTokens(chunkTextValue),
      });
    });

    console.log(`  + ${filename}  ->  ${chunks.length} chunks  [${category}]`);
  }

  if (!pending.length) {
    console.error('\n  Nothing could be extracted from those files.\n');
    process.exit(1);
  }

  // ---- Step 2: embed the chunks in batches --------------------------------
  console.log(`\nEmbedding ${pending.length} chunks with ${MODELS.embedding} ...`);

  const stored = [];
  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE);
    const embeddings = await embedBatch(batch.map((c) => c.text));

    batch.forEach((chunk, j) => stored.push({ ...chunk, embedding: embeddings[j] }));

    const done = Math.min(i + BATCH_SIZE, pending.length);
    process.stdout.write(`  ${done}/${pending.length}\r`);
  }

  // ---- Step 3: write the store to disk ------------------------------------
  saveStore({
    model: MODELS.embedding,
    createdAt: new Date().toISOString(),
    chunks: stored,
  });

  const byCategory = {};
  for (const c of stored) byCategory[c.category] = (byCategory[c.category] || 0) + 1;

  console.log('\n\nDone. Saved to data/vectors.json');
  console.log(`  documents : ${new Set(stored.map((c) => c.source)).size}`);
  console.log(`  chunks    : ${stored.length}`);
  for (const cat of CATEGORIES) {
    if (byCategory[cat]) console.log(`  ${cat.padEnd(10)}: ${byCategory[cat]} chunks`);
  }
  console.log('\nNow run:  npm run dev\n');
}

main().catch((err) => {
  console.error('\nIngestion failed:', err.message, '\n');
  process.exit(1);
});
