import './globals.css';
import Header from '@/components/Header';
import { LanguageProvider } from '@/lib/LanguageContext';

export const metadata = {
  title: 'Sahakar Sahayak — Cooperative Help Line',
  description:
    'Multilingual assistance on cooperative law, government schemes, PMFBY crop insurance, financial literacy and grievance redressal.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[#FAF8F5] text-slate-800 antialiased">
        <LanguageProvider>
          <Header />
          <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6">
            {children}
          </main>
          <footer className="mt-auto border-t border-emerald-900/10 bg-[#F4F0E8]/50 py-6 text-center text-xs text-slate-500">
            <div className="mx-auto max-w-4xl px-4">
              🌱 <strong className="font-semibold text-slate-700">Sahakar Sahayak</strong> — Multilingual Cooperative & Agricultural Assistance.
              <p className="mt-1 opacity-80">
                Guidance only. For official binding decisions, confirm with your nearest PACS or district cooperative office.
              </p>
            </div>
          </footer>
        </LanguageProvider>
      </body>
    </html>
  );
}
