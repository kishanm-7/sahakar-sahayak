import './globals.css';
import { Plus_Jakarta_Sans } from 'next/font/google';
import Header from '@/components/Header';
import MobileNav from '@/components/MobileNav';
import PageTransition from '@/components/PageTransition';
import { LanguageProvider } from '@/lib/LanguageContext';

// Headings only. Body copy deliberately stays on the system stack (see
// --font-body in globals.css) because this app renders Devanagari, Malayalam
// and Tamil, and no Latin webfont covers those scripts.
const display = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata = {
  title: 'SahAI Sathi — Cooperative Help Line',
  description:
    'Multilingual assistance on cooperative law, government schemes, PMFBY crop insurance, financial literacy and grievance redressal.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1B5E3F',
  // Required for env(safe-area-inset-*) to report anything but 0 on notched
  // phones -- without it iOS letterboxes the page inside the safe area and the
  // insets all read zero.
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} h-full`}>
      <body className="relative min-h-full flex flex-col bg-canvas text-slate-800 antialiased">
        {/* ---- Ambient background ------------------------------------------
            Fixed behind everything, so scrolling content floats over a soft
            field of colour rather than flat paper. Two offset blooms drift on
            long, out-of-sync loops; the grain keeps it from banding. */}
        <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden grain">
          <div className="absolute inset-0 bg-hero-mesh" />
          <div className="absolute -left-40 -top-48 h-[34rem] w-[34rem] rounded-full bg-brand-400/20 blur-3xl animate-drift" />
          <div className="absolute -right-52 top-24 h-[30rem] w-[30rem] rounded-full bg-teal-500/15 blur-3xl animate-drift-slow" />
        </div>

        <LanguageProvider>
          <Header />

          {/* pb clears the fixed bottom tab bar on phones; md:pb-10 drops that
              reserve once the tab bar is hidden and the pill nav takes over. */}
          <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-[var(--content-bottom)] pt-4 sm:px-6 sm:pt-6 md:pb-10">
            <PageTransition>{children}</PageTransition>
          </main>

          <footer className="mt-auto border-t border-brand-900/10 bg-parchment/40 pb-[var(--content-bottom)] pt-8 text-center text-xs text-slate-500 backdrop-blur-sm md:pb-8">
            <div className="mx-auto max-w-4xl px-4">
              <p className="font-display text-sm font-semibold text-slate-700">
                <span className="text-gradient">SahAI Sathi</span>
              </p>
              <p className="mt-1">Multilingual Cooperative &amp; Agricultural Assistance</p>
              <p className="mx-auto mt-3 max-w-lg leading-relaxed opacity-80">
                Guidance only. For official binding decisions, confirm with your nearest PACS or
                district cooperative office.
              </p>
            </div>
          </footer>

          <MobileNav />
        </LanguageProvider>
      </body>
    </html>
  );
}
