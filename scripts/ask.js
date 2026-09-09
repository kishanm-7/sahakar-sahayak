import './load-env.js'; // must be first

import { answerFromRAG } from '../lib/rag.js';
import { storeStats } from '../lib/vectorStore.js';

// Quick way to test the RAG pipeline from the terminal, without the web UI.
//
//   node scripts/ask.js "What is a PACS?"
//   node scripts/ask.js "PMFBY क्या है?"

const question = process.argv.slice(2).join(' ');

if (!question) {
  console.log('\nUsage: node scripts/ask.js "your question here"\n');
  process.exit(1);
}

const stats = storeStats();
if (!stats.chunks) {
  console.error('\n  The vector store is empty. Run `npm run ingest` first.\n');
  process.exit(1);
}

console.log(`\nStore: ${stats.chunks} chunks from ${stats.documents} document(s)`);
console.log(`Question: ${question}\n`);

const started = Date.now();
const result = await answerFromRAG(question);

console.log(result.answer);
console.log(`\n---`);
console.log(`language : ${result.language}`);
console.log(`sources  : ${result.sources.join(', ') || '(none matched)'}`);
console.log(`took     : ${((Date.now() - started) / 1000).toFixed(1)}s\n`);
