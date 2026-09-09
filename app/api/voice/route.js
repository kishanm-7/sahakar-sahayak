import { toFile } from 'openai';
import { getOpenAI, MODELS, assertApiKey } from '@/lib/openai';
import { answerFromRAG } from '@/lib/rag';
import { pcmToWav, stripWavHeader, downmixToMono, resamplePcm16 } from '@/lib/audio';
import { ALLOWED_LANGUAGES, detectLanguage } from '@/lib/languages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// POST /api/voice  --  the ESP32 & Web Microphone endpoint.
//
// IN : raw 16-bit PCM, mono, 16000 Hz, little-endian. Just bytes in the body.
// OUT: raw 16-bit PCM, mono, 16000 Hz, little-endian, as application/octet-stream.
//
// The pipeline: PCM -> WAV -> Whisper -> RAG -> TTS -> WAV -> PCM @ 16 kHz.
// ---------------------------------------------------------------------------

const DEVICE_SAMPLE_RATE = 16000;
const MAX_INPUT_BYTES = 32000 * 30; // ~30 seconds

/** Non-ASCII bytes are illegal in HTTP headers, so base64 the text first. */
function encodeHeader(text) {
  return Buffer.from(text || '', 'utf8').toString('base64');
}

export async function POST(request) {
  try {
    const arrayBuffer = await request.arrayBuffer();
    const pcmIn = Buffer.from(arrayBuffer);

    if (pcmIn.length < 3200) {
      return new Response('Audio too short', { status: 400, headers: corsHeaders() });
    }
    if (pcmIn.length > MAX_INPUT_BYTES) {
      return new Response('Audio too long', { status: 413, headers: corsHeaders() });
    }

    // Read language header from UI selection or request query parameter
    let reqLang = request.headers.get('X-Language') || new URL(request.url).searchParams.get('language') || 'auto';
    if (reqLang !== 'auto' && !ALLOWED_LANGUAGES.includes(reqLang)) {
      reqLang = 'auto';
    }

    assertApiKey();

    // 2. Give the samples a WAV header so Whisper recognises the format.
    const wavIn = pcmToWav(pcmIn, DEVICE_SAMPLE_RATE, 1, 16);

    const sttParams = {
      file: await toFile(wavIn, 'speech.wav', { type: 'audio/wav' }),
      model: MODELS.stt,
    };

    if (reqLang !== 'auto') {
      sttParams.language = reqLang;
    } else {
      // Bias Whisper auto-detection towards supported languages: English, Hindi, Malayalam, Tamil
      sttParams.prompt = "Audio in English, Hindi (हिन्दी), Malayalam (മലയാളം), or Tamil (தமிழ்).";
    }

    const transcription = await getOpenAI().audio.transcriptions.create(sttParams);

    const userText = (transcription.text || '').trim();

    if (!userText) {
      return new Response(new Uint8Array(0), {
        status: 204,
        headers: corsHeaders(),
      });
    }

    // 3. Resolve target language strictly against supported 4 languages (en, hi, ml, ta)
    const targetLangCode = reqLang !== 'auto' ? reqLang : detectLanguage(userText);

    // 4. Same brain as the web chat -- generate RAG answer in target supported language
    const { answer } = await answerFromRAG(userText, { language: targetLangCode });

    // 5. Speak the answer using OpenAI TTS
    const speech = await getOpenAI().audio.speech.create({
      model: MODELS.tts,
      voice: MODELS.ttsVoice,
      input: answer,
      response_format: 'wav',
    });

    const wavOut = Buffer.from(await speech.arrayBuffer());

    const { pcm, sampleRate, channels } = stripWavHeader(wavOut);
    const mono = downmixToMono(pcm, channels);
    const pcmOut = resamplePcm16(mono, sampleRate, DEVICE_SAMPLE_RATE);

    return new Response(pcmOut, {
      status: 200,
      headers: {
        ...corsHeaders(),
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(pcmOut.length),
        'X-Sample-Rate': String(DEVICE_SAMPLE_RATE),
        'X-Transcript': encodeHeader(userText),
        'X-Answer': encodeHeader(answer),
      },
    });
  } catch (err) {
    console.error('[/api/voice]', err);
    return new Response(`Voice pipeline error: ${err.message}`, {
      status: 500,
      headers: corsHeaders(),
    });
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function GET() {
  return new Response(
    'POST raw 16-bit PCM (mono, 16000 Hz) to this URL. You get raw PCM back.',
    { status: 200, headers: { ...corsHeaders(), 'Content-Type': 'text/plain' } }
  );
}
