'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { LANGUAGES } from '@/lib/languages';
import VoiceButton from '@/components/VoiceButton';

const SUGGESTIONS = [
  'What is a PACS and what services does it provide?',
  'PMFBY के लिए आवेदन कैसे करें?',
  'How do I file a complaint against my cooperative society?',
  'सहकारी समिति का सदस्य कौन बन सकता है?',
];

export default function ChatPage() {
  const [language, setLanguage] = useState('auto');
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
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-slate-600">
          Reply language{' '}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="ml-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.native}
                {l.code !== 'auto' && l.native !== l.label ? ` (${l.label})` : ''}
              </option>
            ))}
          </select>
        </label>

        <Link
          href="/grievance"
          className="ml-auto rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          File a Grievance
        </Link>
      </div>

      {/* Conversation */}
      <div className="min-h-[55vh] rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] ${
                  m.role === 'user'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-800'
                }`}
              >
                {m.spoken && (
                  <span className="mr-1 text-xs opacity-70" title="Spoken">
                    🎤
                  </span>
                )}
                {m.content}

                {m.sources?.length > 0 && (
                  <div className="mt-2 border-t border-slate-200 pt-1.5 text-xs text-slate-500">
                    Source: {m.sources.join(', ')}
                  </div>
                )}
              </div>
            </div>
          ))}

          {busy && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-500">
                Thinking…
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {/* Suggestions, shown only before the first question */}
      {messages.length === 1 && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question in any language…"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-[15px] outline-none focus:border-emerald-500"
        />
        <VoiceButton onResult={handleVoiceResult} onError={setError} disabled={busy} />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
