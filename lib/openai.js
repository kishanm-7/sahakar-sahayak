import OpenAI from 'openai';

export const MODELS = {
  chat: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
  embedding: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
  stt: process.env.OPENAI_STT_MODEL || 'whisper-1',
  tts: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
  ttsVoice: process.env.OPENAI_TTS_VOICE || 'alloy',
};

let client = null;

/**
 * Get the shared OpenAI client, creating it on first use.
 *
 * This is lazy on purpose. The OpenAI constructor throws if the key is
 * missing, and `next build` imports every route file to analyse it -- so
 * building the client at module load would make the whole project fail to
 * build on any machine without a key set. Creating it on the first actual API
 * call means a missing key surfaces as a clear runtime error in one request,
 * not as a broken build.
 */
export function getOpenAI() {
  assertApiKey();
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export function assertApiKey() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      'OPENAI_API_KEY is missing. Copy .env.local.example to .env.local, paste your key in, and restart the dev server.'
    );
  }
}
