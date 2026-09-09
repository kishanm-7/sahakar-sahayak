'use client';

import { useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Browser microphone button.
//
// This talks to the exact same /api/voice endpoint the ESP32 uses, in the
// exact same format: raw 16-bit PCM at 16000 Hz up, raw PCM back down. That is
// deliberate -- it means you can demo and debug the hardware audio path with
// nothing but a laptop, and any bug you fix here is fixed for the device too.
//
// Note we do NOT use MediaRecorder: it produces WebM/Opus, and the endpoint
// expects bare samples. So we tap the raw audio graph instead.
// ---------------------------------------------------------------------------

const TARGET_RATE = 16000;

/** Same linear interpolation as lib/audio.js, but on the browser side. */
function resampleFloat32(input, fromRate, toRate) {
  if (fromRate === toRate) return input;
  const outLength = Math.floor((input.length * toRate) / fromRate);
  const output = new Float32Array(outLength);
  const ratio = fromRate / toRate;
  for (let i = 0; i < outLength; i++) {
    const pos = i * ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    const a = input[idx];
    const b = idx + 1 < input.length ? input[idx + 1] : a;
    output[i] = a + (b - a) * frac;
  }
  return output;
}

/** Web Audio works in floats from -1 to 1; PCM16 wants whole numbers. */
function floatToPcm16(float32) {
  const out = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

function decodeHeader(value) {
  if (!value) return '';
  try {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return '';
  }
}

export default function VoiceButton({ onResult, onError, disabled }) {
  const [state, setState] = useState('idle'); // idle | recording | working
  const recorder = useRef(null);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });

      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      const chunks = [];

      processor.onaudioprocess = (e) => {
        // The buffer is reused between callbacks, so copy before storing.
        chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };

      // A muted gain node keeps the graph running without piping the mic
      // straight back out of the speakers.
      const mute = ctx.createGain();
      mute.gain.value = 0;
      source.connect(processor);
      processor.connect(mute);
      mute.connect(ctx.destination);

      recorder.current = { stream, ctx, source, processor, mute, chunks };
      setState('recording');
    } catch (err) {
      onError?.(
        'Could not open the microphone. On a phone, the browser only allows this over https or on localhost.'
      );
      console.error(err);
    }
  }

  async function stopRecording() {
    const r = recorder.current;
    if (!r) return;
    recorder.current = null;
    setState('working');

    r.processor.disconnect();
    r.source.disconnect();
    r.mute.disconnect();
    r.stream.getTracks().forEach((t) => t.stop());

    const inputRate = r.ctx.sampleRate; // usually 44100 or 48000
    await r.ctx.close();

    // Flatten every captured block into one signal.
    const total = r.chunks.reduce((n, c) => n + c.length, 0);
    const merged = new Float32Array(total);
    let offset = 0;
    for (const c of r.chunks) {
      merged.set(c, offset);
      offset += c.length;
    }

    if (total < inputRate * 0.3) {
      setState('idle');
      onError?.('That was too short. Hold the button while you speak.');
      return;
    }

    const pcm = floatToPcm16(resampleFloat32(merged, inputRate, TARGET_RATE));

    try {
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: pcm.buffer,
      });

      if (res.status === 204) {
        setState('idle');
        onError?.('Nothing was heard in that recording. Please try again.');
        return;
      }
      if (!res.ok) throw new Error(await res.text());

      const transcript = decodeHeader(res.headers.get('X-Transcript'));
      const answer = decodeHeader(res.headers.get('X-Answer'));
      const audio = await res.arrayBuffer();

      onResult?.({ transcript, answer });
      await playPcm(audio, Number(res.headers.get('X-Sample-Rate')) || TARGET_RATE);
    } catch (err) {
      onError?.(err.message || 'The voice request failed.');
      console.error(err);
    } finally {
      setState('idle');
    }
  }

  /** The reply is bare samples, so we rebuild an AudioBuffer around it. */
  async function playPcm(arrayBuffer, sampleRate) {
    const pcm = new Int16Array(arrayBuffer);
    if (!pcm.length) return;

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const buffer = ctx.createBuffer(1, pcm.length, sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) channel[i] = pcm[i] / 32768;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();

    await new Promise((resolve) => {
      source.onended = resolve;
    });
    await ctx.close();
  }

  const label =
    state === 'recording' ? 'Release to send' : state === 'working' ? 'Listening…' : '🎤 Hold to speak';

  return (
    <button
      type="button"
      disabled={disabled || state === 'working'}
      // Pointer events cover mouse and touch with one set of handlers.
      onPointerDown={state === 'idle' ? startRecording : undefined}
      onPointerUp={state === 'recording' ? stopRecording : undefined}
      onPointerLeave={state === 'recording' ? stopRecording : undefined}
      className={`shrink-0 rounded-lg border px-3 py-2 text-sm font-medium transition select-none ${
        state === 'recording'
          ? 'border-red-300 bg-red-100 text-red-700'
          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-50'
      }`}
      title="Hold the button, speak, then let go"
    >
      {label}
    </button>
  );
}
