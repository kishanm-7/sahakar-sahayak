'use client';

import { useState, useEffect, useCallback } from 'react';

const STATUS_LABELS = {
  submitted: 'Submitted — waiting to be picked up',
  in_review: 'Under review by the cooperative office',
  forwarded: 'Forwarded to the concerned department',
  resolved: 'Resolved',
  closed: 'Closed',
};

const STATUS_STYLES = {
  submitted: 'bg-amber-100 text-amber-800',
  in_review: 'bg-blue-100 text-blue-800',
  forwarded: 'bg-indigo-100 text-indigo-800',
  resolved: 'bg-emerald-100 text-emerald-800',
  closed: 'bg-slate-200 text-slate-700',
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
    <div>
      <h1 className="text-xl font-semibold">Track a Grievance</h1>
      <p className="mt-1 text-sm text-slate-600">
        Enter the reference number you received when you filed it.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          lookup(ref);
        }}
        className="mt-5 flex flex-wrap gap-2"
      >
        <input
          value={ref}
          onChange={(e) => setRef(e.target.value.toUpperCase())}
          placeholder="GRV-XXXXXXXX"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 font-mono tracking-wider outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={busy || !ref.trim()}
          className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? 'Checking…' : 'Check status'}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {record && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center gap-3">
            <code className="font-mono text-lg font-semibold tracking-wider">
              {record.referenceId}
            </code>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                STATUS_STYLES[record.status] || 'bg-slate-100 text-slate-700'
              }`}
            >
              {STATUS_LABELS[record.status] || record.status}
            </span>
          </div>

          <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Filed by</dt>
              <dd className="font-medium">{record.name}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Category</dt>
              <dd className="font-medium">{record.category}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Filed on</dt>
              <dd className="font-medium">
                {new Date(record.createdAt).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Last updated</dt>
              <dd className="font-medium">
                {new Date(record.updatedAt).toLocaleString()}
              </dd>
            </div>
          </dl>

          <div className="mt-4">
            <p className="text-sm text-slate-500">Complaint</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{record.description}</p>
          </div>

          {record.history?.length > 0 && (
            <div className="mt-5 border-t border-slate-200 pt-4">
              <p className="text-sm font-medium text-slate-700">History</p>
              <ol className="mt-2 flex flex-col gap-2">
                {record.history.map((h, i) => (
                  <li key={i} className="text-sm text-slate-600">
                    <span className="font-medium">
                      {STATUS_LABELS[h.status] || h.status}
                    </span>{' '}
                    — {new Date(h.at).toLocaleString()}
                    {h.note ? ` · ${h.note}` : ''}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
