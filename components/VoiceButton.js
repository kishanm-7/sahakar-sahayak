'use client';

import { useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Browser microphone button — TAP-TO-TOGGLE mode.
//
// Tap once  → starts recording.
// Tap again → stops recording early (sends whatever was captured).
// Silence   → auto-stops after SILENCE_TIMEOUT_MS of quiet after speech.
// Safety cap → always stops after MAX_RECORDING_MS regardless.
//
// Talks to /api/voice with raw 16-bit PCM (same format the ESP32 uses).
// We bypass MediaRecorder (which outputs WebM/Opus) and tap the raw Web
// Audio graph instead so the endpoint can accept bare samples.
// ---------------------------------------------------------------------------

const TARGET_RATE = 16000;
const SILENCE_THRESHOLD = 0.008; // RMS energy threshold for speech detection
const SILENCE_TIMEOUT_MS = 1200; // Auto-stop after 1.2s of trailing silence following speech
const MAX_RECORDING_MS = 10000;  // Hard safety cap: force-stop at 10 seconds

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

export default function VoiceButton({ onResult, onError, disabled, language }) {
  const [state, setState] = useState('idle'); // idle | recording | working
  const recorder = useRef(null);
  const stopRecordingRef = useRef(null);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });

      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      const chunks = [];

      const recObj = {
        stream,
        ctx,
        source,
        processor,
        mute: null,
        chunks,
        stopped: false,
        maxTimer: null,
        hasSpoken: false,
        lastSpeechTime: 0,
      };

      // 10-second hard safety cap
      recObj.maxTimer = setTimeout(() => {
        if (stopRecordingRef.current) {
          stopRecordingRef.current();
        }
      }, MAX_RECORDING_MS);

      processor.onaudioprocess = (e) => {
        if (recObj.stopped) return;
        const channelData = e.inputBuffer.getChannelData(0);
        const copy = new Float32Array(channelData);
        chunks.push(copy);

        // VAD: calculate RMS energy
        let sum = 0;
        for (let i = 0; i < copy.length; i++) {
          sum += copy[i] * copy[i];
        }
        const rms = Math.sqrt(sum / copy.length);
        const now = Date.now();

        if (rms > SILENCE_THRESHOLD) {
          recObj.hasSpoken = true;
          recObj.lastSpeechTime = now;
        } else if (recObj.hasSpoken && recObj.lastSpeechTime > 0) {
          if (now - recObj.lastSpeechTime >= SILENCE_TIMEOUT_MS) {
            // Auto stop due to 1.2s trailing silence following speech
            if (stopRecordingRef.current) {
              stopRecordingRef.current();
            }
          }
        }
      };

      // A muted gain node keeps the graph running without piping the mic
      // straight back out of the speakers.
      const mute = ctx.createGain();
      mute.gain.value = 0;
      source.connect(processor);
      processor.connect(mute);
      mute.connect(ctx.destination);
      recObj.mute = mute;

      recorder.current = recObj;
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
    if (!r || r.stopped) return;
    r.stopped = true;
    recorder.current = null;

    if (r.maxTimer) {
      clearTimeout(r.maxTimer);
    }

    // Immediately stop audio processing graph
    r.processor.onaudioprocess = null;
    try {
      r.processor.disconnect();
      r.source.disconnect();
      r.mute.disconnect();
      r.stream.getTracks().forEach((t) => t.stop());
    } catch {
      // ignore disconnect errors
    }

    setState('working');

    const inputRate = r.ctx.sampleRate; // usually 44100 or 48000
    try {
      await r.ctx.close();
    } catch {
      // ignore close errors
    }

    // Flatten every captured block into one signal.
    const total = r.chunks.reduce((n, c) => n + c.length, 0);
    if (total === 0) {
      setState('idle');
      return;
    }

    const merged = new Float32Array(total);
    let offset = 0;
    for (const c of r.chunks) {
      merged.set(c, offset);
      offset += c.length;
    }

    // Trim trailing silence off the end of the recording clip
    let lastActiveIdx = merged.length - 1;
    while (lastActiveIdx > 0 && Math.abs(merged[lastActiveIdx]) < SILENCE_THRESHOLD) {
      lastActiveIdx--;
    }

    // Keep a small 200ms padding after the last active speech sample
    const padding = Math.floor(inputRate * 0.2);
    const trimmedLength = Math.min(merged.length, lastActiveIdx + 1 + padding);
    const trimmed = merged.subarray(0, trimmedLength);

    if (trimmed.length < inputRate * 0.3) {
      setState('idle');
      onError?.('That was too short. Tap the mic button, speak, then the recording will stop automatically.');
      return;
    }

    const pcm = floatToPcm16(resampleFloat32(trimmed, inputRate, TARGET_RATE));

    try {
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Language': language || 'auto',
        },
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

  stopRecordingRef.current = stopRecording;

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

  // Single tap handler: start if idle, stop early if already recording.
  function handleClick() {
    if (state === 'idle') {
      startRecording();
    } else if (state === 'recording') {
      stopRecording();
    }
    // While 'working' the button is disabled, so no action needed.
  }

  const ariaLabel =
    state === 'recording' ? 'Listening… tap to stop' : state === 'working' ? 'Processing…' : 'Tap to speak';

  const tooltip =
    state === 'recording' ? 'Tap to stop recording' : state === 'working' ? 'Processing audio…' : 'Tap to speak';

  return (
    <button
      type="button"
      disabled={disabled || state === 'working'}
      onClick={handleClick}
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all select-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
        state === 'recording'
          ? 'bg-rose-600 text-white shadow-md ring-4 ring-rose-200'
          : state === 'working'
          ? 'bg-emerald-800 text-white opacity-80 cursor-wait'
          : 'bg-[#1B5E3F] text-white hover:bg-[#154a32] shadow-sm active:scale-95 disabled:opacity-50'
      }`}
      title={tooltip}
      aria-label={ariaLabel}
    >
      {/* Pulsing ring overlay when recording */}
      {state === 'recording' && (
        <span className="absolute inset-0 rounded-full animate-ping bg-rose-400 opacity-40" />
      )}

      {state === 'working' ? (
        /* Spinner while processing */
        <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : state === 'recording' ? (
        /* Stop square icon while recording */
        <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
        /* Microphone icon while idle */
        <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
      )}
    </button>
  );
}
