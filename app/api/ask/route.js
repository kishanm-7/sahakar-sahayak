import { NextResponse } from 'next/server';
import { answerFromRAG } from '@/lib/rag';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/ask
// Body: { text, language?, category?, history? }
// Returns: { answer, language, sources, usedContext }
export async function POST(request) {
  try {
    const body = await request.json();
    const { text, language = 'auto', category = null, history = [] } = body || {};

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'Please send a "text" field.' }, { status: 400 });
    }

    const result = await answerFromRAG(text, { language, category, history });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[/api/ask]', err);
    return NextResponse.json(
      { error: err.message || 'Something went wrong while answering.' },
      { status: 500 }
    );
  }
}
