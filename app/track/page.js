'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';

const STATUS_LABELS = {
  submitted: 'Submitted — Waiting Review',
  in_review: 'Under Review by Office',
  forwarded: 'Forwarded to Department',
  resolved: 'Resolved',
  closed: 'Closed',
};

const STATUS_STYLES = {
  submitted: 'bg-blue-50 text-blue-700 border-blue-200',
  in_review: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  forwarded: 'bg-amber-50 text-amber-800 border-amber-200',
  resolved: 'bg-brand-50 text-brand-800 border-brand-200',
  closed: 'bg-slate-100 text-slate-700 border-slate-300',
};

const EASE = [0.22, 1, 0.36, 1];

// Reveal the result card's sections one after another rather than all at once.
const reveal = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.12 } },
};
const revealItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE } },
};

export default function TrackPage() {
  const [ref, setRef] = useState('');
  const [record, setRecord] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const lookup = useCallback(async (id) => {
    const value = (id || '').trim();
    if (!value) return;

    setBusy(true);
    setError('');
    setRecord(null);

    try {
      const res = await fetch(`/api/grievance?ref=${encodeURIComponent(value)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lookup failed');
      setRecord(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }, []);

  // Reading the query string straight off window keeps this page out of
  // Next.js's Suspense requirement for useSearchParams -- one less thing to
  // trip over at build time.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('ref');
    if (fromUrl) {
      setRef(fromUrl);
      lookup(fromUrl);
    }
  }, [lookup]);

  const isPending = record?.status === 'submitted';

  return (
    <div className="flex flex-col gap-6">
      {/* ---- Header ---- */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
      >
        <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Track a <span className="text-gradient">Grievance</span>
        </h1>
        <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-slate-600">
          Enter the reference ID (e.g. GRV-XXXXX) to check the status of your filing.
        </p>
      </motion.div>

      {/* ---- Lookup form ---- */}
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06, duration: 0.45, ease: EASE }}
        onSubmit={(e) => {
          e.preventDefault();
          lookup(ref);
        }}
        className="edge-gradient flex flex-col gap-2.5 rounded-2xl bg-white/80 p-3 shadow-lift backdrop-blur-sm sm:flex-row"
      >
        <input
          value={ref}
          onChange={(e) => setRef(e.target.value.toUpperCase())}
          placeholder="GRV-XXXXXXXX"
          className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white/70 px-4 py-3 font-mono text-base tracking-wider outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-brand-600 focus:bg-white focus:ring-4 focus:ring-brand-600/10"
        />
        <motion.button
          type="submit"
          disabled={busy || !ref.trim()}
          whileHover={busy ? undefined : { scale: 1.04, y: -2 }}
          whileTap={busy ? undefined : { scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="relative min-h-touch w-full shrink-0 overflow-hidden rounded-xl bg-brand-gradient px-6 py-3 font-display text-sm font-bold text-white shadow-glow disabled:opacity-50 sm:w-auto"
        >
          {busy && <span className="shimmer absolute inset-0" aria-hidden />}
          <span className="relative">{busy ? 'Checking…' : 'Check Status'}</span>
        </motion.button>
      </motion.form>

      {/* ---- Error ---- */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800 shadow-soft">
              ⚠️ {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Loading skeleton ---- */}
      <AnimatePresence>
        {busy && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="edge-gradient rounded-3xl bg-white/70 p-6 shadow-lift backdrop-blur-sm"
          >
            <div className="flex flex-col gap-4">
              <div className="shimmer h-8 w-52 rounded-lg bg-slate-100" />
              <div className="shimmer h-24 rounded-xl bg-slate-100" />
              <div className="shimmer h-16 rounded-xl bg-slate-100" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Result ---- */}
      <AnimatePresence>
        {record && !busy && (
          <motion.div
            variants={reveal}
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: EASE, staggerChildren: 0.08, delayChildren: 0.12 } }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="edge-gradient flex flex-col gap-5 rounded-3xl bg-white/85 p-4 shadow-float backdrop-blur-sm sm:gap-6 sm:p-8"
          >
            {/* Reference + status badge */}
            <motion.div
              variants={revealItem}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5"
            >
              <div>
                <span className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Reference ID
                </span>
                <div className="font-mono text-xl font-extrabold tracking-wider text-slate-900 sm:text-3xl">
                  {record.referenceId}
                </div>
              </div>

              {/* Pending filings get a live pulse so it is obvious the case is
                  still open; settled statuses stay calm. */}
              <div className="relative">
                {isPending && (
                  <motion.span
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-blue-400/40 blur-md"
                    animate={{ opacity: [0.35, 0.9, 0.35], scale: [0.96, 1.08, 0.96] }}
                    transition={{ duration: 2.2, ease: 'easeInOut', repeat: Infinity }}
                  />
                )}
                <div
                  className={`relative rounded-full border px-4 py-2 font-display text-[11px] font-extrabold uppercase tracking-wide shadow-soft ${
                    STATUS_STYLES[record.status] || 'border-slate-300 bg-slate-100 text-slate-700'
                  }`}
                >
                  <span className={`mr-1.5 inline-block ${isPending ? 'animate-breathe' : ''}`}>●</span>
                  {STATUS_LABELS[record.status] || record.status}
                </div>
              </div>
            </motion.div>

            {/* Details */}
            <motion.dl
              variants={revealItem}
              className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200/60 bg-slate-50/60 p-5 text-sm sm:grid-cols-2"
            >
              <div>
                <dt className="font-display text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  Filed by
                </dt>
                <dd className="mt-1 font-bold text-slate-900">{record.name}</dd>
              </div>
              <div>
                <dt className="font-display text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  Category
                </dt>
                <dd className="mt-1 font-bold capitalize text-slate-900">{record.category}</dd>
              </div>
              <div>
                <dt className="font-display text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  Filed on
                </dt>
                <dd className="mt-1 font-medium text-slate-800">
                  {new Date(record.createdAt).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="font-display text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  Last updated
                </dt>
                <dd className="mt-1 font-medium text-slate-800">
                  {new Date(record.updatedAt).toLocaleString()}
                </dd>
              </div>
            </motion.dl>

            {/* Description */}
            <motion.div variants={revealItem}>
              <span className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Grievance Description
              </span>
              <p className="mt-2 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-800 shadow-soft">
                {record.description}
              </p>
            </motion.div>

            {/* Timeline */}
            {record.history?.length > 0 && (
              <motion.div variants={revealItem} className="border-t border-slate-100 pt-5">
                <span className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Status History
                </span>
                <ol className="relative mt-4 flex flex-col gap-4 pl-5">
                  {/* Vertical rail that draws itself downward on reveal. */}
                  <motion.span
                    aria-hidden
                    className="absolute left-[3px] top-1 w-px origin-top bg-gradient-to-b from-brand-500 to-brand-200"
                    initial={{ scaleY: 0, height: '100%' }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
                  />
                  {record.history.map((h, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.1, duration: 0.35, ease: EASE }}
                      className="relative text-sm text-slate-700"
                    >
                      <span className="absolute -left-5 top-1.5 h-[7px] w-[7px] rounded-full bg-brand-600 ring-4 ring-white" />
                      <span className="font-bold text-slate-900">
                        {STATUS_LABELS[h.status] || h.status}
                      </span>{' '}
                      <span className="text-xs text-slate-500">
                        ({new Date(h.at).toLocaleString()})
                      </span>
                      {h.note && <p className="mt-0.5 text-xs text-slate-600">{h.note}</p>}
                    </motion.li>
                  ))}
                </ol>
              </motion.div>
            )}

            {/* Back link */}
            <motion.div variants={revealItem} className="border-t border-slate-100 pt-5">
              <Link href="/">
                <motion.span
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 rounded-xl border border-brand-800/25 bg-white px-5 py-3 font-display text-sm font-bold text-brand-800 shadow-soft transition-colors hover:bg-brand-50"
                >
                  <span aria-hidden>←</span> Back to Chat
                </motion.span>
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
