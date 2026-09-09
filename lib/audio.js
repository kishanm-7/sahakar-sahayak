// ---------------------------------------------------------------------------
// Audio helpers for the ESP32 voice path.
//
// The device speaks the simplest format there is: raw 16-bit signed PCM, mono,
// little-endian, 16000 Hz. No container, no compression. Everything in this
// file exists to convert between that and what the OpenAI APIs expect.
// ---------------------------------------------------------------------------

/**
 * Wrap raw PCM samples in a minimal 44-byte WAV (RIFF) header.
 *
 * Whisper needs a recognisable audio *file*, but the ESP32 only sends bare
 * samples. A WAV header is just 44 bytes of metadata glued to the front of
 * those samples, so we can build it by hand instead of pulling in an audio
 * library.
 *
 * Byte layout (everything little-endian):
 *    0  "RIFF"       4  fileSize - 8    8  "WAVE"
 *   12  "fmt "      16  16 (fmt size)  20  1 = uncompressed PCM
 *   22  channels    24  sampleRate     28  byteRate
 *   32  blockAlign  34  bitDepth       36  "data"      40  dataSize
 */
export function pcmToWav(buffer, sampleRate = 16000, channels = 1, bitDepth = 16) {
  const pcm = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const byteRate = (sampleRate * channels * bitDepth) / 8;
  const blockAlign = (channels * bitDepth) / 8;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4); // total size minus the first 8 bytes
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // size of this fmt chunk
  header.writeUInt16LE(1, 20); // 1 = uncompressed PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}

/**
 * Pull the raw samples back out of a WAV file, along with the format they are
 * in, so the caller knows whether it needs to resample.
 *
 * We deliberately do NOT assume the header is exactly 44 bytes. Real encoders
 * sometimes insert extra chunks (such as "LIST") before the "data" chunk, so
 * we walk the chunk list and stop at the one we actually want. Blindly
 * slicing off 44 bytes would prepend a burst of static to the audio.
 */
export function stripWavHeader(wavBuffer) {
  const buf = Buffer.isBuffer(wavBuffer) ? wavBuffer : Buffer.from(wavBuffer);

  if (buf.length < 12 || buf.toString('ascii', 0, 4) !== 'RIFF') {
    // Not a WAV at all, so assume we were handed raw PCM already.
    return { pcm: buf, sampleRate: 24000, channels: 1, bitDepth: 16 };
  }

  let sampleRate = 24000;
  let channels = 1;
  let bitDepth = 16;
  let offset = 12; // skip "RIFF" + size + "WAVE"

  while (offset + 8 <= buf.length) {
    const chunkId = buf.toString('ascii', offset, offset + 4);
    const chunkSize = buf.readUInt32LE(offset + 4);
    const body = offset + 8;

    if (chunkId === 'fmt ') {
      channels = buf.readUInt16LE(body + 2);
      sampleRate = buf.readUInt32LE(body + 4);
      bitDepth = buf.readUInt16LE(body + 14);
    } else if (chunkId === 'data') {
      const end = Math.min(body + chunkSize, buf.length);
      return { pcm: buf.subarray(body, end), sampleRate, channels, bitDepth };
    }

    // Chunks are word-aligned: an odd-sized chunk is followed by a pad byte.
    offset = body + chunkSize + (chunkSize % 2);
  }

  // Malformed file, fall back to the classic fixed header size.
  return { pcm: buf.subarray(44), sampleRate, channels, bitDepth };
}

/**
 * Mix multi-channel 16-bit PCM down to mono by averaging the channels.
 * OpenAI TTS returns mono today; this keeps us safe if that ever changes.
 */
export function downmixToMono(pcm, channels) {
  if (channels <= 1) return pcm;
  const frames = Math.floor(pcm.length / (2 * channels));
  const out = Buffer.alloc(frames * 2);
  for (let i = 0; i < frames; i++) {
    let sum = 0;
    for (let c = 0; c < channels; c++) {
      sum += pcm.readInt16LE((i * channels + c) * 2);
    }
    out.writeInt16LE(Math.round(sum / channels), i * 2);
  }
  return out;
}

/**
 * Resample 16-bit mono PCM using linear interpolation.
 *
 * OpenAI TTS hands back 24000 Hz; the ESP32 I2S output is configured for
 * 16000 Hz. The ratio is 24000 / 16000 = 1.5, so each output sample lands
 * between two input samples and we blend the pair proportionally.
 *
 * Linear interpolation is the crudest resampler there is -- a proper one would
 * low-pass filter first to avoid aliasing. For speech coming out of a small
 * 3W speaker the difference is inaudible, and this keeps the dependency count
 * at zero, which was the whole point.
 */
export function resamplePcm16(pcm, fromRate, toRate) {
  if (fromRate === toRate) return pcm;

  const inSamples = Math.floor(pcm.length / 2);
  const outSamples = Math.floor((inSamples * toRate) / fromRate);
  const out = Buffer.alloc(outSamples * 2);
  const ratio = fromRate / toRate;

  for (let i = 0; i < outSamples; i++) {
    const pos = i * ratio; // fractional position in the input signal
    const idx = Math.floor(pos);
    const frac = pos - idx;

    const a = pcm.readInt16LE(idx * 2);
    const b = idx + 1 < inSamples ? pcm.readInt16LE((idx + 1) * 2) : a;

    let value = Math.round(a + (b - a) * frac);
    // Clamp: rounding can push a value one step past the 16-bit range.
    if (value > 32767) value = 32767;
    if (value < -32768) value = -32768;

    out.writeInt16LE(value, i * 2);
  }

  return out;
}
