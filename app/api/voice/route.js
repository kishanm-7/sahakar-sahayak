import { toFile } from 'openai';
import { getOpenAI, MODELS, assertApiKey } from '@/lib/openai';
import { answerFromRAG } from '@/lib/rag';
import { pcmToWav, stripWavHeader, downmixToMono, resamplePcm16 } from '@/lib/audio';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// POST /api/voice  --  the ESP32 endpoint.
//
// IN : raw 16-bit PCM, mono, 16000 Hz, little-endian. Just bytes in the body.
//      Not multipart. Not JSON. Not a file upload. The device has ~500 KB of
//      usable RAM and a minimal HTTP client; anything fancier is out of reach.
//
// OUT: raw 16-bit PCM, mono, 16000 Hz, little-endian, as application/octet-stream.
//      No WAV header, because the firmware pipes the body straight into the
//      I2S buffer. A 44-byte header would come out as an audible click and
//      then shift every sample by two bytes, turning the speech into noise.
//
// The pipeline: PCM -> WAV -> Whisper -> RAG -> TTS -> WAV -> PCM @ 16 kHz.
// ---------------------------------------------------------------------------

const DEVICE_SAMPLE_RATE = 16000;

// The device is blocked waiting on this response, so refuse anything that
// would take forever. 16 kHz * 2 bytes = 32 KB per second of audio.
const MAX_INPUT_BYTES = 32000 * 30; // ~30 seconds

/** Non-ASCII bytes are illegal in HTTP headers, so base64 the text first. */
function encodeHeader(text) {
  return Buffer.from(text || '', 'utf8').toString('base64');
}

export async function POST(request) {
  try {
    // 1. Read the raw bytes. arrayBuffer() gives us the body untouched --
    //    no parsing, no multipart handling, nothing for the ESP32 to get wrong.
    const arrayBuffer = await request.arrayBuffer();
    const pcmIn = Buffer.from(arrayBuffer);

    // Check the cheap things first, before anything that can throw, so a
    // malformed request comes back as a clear 4xx the firmware can branch on.
    if (pcmIn.length < 3200) {
      // Less than 0.1s of audio: the button was tapped, not held.
      return new Response('Audio too short', { status: 400, headers: corsHeaders() });
    }
    if (pcmIn.length > MAX_INPUT_BYTES) {
      return new Response('Audio too long', { status: 413, headers: corsHeaders() });
    }

    // Read language header from UI selection or request
    const reqLang = request.headers.get('X-Language') || new URL(request.url).searchParams.get('language') || 'auto';

    assertApiKey();

    // 2. Give the samples a WAV header so Whisper recognises the format.
    const wavIn = pcmToWav(pcmIn, DEVICE_SAMPLE_RATE, 1, 16);

    const sttParams = {
      file: await toFile(wavIn, 'speech.wav', { type: 'audio/wav' }),
      model: MODELS.stt,
    };

    if (reqLang && reqLang !== 'auto') {
      sttParams.language = reqLang;
    } else {
      // Bias auto-detection towards supported languages: English, Hindi, Malayalam, Tamil
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

    // 3. Same brain as the web chat -- one code path, so a fix in the RAG
    //    prompt improves both surfaces at once. Target language is passed
    //    from the UI selection or auto-detected.
    const { answer } = await answerFromRAG(userText, { language: reqLang });

    // 4. Speak the answer. We ask for WAV so we get uncompressed samples the
    //    ESP32 can play without a decoder. (This model also supports a raw
    //    "pcm" response_format at 24 kHz -- switching to that would skip the
    //    header parsing below, but we would still have to resample.)
    const speech = await getOpenAI().audio.speech.create({
      model: MODELS.tts,
      voice: MODELS.ttsVoice,
      input: answer,
      response_format: 'wav',
    });

    const wavOut = Buffer.from(await speech.arrayBuffer());

    // 5. Strip the header, force mono, and resample down to the device rate.
    //    OpenAI TTS returns 24000 Hz; the I2S output is running at 16000 Hz.
    //    Playing 24 kHz samples through a 16 kHz clock makes the voice sound
    //    slow and deep, so this step is not optional.
    const { pcm, sampleRate, channels } = stripWavHeader(wavOut);
    const mono = downmixToMono(pcm, channels);
    const pcmOut = resamplePcm16(mono, sampleRate, DEVICE_SAMPLE_RATE);

    return new Response(pcmOut, {
      status: 200,
      headers: {
        ...corsHeaders(),
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(pcmOut.length),
        // Extra info for the browser voice button and for debugging. The ESP32
        // ignores headers entirely, so this costs the device nothing.
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

// Wide-open CORS on purpose: a microcontroller HTTP client cannot negotiate
// auth headers or preflights. Safe enough here because this only ever listens
// on the local network during the demo -- do not expose it to the internet
// as-is.
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

// A plain GET is handy for checking from the ESP32 that the server is up.
export async function GET() {
  return new Response(
    'POST raw 16-bit PCM (mono, 16000 Hz) to this URL. You get raw PCM back.',
    { status: 200, headers: { ...corsHeaders(), 'Content-Type': 'text/plain' } }
  );
}
