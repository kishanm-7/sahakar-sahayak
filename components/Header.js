'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { LANGUAGES } from '@/lib/languages';
import { useLanguage } from '@/lib/LanguageContext';

const NAV_LINKS = [
  { href: '/', label: 'Chat' },
  { href: '/grievance', label: 'File a Grievance' },
  { href: '/track', label: 'Track Status' },
];

// On phones this bar carries only identity and the language picker -- routing
// lives in the bottom tab bar (components/MobileNav.js), which is easier to
// reach with a thumb than anything pinned to the top of the screen.
export default function Header() {
  const { language, setLanguage } = useLanguage();
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-50 border-b border-brand-900/[.07] glass"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 sm:py-3">
        {/* ---- Logo & wordmark ---- */}
        <Link href="/" className="group flex min-h-touch shrink-0 items-center gap-2.5">
          <motion.div
            whileHover={{ scale: 1.06, rotate: -3 }}
            whileTap={{ scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden shadow-glow"
          >
            <Image
              src="/sahai-sathi-logo.png"
              alt="SahAI Sathi logo"
              width={40}
              height={40}
              className="h-10 w-10 object-cover"
              priority
            />
            <span className="pointer-events-none absolute inset-0 rounded-xl shadow-inset" />
          </motion.div>

          <div className="flex min-w-0 flex-col leading-none">
            <span
              className="truncate text-[15px] font-bold leading-tight tracking-tight text-brand-800 transition-colors group-hover:text-brand-600 sm:text-[17px]"
            >
              SahAI Sathi
            </span>
            <span className="mt-0.5 font-display text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-[10px]">
              Multilingual Cooperative Assistant
            </span>
          </div>
        </Link>

        {/* ---- Desktop pill nav (md and up) ---- */}
        <nav className="hidden items-center gap-1 rounded-full border border-brand-900/[.06] bg-white/50 p-1 text-sm font-medium shadow-soft md:flex">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative rounded-full px-4 py-1.5 font-display transition-colors duration-200 ${
                  isActive ? 'text-white' : 'text-slate-600 hover:text-brand-700'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full bg-brand-gradient shadow-glow"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative z-10 whitespace-nowrap">{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* ---- Language picker ----
            The select is stretched to fill the pill via absolute inset so the
            whole control is tappable, not just the
            text. */}
        <div className="relative flex min-h-touch shrink-0 items-center rounded-full border border-brand-800/15 bg-white/80 pl-3 pr-8 shadow-soft transition-all focus-within:border-brand-600 hover:border-brand-600/50 hover:shadow-glow">
          <span className="pointer-events-none mr-1.5 text-brand-700">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </span>

          <span className="pointer-events-none whitespace-nowrap text-xs font-semibold text-slate-800">
            {LANGUAGES.find((l) => l.code === language)?.native ?? 'Auto'}
          </span>

          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Select Language"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.native}
                {l.code !== 'auto' && l.native !== l.label ? ` (${l.label})` : ''}
              </option>
            ))}
          </select>

          <span className="pointer-events-none absolute right-2.5 text-slate-400">
            <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </div>
      </div>
    </header>
  );
}
