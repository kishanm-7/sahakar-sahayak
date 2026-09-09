import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'Sahakar Sahayak — Cooperative Help Line',
  description:
    'Multilingual assistance on cooperative law, government schemes, PMFBY crop insurance, financial literacy and grievance redressal.',
};

// width=device-width is what makes the same pages work on a phone browser --
// no separate mobile app needed, which was one of the requirements.
export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
            <Link href="/" className="font-semibold text-slate-900">
              सहकार सहायक{' '}
              <span className="font-normal text-slate-500">· Sahakar Sahayak</span>
            </Link>
            <nav className="ml-auto flex gap-4 text-sm">
              <Link href="/" className="text-slate-600 hover:text-emerald-700">
                Chat
              </Link>
              <Link href="/grievance" className="text-slate-600 hover:text-emerald-700">
                File a Grievance
              </Link>
              <Link href="/track" className="text-slate-600 hover:text-emerald-700">
                Track
              </Link>
            </nav>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>

        <footer className="mx-auto max-w-3xl px-4 pb-8 text-xs text-slate-400">
          Guidance only. For binding decisions, confirm with your nearest PACS or
          district cooperative office.
        </footer>
      </body>
    </html>
  );
}
