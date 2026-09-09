'use client';

import { useState } from 'react';
import Link from 'next/link';

const CATEGORIES = [
  { value: 'scheme', label: 'Scheme query' },
  { value: 'pmfby', label: 'PMFBY / crop insurance' },
  { value: 'financial', label: 'Financial' },
  { value: 'legal', label: 'Legal' },
  { value: 'other', label: 'Other' },
];

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

  // ---- Success screen -----------------------------------------------------
  if (result) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
        <h1 className="text-xl font-semibold text-emerald-900">
          Your grievance has been filed
        </h1>

        <p className="mt-4 text-sm font-medium text-emerald-900">
          Save this number — you will need it to check your status:
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <code className="rounded-lg border border-emerald-300 bg-white px-4 py-3 text-2xl font-bold tracking-wider text-emerald-800">
            {result.referenceId}
          </code>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(result.referenceId);
              setCopied(true);
            }}
            className="rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm text-emerald-800 hover:bg-emerald-100"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <p className="mt-4 text-sm text-emerald-900">
          Write it down or take a photo of this screen. Status:{' '}
          <strong>{result.status}</strong>
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/track?ref=${result.referenceId}`}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Track this grievance
          </Link>
          <button
            onClick={() => {
              setResult(null);
              setForm({ name: '', phone: '', category: 'scheme', description: '' });
              setCopied(false);
            }}
            className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm text-emerald-800 hover:bg-emerald-100"
          >
            File another
          </button>
        </div>
      </div>
    );
  }

  // ---- Form ---------------------------------------------------------------
  return (
    <div>
      <h1 className="text-xl font-semibold">File a Grievance</h1>
      <p className="mt-1 text-sm text-slate-600">
        Describe your problem. You will get a reference number to track it with.
      </p>

      <form
        onSubmit={submit}
        className="mt-5 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5"
      >
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Your name</span>
          <input
            required
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Phone number</span>
          <input
            required
            type="tel"
            inputMode="tel"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Category</span>
          <select
            value={form.category}
            onChange={(e) => update('category', e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-emerald-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">
            What is the problem?
          </span>
          <textarea
            required
            rows={6}
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder="Write in any language."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500"
          />
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="self-start rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? 'Submitting…' : 'Submit grievance'}
        </button>
      </form>
    </div>
  );
}
