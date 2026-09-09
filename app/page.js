'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import VoiceButton from '@/components/VoiceButton';
import { useLanguage } from '@/lib/LanguageContext';

const SUGGESTIONS = [
  'What is a PACS and what services does it provide?',
  'PMFBY के लिए आवेदन कैसे करें?',
  'How do I file a complaint against my cooperative society?',
  'सहकारी समिति का सदस्य कौन बन सकता है?',
];

export default function ChatPage() {
  const { language } = useLanguage();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Namaste! Ask me anything about cooperative law, government schemes, PMFBY crop insurance, savings and loans, or filing a grievance. Write in any Indian language — I will reply in the same one.',
    },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  async function send(text) {
    const question = (text ?? input).trim();
    if (!question || busy) return;

    setError('');
    setInput('');
    const nextMessages = [...messages, { role: 'user', content: question }];
    setMessages(nextMessages);
    setBusy(true);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: question,
          language,
          // Send the recent turns so follow-ups like "and the deadline?" work.
          history: nextMessages
            .slice(-7, -1)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.answer, sources: data.sources },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function handleVoiceResult({ transcript, answer }) {
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: transcript, spoken: true },
      { role: 'assistant', content: answer, spoken: true },
    ]);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Category Quick Banner / Callout */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-[#1B5E3F] to-emerald-800 p-4 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur-xs text-xl">
            🤝
          </div>
          <div>
            <h2 className="font-bold text-base leading-tight">Multilingual Cooperative Helpline</h2>
            <p className="text-xs text-emerald-100">Ask in Hindi, English, Malayalam, Marathi, Tamil, Bengali & more</p>
          </div>
        </div>
        <Link
          href="/grievance"
          className="shrink-0 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-slate-900 hover:bg-amber-300 transition-all shadow-xs"
        >
          File a Grievance →
        </Link>
      </div>

      {/* Conversation Window */}
      <div className="min-h-[52vh] rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4">
          {messages.map((m, i) => {
            const isFirstWelcome = i === 0 && m.role === 'assistant';

            if (isFirstWelcome) {
              return (
                <div key={i} className="rounded-2xl border border-emerald-200/80 bg-[#EAF4EE]/70 p-5 shadow-xs">
                  <div className="flex items-center gap-2.5 mb-2 font-semibold text-[#1B5E3F]">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1B5E3F] text-white text-xs">
                      🏛️
                    </span>
                    <span>Sahakar Sahayak Greeting</span>
                  </div>
                  <p className="text-[15px] leading-relaxed text-slate-800 font-normal">
                    {m.content}
                  </p>
                </div>
              );
            }

            return (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-5 py-3 text-[15px] leading-relaxed shadow-xs ${
                    m.role === 'user'
                      ? 'bg-[#1B5E3F] text-white rounded-br-xs'
                      : 'bg-slate-50 border border-slate-200/80 text-slate-800 rounded-bl-xs'
                  }`}
                >
                  {m.spoken && (
                    <span className="mr-1.5 text-xs opacity-75 inline-block" title="Spoken input">
                      🎤
                    </span>
                  )}
                  {m.content}

                  {m.sources?.length > 0 && (
                    <div className="mt-2.5 border-t border-slate-200/60 pt-2 text-xs font-medium text-emerald-800">
                      📚 Source: {m.sources.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {busy && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-2.5 text-sm text-emerald-800 font-medium animate-pulse">
                <span className="h-2 w-2 rounded-full bg-emerald-600 animate-ping" />
                Retrieving assistance…
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Error Alert Card */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200/80 bg-rose-50/90 px-4 py-3 text-sm font-medium text-rose-800 shadow-xs">
          <span className="text-base">⚠️</span>
          <p className="flex-1">{error}</p>
          <button
            onClick={() => setError('')}
            className="rounded-lg bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-200 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Suggested Questions Chips (Only shown before first user prompt) */}
      {messages.length === 1 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
            Suggested Queries
          </span>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full border border-emerald-800/20 bg-emerald-50/80 px-4 py-2 text-xs font-semibold text-[#1B5E3F] hover:bg-emerald-100 hover:border-emerald-700/40 transition-all shadow-2xs text-left"
              >
                💡 {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Cohesive Floating Composer Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="sticky bottom-4 flex items-center gap-2 rounded-full border border-emerald-900/15 bg-white p-2 shadow-lg backdrop-blur-md hover:shadow-xl transition-all"
      >
        {/* Left: Circular Green Voice Mic Button */}
        <VoiceButton onResult={handleVoiceResult} onError={setError} disabled={busy} />

        {/* Center: Input Field */}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question in any language…"
          className="min-w-0 flex-1 bg-transparent px-3 py-1 text-[15px] outline-none text-slate-800 placeholder:text-slate-400 font-normal"
        />

        {/* Right: Circular Green Send Button */}
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1B5E3F] text-white hover:bg-[#154a32] disabled:opacity-40 transition-all active:scale-95 shadow-sm"
          title="Send message"
          aria-label="Send message"
        >
          <svg className="h-4 w-4 fill-current translate-x-0.5" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
