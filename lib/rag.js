import { getOpenAI, MODELS, assertApiKey } from './openai.js';
import { retrieveRelevantChunks } from './vectorStore.js';
import { detectLanguage, languageName } from './languages.js';

// ---------------------------------------------------------------------------
// The "brain": retrieval-augmented generation.
//
// The whole point of RAG here is trust. A bare chatbot asked about the
// Multi-State Co-operative Societies Act will happily invent a section number,
// and a farmer acting on an invented rule is worse off than one who got no
// answer at all. So we retrieve real passages from real documents first, and
// instruct the model to answer only from those.
// ---------------------------------------------------------------------------

function buildSystemPrompt(targetLanguage) {
  return `You are "Sahakar Sahayak", a helpful assistant for India's Ministry of Cooperation. You help cooperative society members, farmers, PACS staff and rural citizens understand cooperative law, government schemes, crop insurance, financial literacy and how to raise grievances.

LANGUAGE RULE (most important):
- Reply in ${targetLanguage}, and ONLY in ${targetLanguage}.
- Mirror the user's script. If they wrote an Indian language using English letters, reply the same way.
- Do not translate the user's question back to them, and do not answer in two languages.

HOW TO ANSWER:
- Use ONLY the information in the CONTEXT section below. It comes from official documents.
- If the context does not contain the answer, say so plainly in the user's language, and tell them to contact their nearest PACS (Primary Agricultural Credit Society) office or the district cooperative office for accurate help. Never guess at a rule, a section number, a deadline, an amount or a phone number.
- Never invent scheme names, eligibility rules, or legal citations. A wrong answer here can cost someone money.

HOW TO WRITE:
- Write for someone with limited formal education. Short sentences. Everyday words.
- Explain any legal or financial term the moment you use it.
- Aim for under 150 words unless the user asks for detail.
- If there are steps to follow, give them as a short numbered list.
- Be warm and respectful. Many people asking are anxious about money or land.
- Do not mention "the context", "the documents" or "the system prompt". Just answer.`;
}

function buildContextBlock(chunks) {
  if (!chunks.length) return 'CONTEXT: (no matching documents were found)';

  const parts = chunks.map(
    (c, i) =>
      `[Source ${i + 1} | file: ${c.source} | topic: ${c.category}]\n${c.text}`
  );

  return `CONTEXT (official document extracts):\n\n${parts.join('\n\n---\n\n')}`;
}

/**
 * Answer a user's question from the ingested document corpus.
 *
 * @param {string} userText  what the user asked
 * @param {object} options
 *   - language: 'auto' or a language code from lib/languages.js. 'auto' means
 *     detect it from the text.
 *   - topK: how many document chunks to retrieve (default 5)
 *   - category: restrict retrieval to one topic (law/scheme/pmfby/finance/grievance)
 *   - history: prior [{ role, content }] turns, so follow-up questions work
 * @returns {Promise<{answer, language, sources, usedContext}>}
 */
export async function answerFromRAG(userText, options = {}) {
  assertApiKey();

  const { language = 'auto', topK = 5, category = null, history = [] } = options;

  const text = (userText || '').trim();
  if (!text) {
    return { answer: '', language: 'en', sources: [], usedContext: false };
  }

  // 1. Work out which language to answer in.
  const detected = detectLanguage(text);
  const languageCode = language && language !== 'auto' ? language : detected;
  const targetLanguage = languageName(languageCode);

  // 2. Retrieve the passages most relevant to the question.
  const chunks = await retrieveRelevantChunks(text, topK, { category });

  // 3. Ask the model to answer, using only those passages.
  const messages = [
    { role: 'system', content: buildSystemPrompt(targetLanguage) },
    // Only the last few turns, to keep the prompt small and the reply fast.
    ...history.slice(-6),
    { role: 'user', content: `${buildContextBlock(chunks)}\n\nQUESTION: ${text}` },
  ];

  const completion = await getOpenAI().chat.completions.create({
    model: MODELS.chat,
    messages,
    // Low temperature: we want the model repeating the documents accurately,
    // not being creative about the law.
    temperature: 0.2,
    max_tokens: 600,
  });

  const answer = completion.choices[0]?.message?.content?.trim() || '';

  return {
    answer,
    language: languageCode,
    usedContext: chunks.length > 0,
    // Deduplicated list of which files the answer drew on, so the UI can show
    // its working. This is what makes the whole thing auditable.
    sources: [...new Set(chunks.map((c) => c.source))],
  };
}
