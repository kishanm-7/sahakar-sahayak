import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { getOpenAI, MODELS } from './openai.js';

// ---------------------------------------------------------------------------
// The world's simplest vector database: one JSON file (or compressed .gz) on disk.
//
// Why not Pinecone / Chroma / pgvector? Because this has to boot on a laptop
// in a demo hall with unreliable wifi and zero setup. A few thousand chunks
// scanned linearly takes single-digit milliseconds, which is nothing next to
// the OpenAI round-trip we are about to make anyway. If the corpus ever grew
// past ~50k chunks, this is the one file you would swap out.
// ---------------------------------------------------------------------------

export const STORE_PATH = path.join(process.cwd(), 'data', 'vectors.json');
export const COMPRESSED_STORE_PATH = path.join(process.cwd(), 'data', 'vectors.json.gz');

export const CATEGORIES = ['law', 'scheme', 'pmfby', 'finance', 'grievance'];

let cachedStore = null;

export function loadStore() {
  if (cachedStore) return cachedStore;

  // 1. Try uncompressed local JSON file first (used during local ingestion/dev)
  if (fs.existsSync(STORE_PATH)) {
    try {
      cachedStore = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
      return cachedStore;
    } catch (err) {
      console.warn(`[vectorStore] Failed to parse uncompressed ${STORE_PATH}:`, err.message);
    }
  }

  // 2. Try compressed local .json.gz file (committed to Git for Vercel production deployment)
  if (fs.existsSync(COMPRESSED_STORE_PATH)) {
    try {
      const gzippedBuffer = fs.readFileSync(COMPRESSED_STORE_PATH);
      const decompressedStr = zlib.gunzipSync(gzippedBuffer).toString('utf8');
      cachedStore = JSON.parse(decompressedStr);
      return cachedStore;
    } catch (err) {
      console.error(`[vectorStore] Failed to read/decompress ${COMPRESSED_STORE_PATH}:`, err.message);
    }
  }

  cachedStore = { model: MODELS.embedding, createdAt: null, chunks: [] };
  return cachedStore;
}

export function saveStore(store) {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });

  // Round float embeddings to 5 decimal places to cut store size by >50%
  // while preserving >99.999999% cosine similarity precision.
  if (Array.isArray(store.chunks)) {
    store.chunks.forEach((chunk) => {
      if (Array.isArray(chunk.embedding)) {
        chunk.embedding = chunk.embedding.map((val) => Math.round(val * 100000) / 100000);
      }
    });
  }

  const jsonString = JSON.stringify(store);

  // Write uncompressed version (git-ignored)
  fs.writeFileSync(STORE_PATH, jsonString, 'utf8');

  // Write compressed .gz version (git-tracked for production)
  const compressedBuffer = zlib.gzipSync(Buffer.from(jsonString, 'utf8'));
  fs.writeFileSync(COMPRESSED_STORE_PATH, compressedBuffer);

  cachedStore = store;
}

/** Forces the next loadStore() to re-read from disk (used after ingestion). */
export function clearCache() {
  cachedStore = null;
}

/**
 * Cosine similarity between two vectors.
 *
 * It measures the angle between them, not their length -- so it answers "do
 * these two pieces of text mean the same thing?" rather than "are they the
 * same size?". 1.0 means identical direction, 0 means unrelated.
 */
export function cosineSimilarity(a, b) {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

/** Turn a piece of text into an embedding vector via the OpenAI API. */
export async function embedText(text) {
  const res = await getOpenAI().embeddings.create({
    model: MODELS.embedding,
    input: text,
  });
  return res.data[0].embedding;
}

/** Batch version, used by the ingestion script so we make far fewer calls. */
export async function embedBatch(texts) {
  const res = await getOpenAI().embeddings.create({
    model: MODELS.embedding,
    input: texts,
  });
  // The API preserves input order, but sort by index to be safe.
  return res.data.sort((x, y) => x.index - y.index).map((d) => d.embedding);
}

/**
 * The retrieval half of RAG.
 *
 * Embed the user's question into the same vector space the documents live in,
 * score every stored chunk by cosine similarity, and hand back the closest
 * `topK`. Those chunks become the context the model is allowed to answer from.
 *
 * @param {string} query    the user's question
 * @param {number} topK     how many chunks to return
 * @param {object} options  { category, minScore }
 */
export async function retrieveRelevantChunks(query, topK = 5, options = {}) {
  const { category = null, minScore = 0.2 } = options;
  const store = loadStore();

  if (!store.chunks.length) return [];

  const queryEmbedding = await embedText(query);

  let candidates = store.chunks;
  if (category && CATEGORIES.includes(category)) {
    candidates = candidates.filter((c) => c.category === category);
    // If that filter emptied the pool, fall back to searching everything
    // rather than answering "I don't know" for a perfectly answerable question.
    if (!candidates.length) candidates = store.chunks;
  }

  const scored = candidates.map((chunk) => ({
    ...chunk,
    score: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .filter((c) => c.score >= minScore)
    // Drop the embedding before returning -- it is 1536 numbers we do not need
    // downstream, and leaving it in would bloat every log and API response.
    .map(({ embedding, ...rest }) => rest);
}

export function storeStats() {
  const store = loadStore();
  const byCategory = {};
  const bySource = new Set();
  for (const c of store.chunks) {
    byCategory[c.category] = (byCategory[c.category] || 0) + 1;
    bySource.add(c.source);
  }
  return {
    chunks: store.chunks.length,
    documents: bySource.size,
    byCategory,
    model: store.model,
    createdAt: store.createdAt,
  };
}
