'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

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
  resolved: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  closed: 'bg-slate-100 text-slate-700 border-slate-300',
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

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Track a Grievance</h1>
        <p className="mt-1 text-sm text-slate-600">
          Enter the reference ID (e.g. GRV-XXXXX) to check the status of your filing.
        </p>
      </div>

      {/* Lookup Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          lookup(ref);
        }}
        className="flex flex-wrap gap-2.5 rounded-2xl border border-emerald-900/10 bg-white p-3 shadow-sm"
      >
        <input
          value={ref}
          onChange={(e) => setRef(e.target.value.toUpperCase())}
          placeholder="GRV-XXXXXXXX"
          className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-2.5 font-mono text-base tracking-wider outline-none transition-all focus:border-[#1B5E3F] focus:ring-2 focus:ring-emerald-600/20"
        />
        <button
          type="submit"
          disabled={busy || !ref.trim()}
          className="rounded-xl bg-[#1B5E3F] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#154a32] disabled:opacity-50 transition-all shadow-sm active:scale-95"
        >
          {busy ? 'Checking…' : 'Check Status'}
        </button>
      </form>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800 shadow-xs">
          ⚠️ {error}
        </div>
      )}

      {/* Result Card */}
      {record && (
        <div className="flex flex-col gap-6 rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-md">
          {/* Card Header with Reference ID & Status Badge */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Reference ID
              </span>
              <div className="font-mono text-2xl font-extrabold tracking-wider text-slate-900">
                {record.referenceId}
              </div>
            </div>
            {/* Status Pill Badge */}
            <div
              className={`rounded-full border px-4 py-1.5 text-xs font-extrabold uppercase tracking-wide shadow-2xs ${
                STATUS_STYLES[record.status] || 'bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              ● {STATUS_LABELS[record.status] || record.status}
            </div>
          </div>

          {/* Details Grid */}
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 bg-slate-50/70 p-4 rounded-xl border border-slate-200/60">
            <div>
              <dt className="text-xs font-semibold text-slate-500 uppercase">Filed by</dt>
              <dd className="font-bold text-slate-900 mt-0.5">{record.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500 uppercase">Category</dt>
              <dd className="font-bold text-slate-900 mt-0.5 capitalize">{record.category}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500 uppercase">Filed on</dt>
              <dd className="font-medium text-slate-800 mt-0.5">
                {new Date(record.createdAt).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500 uppercase">Last updated</dt>
              <dd className="font-medium text-slate-800 mt-0.5">
                {new Date(record.updatedAt).toLocaleString()}
              </dd>
            </div>
          </dl>

          {/* Complaint Description */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Grievance Description
            </span>
            <p className="mt-1.5 whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-800">
              {record.description}
            </p>
          </div>

          {/* Activity History */}
          {record.history?.length > 0 && (
            <div className="border-t border-slate-100 pt-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Status History Timeline
              </span>
              <ol className="mt-3 flex flex-col gap-2">
                {record.history.map((h, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                    <span className="mt-1 h-2 w-2 rounded-full bg-[#1B5E3F] shrink-0" />
                    <div>
                      <span className="font-bold text-slate-900">
                        {STATUS_LABELS[h.status] || h.status}
                      </span>{' '}
                      <span className="text-xs text-slate-500">
                        ({new Date(h.at).toLocaleString()})
                      </span>
                      {h.note && <p className="text-xs text-slate-600 mt-0.5">{h.note}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Navigation Action - Back to Chat / Home Button */}
          <div className="border-t border-slate-100 pt-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-[#1B5E3F] px-5 py-2.5 text-sm font-bold text-[#1B5E3F] hover:bg-emerald-50 transition-colors shadow-2xs"
            >
              ← Back to Chat
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
