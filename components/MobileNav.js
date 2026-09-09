'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

// ---------------------------------------------------------------------------
// Phone-only bottom navigation.
//
// This is a separate component from the desktop pill nav rather than a
// restyled version of it: thumbs reach the bottom of a phone far more easily
// than the top, and a tab bar communicates "three places" better than a
// hamburger that hides them behind a tap.
//
// Hidden at md and up, where Header's pill nav takes over.
// ---------------------------------------------------------------------------

const ICONS = {
  chat: (
    <>
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.9 9.9 0 0 1-2.8-.4L3 21l1.9-5.1A8.4 8.4 0 0 1 3.6 11.5 8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4z" />
    </>
  ),
  grievance: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 13h6M9 17h4" />
    </>
  ),
  track: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
      <path d="M11 8v3l2 1.5" />
    </>
  ),
};

const LINKS = [
  { href: '/', label: 'Chat', icon: 'chat' },
  { href: '/grievance', label: 'Grievance', icon: 'grievance' },
  { href: '/track', label: 'Track', icon: 'track' },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-brand-900/10 glass md:hidden"
      // Lifts the bar clear of the iPhone home indicator. Falls back to 0 on
      // devices without an inset.
      style={{ paddingBottom: 'var(--safe-b)' }}
      aria-label="Primary"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2">
        {LINKS.map((link) => {
          const isActive = pathname === link.href;
          return (
            <li key={link.href} className="flex-1">
              <Link
                href={link.href}
                aria-current={isActive ? 'page' : undefined}
                // min-h-touch keeps the tap area at 44px even though the
                // visible icon+label stack is smaller.
                className="relative flex min-h-touch flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2.5"
              >
                {/* Active pill slides between tabs instead of popping. */}
                {isActive && (
                  <motion.span
                    layoutId="mobile-nav-pill"
                    className="absolute inset-x-1 inset-y-0.5 rounded-2xl bg-brand-50"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}

                <motion.span
                  className="relative z-10 flex flex-col items-center gap-1"
                  animate={{ scale: isActive ? 1 : 0.95 }}
                  whileTap={{ scale: 0.88 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <svg
                    className={`h-[22px] w-[22px] transition-colors duration-300 ${
                      isActive ? 'text-brand-700' : 'text-slate-400'
                    }`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={isActive ? 2.2 : 1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {ICONS[link.icon]}
                  </svg>
                  <span
                    className={`font-display text-[10px] font-bold leading-none tracking-wide transition-colors duration-300 ${
                      isActive ? 'text-brand-800' : 'text-slate-500'
                    }`}
                  >
                    {link.label}
                  </span>
                </motion.span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
