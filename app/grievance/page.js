'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';

const CATEGORIES = [
  { value: 'scheme', label: 'Scheme query' },
  { value: 'pmfby', label: 'PMFBY / crop insurance' },
  { value: 'financial', label: 'Financial' },
  { value: 'legal', label: 'Legal' },
  { value: 'other', label: 'Other' },
];

const STEPS = ['Details', 'Review', 'Submit'];
const EASE = [0.22, 1, 0.36, 1];

const FIELD =
  'w-full rounded-xl border border-slate-300 bg-white/70 px-4 py-3 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-brand-600 focus:bg-white focus:ring-4 focus:ring-brand-600/10';

export default function GrievancePage() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    category: 'scheme',
    description: '',
  });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      const res = await fetch('/api/grievance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Calculate current step for visual indicator
  // Step 1: Details (filling name/phone/cat)
  // Step 2: Review (description filled, submitting)
  // Step 3: Submit (result achieved)
  const isDescriptionFilled = form.description.trim() !== '';
  const activeStep = result ? 3 : isDescriptionFilled ? 2 : 1;

  return (
    <div className="flex flex-col gap-6">
      {/* ---- Page header ---- */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
      >
        <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          File a <span className="text-gradient">Grievance</span>
        </h1>
        <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-slate-600">
          Describe your problem or complaint. You will receive a unique reference ID to track
          progress.
        </p>
      </motion.div>

      {/* ---- Step indicator ----
          The filled connector is one absolutely-positioned bar whose width is
          animated between 0/50/100%, so progress reads as the line growing
          rather than each segment snapping on. */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, duration: 0.45, ease: EASE }}
        className="edge-gradient rounded-2xl bg-white/80 p-5 shadow-lift backdrop-blur-sm sm:p-6"
      >
        <div className="relative flex items-center justify-between">
          {/* Track + fill, inset so it starts and ends at the circle centres. */}
          <div className="absolute left-5 right-5 top-5 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-slate-200/80">
            <motion.div
              className="h-full rounded-full bg-brand-gradient"
              initial={false}
              animate={{ width: `${((activeStep - 1) / (STEPS.length - 1)) * 100}%` }}
              transition={{ duration: 0.65, ease: EASE }}
            />
          </div>

          {STEPS.map((label, i) => {
            const step = i + 1;
            const isDone = activeStep > step;
            const isCurrent = activeStep === step;
            const isReached = activeStep >= step;

            return (
              <div key={label} className="relative z-10 flex flex-col items-center gap-2">
                <motion.div
                  animate={{ scale: isCurrent ? 1.1 : 1 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                  className={`relative flex h-10 w-10 items-center justify-center rounded-full font-display text-sm font-bold transition-colors duration-300 ${
                    isReached
                      ? 'bg-brand-gradient text-white shadow-glow'
                      : 'border-2 border-slate-300 bg-white text-slate-400'
                  }`}
                >
                  {/* Halo only on the step you are actually on. */}
                  {isCurrent && (
                    <motion.span
                      aria-hidden
                      className="absolute inset-0 rounded-full bg-brand-500/30"
                      animate={{ scale: [1, 1.55], opacity: [0.5, 0] }}
                      transition={{ duration: 1.9, ease: 'easeOut', repeat: Infinity }}
                    />
                  )}
                  <AnimatePresence mode="wait" initial={false}>
                    {isDone ? (
                      <motion.svg
                        key="tick"
                        className="relative h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.4, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {/* Draw the tick on rather than popping it in. */}
                        <motion.path
                          d="M5 13l4 4L19 7"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.35, ease: 'easeOut' }}
                        />
                      </motion.svg>
                    ) : (
                      <motion.span
                        key="num"
                        className="relative"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                      >
                        {step}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>

                <span
                  className={`font-display text-[11px] font-bold uppercase tracking-[0.1em] transition-colors duration-300 ${
                    isReached ? 'text-brand-700' : 'text-slate-400'
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {result ? (
          /* ---- Success screen ------------------------------------------- */
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="edge-gradient overflow-hidden rounded-3xl bg-gradient-to-br from-brand-50 via-white to-white p-5 shadow-float sm:p-8"
          >
            <div className="flex items-center gap-4">
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.15 }}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow"
              >
                <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <motion.path
                    d="M5 13l4 4L19 7"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.45, delay: 0.35, ease: 'easeOut' }}
                  />
                </svg>
              </motion.div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-brand-950 sm:text-2xl">
                  Grievance filed successfully
                </h2>
                <p className="mt-0.5 text-xs font-medium text-brand-700">
                  An official record has been logged with the cooperative network.
                </p>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.45, ease: EASE }}
              className="mt-6 rounded-2xl border border-brand-200/70 bg-white p-5 shadow-soft"
            >
              <p className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700">
                Your reference tracking ID
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <code className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 font-mono text-xl font-extrabold tracking-wider text-brand-800 sm:text-2xl">
                  {result.referenceId}
                </code>
                <motion.button
                  whileHover={{ scale: 1.04, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    navigator.clipboard?.writeText(result.referenceId);
                    setCopied(true);
                  }}
                  className="rounded-xl border border-brand-800/20 bg-white px-4 py-2.5 text-sm font-semibold text-brand-800 shadow-soft transition-colors hover:bg-brand-50"
                >
                  {copied ? '✓ Copied' : '📋 Copy ID'}
                </motion.button>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-slate-700">
                Please write down or save this number. Current status:{' '}
                <span className="ml-1 inline-block rounded-full bg-brand-100 px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-brand-800">
                  {result.status}
                </span>
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42, duration: 0.45, ease: EASE }}
              className="mt-6 flex flex-wrap gap-3"
            >
              <Link href={`/track?ref=${result.referenceId}`}>
                <motion.span
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-5 py-3 font-display text-sm font-bold text-white shadow-glow"
                >
                  Track Status <span aria-hidden>→</span>
                </motion.span>
              </Link>
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setResult(null);
                  setForm({ name: '', phone: '', category: 'scheme', description: '' });
                  setCopied(false);
                }}
                className="rounded-xl border border-brand-800/20 bg-white px-5 py-3 font-display text-sm font-bold text-brand-800 shadow-soft transition-colors hover:bg-brand-50"
              >
                File Another
              </motion.button>
            </motion.div>
          </motion.div>
        ) : (
          /* ---- Form ------------------------------------------------------ */
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ delay: 0.1, duration: 0.45, ease: EASE }}
            onSubmit={submit}
            className="edge-gradient flex flex-col gap-5 rounded-3xl bg-white/80 p-4 shadow-lift backdrop-blur-sm sm:p-8"
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1.5 block font-display font-semibold text-slate-700">
                  Your Full Name
                </span>
                <input
                  required
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  className={FIELD}
                />
              </label>

              <label className="text-sm">
                <span className="mb-1.5 block font-display font-semibold text-slate-700">
                  Phone Number
                </span>
                <input
                  required
                  type="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  placeholder="e.g. 9876543210"
                  className={FIELD}
                />
              </label>
            </div>

            <label className="text-sm">
              <span className="mb-1.5 block font-display font-semibold text-slate-700">
                Grievance Category
              </span>
              <div className="relative">
                <select
                  value={form.category}
                  onChange={(e) => update('category', e.target.value)}
                  className={`${FIELD} cursor-pointer appearance-none pr-10 font-medium text-slate-800`}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </div>
            </label>

            <label className="text-sm">
              <span className="mb-1.5 block font-display font-semibold text-slate-700">
                Problem Description
              </span>
              <textarea
                required
                rows={5}
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                placeholder="Describe your concern clearly in English, Hindi, Malayalam, or Tamil."
                className={`${FIELD} leading-relaxed`}
              />
            </label>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.28, ease: EASE }}
                  className="overflow-hidden"
                >
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
                    ⚠️ {error}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={busy}
              whileHover={busy ? undefined : { scale: 1.015, y: -2 }}
              whileTap={busy ? undefined : { scale: 0.99 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              className="relative overflow-hidden rounded-2xl bg-brand-gradient py-4 text-center font-display text-base font-bold text-white shadow-glow disabled:opacity-60"
            >
              {/* Shimmer sweep only while the request is in flight. */}
              {busy && <span className="shimmer absolute inset-0" aria-hidden />}
              <span className="relative">
                {busy ? 'Submitting Grievance…' : 'Submit Grievance →'}
              </span>
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
