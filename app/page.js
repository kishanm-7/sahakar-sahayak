'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import VoiceButton from '@/components/VoiceButton';
import TypingDots from '@/components/TypingDots';
import { useLanguage } from '@/lib/LanguageContext';

const SUGGESTIONS = [
  'What is a PACS and what services does it provide?',
  'PMFBY के लिए आवेदन कैसे करें?',
  'How do I file a complaint against my cooperative society?',
  'सहकारी समिति का सदस्य कौन बन सकता है?',
];

// Shared easing. A long tail-off reads as "settling" rather than "stopping".
const EASE = [0.22, 1, 0.36, 1];

const chipContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
};
const chipItem = {
  hidden: { opacity: 0, y: 10, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: EASE } },
};

export default function ChatPage() {
  const { language } = useLanguage();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Namaste! Ask me anything about cooperative law, government schemes, PMFBY crop insurance, savings and loans, or filing a grievance. Ask in English, Hindi, Malayalam, or Tamil.',
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
    // Extra bottom padding on phones reserves space for the fixed composer,
    // which is out of flow and would otherwise cover the last message.
    <div className="flex flex-col gap-6 pb-[4.5rem] md:pb-0">
      {/* ================= HERO ================= */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE }}
        className="relative overflow-hidden rounded-3xl bg-brand-gradient px-5 py-5 text-white shadow-float sm:px-8 sm:py-10"
      >
        {/* Ambient depth inside the hero: two slow blooms plus a botanical
            line motif. Everything here is decorative and aria-hidden. */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl animate-drift" />
          <div className="absolute -bottom-28 left-1/4 h-64 w-64 rounded-full bg-amber-300/10 blur-3xl animate-drift-slow" />
          {/* Wheat / sprout line art, bottom-right */}
          <svg
            className="absolute -bottom-6 right-0 h-36 w-36 text-white/[.09] sm:right-8 sm:h-56 sm:w-56"
            viewBox="0 0 120 120"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          >
            <path d="M60 116V44" />
            {[0, 1, 2, 3].map((i) => (
              <g key={i}>
                <path d={`M60 ${52 + i * 15}c-13-2-19-9-20-19 12-1 18 6 20 19z`} />
                <path d={`M60 ${52 + i * 15}c13-2 19-9 20-19-12-1-18 6-20 19z`} />
              </g>
            ))}
            <circle cx="60" cy="34" r="7" />
          </svg>
        </div>

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.45, ease: EASE }}
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-2.5 py-1 font-display text-[10px] font-semibold uppercase tracking-[0.12em] backdrop-blur-sm sm:px-3 sm:text-[11px] sm:tracking-[0.14em]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300 animate-breathe" />
              Ministry of Cooperation · NCCT
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.5, ease: EASE }}
              className="mt-2.5 text-[26px] font-extrabold leading-[1.12] tracking-tight sm:mt-4 sm:text-[2.6rem]"
            >
              Multilingual Cooperative
              <br className="hidden sm:block" /> Helpline
            </motion.h1>

            {/* Hidden on phones: at 375px this paragraph alone pushes the chat
                box below the fold, and the chat box is the point of the page. */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.26, duration: 0.5, ease: EASE }}
              className="mt-3 hidden max-w-md text-[15px] leading-relaxed text-emerald-50/90 sm:block"
            >
              Cooperative law, government schemes, PMFBY crop insurance and financial literacy —
              answered in your own language, by voice or text.
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.34, duration: 0.5 }}
              className="mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium text-emerald-50/80 sm:mt-4 sm:gap-x-2.5 sm:text-sm"
            >
              <span>English</span>
              <span className="text-white/30">•</span>
              <span lang="hi">हिन्दी</span>
              <span className="text-white/30">•</span>
              <span lang="ml">മലയാളം</span>
              <span className="text-white/30">•</span>
              <span lang="ta">தமிழ்</span>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5, ease: EASE }}
            /* Hidden on phones -- the bottom tab bar already has a Grievance
               tab, so this would be a second route to the same place eating
               vertical space above the fold. */
            className="hidden shrink-0 sm:block"
          >
            <Link href="/grievance">
              <motion.span
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="inline-flex items-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 font-display text-sm font-bold text-slate-900 shadow-lift"
              >
                File a Grievance
                <span aria-hidden>→</span>
              </motion.span>
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* ================= CONVERSATION ================= */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5, ease: EASE }}
        className="edge-gradient min-h-[30dvh] rounded-3xl bg-white/80 p-3.5 shadow-lift backdrop-blur-sm sm:min-h-[48vh] sm:p-6"
      >
        <div className="flex flex-col gap-4">
          {messages.map((m, i) => {
            const isFirstWelcome = i === 0 && m.role === 'assistant';

            if (isFirstWelcome) {
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="rounded-2xl border border-brand-200/70 bg-gradient-to-br from-brand-50 to-white p-5 shadow-soft"
                >
                  <div className="mb-2 flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-gradient text-sm text-white shadow-glow">
                      🏛️
                    </span>
                    <span className="font-display text-sm font-bold tracking-tight text-brand-800">
                      SahAI Sathi
                    </span>
                  </div>
                  <p className="text-[15px] leading-relaxed text-slate-700">{m.content}</p>
                </motion.div>
              );
            }

            const isUser = m.role === 'user';
            return (
              <motion.div
                key={i}
                // Slide in from the side the bubble belongs to, so the motion
                // reinforces who is speaking.
                initial={{ opacity: 0, y: 14, x: isUser ? 10 : -10 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[88%] whitespace-pre-wrap px-4 py-2.5 text-[15px] leading-relaxed sm:max-w-[85%] sm:px-5 sm:py-3 ${
                    isUser
                      ? 'rounded-2xl rounded-br-md bg-brand-gradient text-white shadow-glow'
                      : 'rounded-2xl rounded-bl-md border border-slate-200/80 bg-white text-slate-800 shadow-soft'
                  }`}
                >
                  {m.spoken && (
                    <span className="mr-1.5 inline-block text-xs opacity-75" title="Spoken input">
                      🎤
                    </span>
                  )}
                  {m.content}

                  {m.sources?.length > 0 && (
                    <div
                      className={`mt-2.5 border-t pt-2 text-xs font-medium ${
                        isUser ? 'border-white/20 text-emerald-50/90' : 'border-slate-200/70 text-brand-700'
                      }`}
                    >
                      📚 Source: {m.sources.join(', ')}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}

          {/* Thinking indicator */}
          <AnimatePresence>
            {busy && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.28, ease: EASE }}
                className="flex justify-start"
              >
                <div className="flex items-center gap-2.5 rounded-2xl rounded-bl-md border border-brand-100 bg-brand-50/80 px-4 py-3 text-sm font-medium text-brand-800 shadow-soft">
                  <TypingDots />
                  <span>Retrieving assistance…</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ---- Suggested queries ----
              These live INSIDE the conversation card on purpose. As a sibling
              below it they landed underneath the fixed composer on a phone at
              rest, since hero + card + chips together fill the viewport. Inside
              the card they scroll with the conversation and the card's own
              min-height keeps them clear of the composer. */}
          <AnimatePresence>
            {messages.length === 1 && (
              <motion.div
                variants={chipContainer}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
                className="flex flex-col gap-2.5 pt-1"
              >
                <motion.span
                  variants={chipItem}
                  className="px-1 font-display text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500"
                >
                  Suggested Queries
                </motion.span>

                {/* One swipeable, snapping row on phones -- four long
                    multilingual questions stacked onto four lines at 375px.
                    Desktop keeps the wrap. The negative margin lets chips bleed
                    to the card edge so the row reads as scrollable. */}
                <div className="no-scrollbar -mx-3.5 flex snap-x snap-mandatory gap-2 overflow-x-auto px-3.5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                  {SUGGESTIONS.map((s) => (
                    <motion.button
                      key={s}
                      variants={chipItem}
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => send(s)}
                      className="flex min-h-touch max-w-[78%] shrink-0 snap-start items-center rounded-full border border-brand-800/15 bg-white/80 px-4 py-2 text-left text-xs font-semibold text-brand-800 shadow-soft backdrop-blur-sm transition-colors hover:border-brand-600/40 hover:bg-brand-50 sm:max-w-none sm:shrink"
                    >
                      <span className="mr-1.5" aria-hidden>💡</span>
                      {s}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>
      </motion.section>

      {/* ================= ERROR ================= */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 rounded-2xl border border-rose-200/80 bg-rose-50/90 px-4 py-3 text-sm font-medium text-rose-800 shadow-soft">
              <span className="text-base">⚠️</span>
              <p className="flex-1">{error}</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setError('')}
                className="rounded-lg bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-200"
              >
                Dismiss
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= COMPOSER ================= */}
      <motion.form
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5, ease: EASE }}
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        /* Fixed on phones so the bar is always reachable.
           Sticky was tried first and does not work: on a short conversation the
           page does not scroll at all, so sticky never activates and the bar
           sits in flow on top of the tab bar. Fixed pins it unconditionally.
           This only works because PageTransition animates opacity alone -- any
           transform on an ancestor would capture this fixed element.
           inset-x-4 matches the page gutter so it lines up with the cards. */
        className="fixed inset-x-4 bottom-[var(--composer-bottom)] z-30 flex items-center gap-2 rounded-full border border-brand-900/10 glass p-1.5 shadow-float sm:p-2 md:sticky md:inset-x-auto md:bottom-4"
      >
        <VoiceButton language={language} onResult={handleVoiceResult} onError={setError} disabled={busy} />

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          /* Kept short: the old sentence truncated to nonsense in a 375px
             field, and the hero already lists the four languages.
             text-base (16px) is deliberate -- iOS Safari zooms the viewport on
             focus for anything smaller. */
          placeholder="Ask in your language…"
          className="min-w-0 flex-1 bg-transparent px-2 py-1 text-base text-slate-800 outline-none placeholder:text-slate-400"
        />

        <motion.button
          type="submit"
          disabled={busy || !input.trim()}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-white shadow-glow transition-opacity disabled:opacity-40"
          title="Send message"
          aria-label="Send message"
        >
          <svg className="h-4 w-4 translate-x-0.5 fill-current" viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </motion.button>
      </motion.form>
    </div>
  );
}
