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

  // Calculate current step for visual indicator
  // Step 1: Details (filling name/phone/cat)
  // Step 2: Review (description filled, submitting)
  // Step 3: Submit (result achieved)
  const isDetailsFilled = form.name.trim() !== '' && form.phone.trim() !== '';
  const isDescriptionFilled = form.description.trim() !== '';
  const activeStep = result ? 3 : isDescriptionFilled ? 2 : 1;

  return (
    <div className="flex flex-col gap-6">
      {/* Title & Description Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">File a Grievance</h1>
        <p className="mt-1 text-sm text-slate-600">
          Describe your problem or complaint. You will receive a unique reference ID to track progress.
        </p>
      </div>

      {/* Multi-step Visual Progress Indicator */}
      <div className="rounded-2xl border border-emerald-900/10 bg-white p-5 shadow-sm">
        <div className="relative flex items-center justify-between">
          {/* Connecting Line */}
          <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-slate-100 -z-0">
            <div
              className="h-full bg-[#1B5E3F] transition-all duration-300"
              style={{
                width: activeStep === 1 ? '0%' : activeStep === 2 ? '50%' : '100%',
              }}
            />
          </div>

          {/* Step 1 Circle & Label */}
          <div className="relative z-10 flex flex-col items-center gap-1.5 bg-white px-2">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full font-bold text-sm transition-all ${
                activeStep >= 1
                  ? 'bg-[#1B5E3F] text-white ring-4 ring-emerald-100 shadow-sm'
                  : 'border-2 border-slate-300 bg-white text-slate-500'
              }`}
            >
              1
            </div>
            <span
              className={`text-xs font-semibold ${
                activeStep >= 1 ? 'text-[#1B5E3F]' : 'text-slate-500'
              }`}
            >
              Details
            </span>
          </div>

          {/* Step 2 Circle & Label */}
          <div className="relative z-10 flex flex-col items-center gap-1.5 bg-white px-2">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full font-bold text-sm transition-all ${
                activeStep >= 2
                  ? 'bg-[#1B5E3F] text-white ring-4 ring-emerald-100 shadow-sm'
                  : 'border-2 border-slate-300 bg-white text-slate-500'
              }`}
            >
              2
            </div>
            <span
              className={`text-xs font-semibold ${
                activeStep >= 2 ? 'text-[#1B5E3F]' : 'text-slate-500'
              }`}
            >
              Review
            </span>
          </div>

          {/* Step 3 Circle & Label */}
          <div className="relative z-10 flex flex-col items-center gap-1.5 bg-white px-2">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full font-bold text-sm transition-all ${
                activeStep === 3
                  ? 'bg-[#1B5E3F] text-white ring-4 ring-emerald-100 shadow-sm'
                  : 'border-2 border-slate-300 bg-white text-slate-500'
              }`}
            >
              3
            </div>
            <span
              className={`text-xs font-semibold ${
                activeStep === 3 ? 'text-[#1B5E3F]' : 'text-slate-500'
              }`}
            >
              Submit
            </span>
          </div>
        </div>
      </div>

      {/* ---- Success screen -------------------------------------------------- */}
      {result ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-6 shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1B5E3F] text-white text-2xl">
              ✓
            </div>
            <div>
              <h2 className="text-xl font-bold text-emerald-950">
                Your grievance has been successfully filed
              </h2>
              <p className="text-xs font-medium text-emerald-800">
                A official record has been logged with the cooperative network.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-emerald-300/80 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Your Reference Tracking ID
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <code className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 font-mono text-2xl font-extrabold tracking-wider text-[#1B5E3F]">
                {result.referenceId}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(result.referenceId);
                  setCopied(true);
                }}
                className="rounded-xl border border-emerald-800/30 bg-white px-4 py-2 text-sm font-semibold text-[#1B5E3F] hover:bg-emerald-100 transition-colors"
              >
                {copied ? '✓ Copied' : '📋 Copy ID'}
              </button>
            </div>
          </div>

          <p className="mt-4 text-sm text-emerald-900 leading-relaxed">
            Please write down or save this number. Current status:{' '}
            <span className="inline-block rounded-full bg-emerald-200/80 px-3 py-0.5 text-xs font-bold text-emerald-900 uppercase">
              {result.status}
            </span>
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/track?ref=${result.referenceId}`}
              className="rounded-xl bg-[#1B5E3F] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#154a32] shadow-sm transition-all"
            >
              Track Status →
            </Link>
            <button
              onClick={() => {
                setResult(null);
                setForm({ name: '', phone: '', category: 'scheme', description: '' });
                setCopied(false);
              }}
              className="rounded-xl border border-emerald-800/30 bg-white px-5 py-2.5 text-sm font-semibold text-[#1B5E3F] hover:bg-emerald-100 transition-colors"
            >
              File Another Grievance
            </button>
          </div>
        </div>
      ) : (
        /* ---- Form ------------------------------------------------------------ */
        <form
          onSubmit={submit}
          className="flex flex-col gap-5 rounded-2xl border border-emerald-900/10 bg-white p-6 shadow-sm"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1.5 block font-semibold text-slate-700">Your Full Name</span>
              <input
                required
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="e.g. Ramesh Patel"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none transition-all focus:border-[#1B5E3F] focus:ring-2 focus:ring-emerald-600/20"
              />
            </label>

            <label className="text-sm">
              <span className="mb-1.5 block font-semibold text-slate-700">Phone Number</span>
              <input
                required
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 outline-none transition-all focus:border-[#1B5E3F] focus:ring-2 focus:ring-emerald-600/20"
              />
            </label>
          </div>

          <label className="text-sm">
            <span className="mb-1.5 block font-semibold text-slate-700">Grievance Category</span>
            <div className="relative">
              <select
                value={form.category}
                onChange={(e) => update('category', e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-2.5 outline-none transition-all focus:border-[#1B5E3F] focus:ring-2 focus:ring-emerald-600/20 cursor-pointer pr-10 text-slate-800 font-medium"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </label>

          <label className="text-sm">
            <span className="mb-1.5 block font-semibold text-slate-700">
              Problem Description
            </span>
            <textarea
              required
              rows={5}
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Describe your concern clearly in any language (English, Hindi, Malayalam, etc.)."
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition-all focus:border-[#1B5E3F] focus:ring-2 focus:ring-emerald-600/20 leading-relaxed"
            />
          </label>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-[#1B5E3F] py-3.5 text-center text-base font-bold text-white shadow-md hover:bg-[#154a32] active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {busy ? 'Submitting Grievance…' : 'Submit Grievance →'}
          </button>
        </form>
      )}
    </div>
  );
}
