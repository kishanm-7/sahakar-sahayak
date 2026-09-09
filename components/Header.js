'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LANGUAGES } from '@/lib/languages';
import { useLanguage } from '@/lib/LanguageContext';

export default function Header() {
  const { language, setLanguage } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Chat' },
    { href: '/grievance', label: 'File a Grievance' },
    { href: '/track', label: 'Track Status' },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-emerald-900/10 bg-[#FAF8F5]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Left: Logo & Wordmark */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1B5E3F] text-white shadow-sm transition-transform group-hover:scale-105">
            {/* Sprout / Agriculture Icon */}
            <svg
              className="h-6 w-6 fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5c0 .83-.67 1.5-1.5 1.5S10 17.33 10 16.5V13H8.5c-.83 0-1.5-.67-1.5-1.5S7.67 10 8.5 10H10V7.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5V10h1.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5H13v3.5z" opacity="0.3"/>
              <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L12 7.83l7.03 9.78C20.26 16.07 21 14.12 21 12c0-4.97-4.03-9-9-9zm-1.25 14h2.5v2h-2.5vv-2z"/>
              <path d="M12 4a8 8 0 0 0-8 8c0 1.95.7 3.74 1.87 5.14L12 8.5l6.13 8.64A7.96 7.96 0 0 0 20 12a8 8 0 0 0-8-8zm-1 8h2v5h-2v-5z"/>
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-[#1B5E3F] leading-tight">
              सहकार सहायक
            </span>
            <span className="text-xs font-medium text-slate-600 tracking-wide">
              Cooperative Sahayak
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 rounded-full bg-emerald-900/5 p-1 text-sm font-medium">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-1.5 transition-all ${
                  isActive
                    ? 'bg-[#1B5E3F] text-white shadow-xs'
                    : 'text-slate-700 hover:text-[#1B5E3F] hover:bg-emerald-900/10'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: Language Dropdown & Mobile Menu Button */}
        <div className="flex items-center gap-3">
          {/* Pill-Style Language Dropdown */}
          <div className="relative flex items-center rounded-full border border-emerald-800/20 bg-white shadow-xs transition-all hover:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-600/30">
            <div className="pl-3 text-emerald-800 pointer-events-none flex items-center justify-center">
              {/* Globe Icon */}
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="appearance-none bg-transparent py-1.5 pl-2 pr-7 text-xs font-semibold text-slate-800 outline-none cursor-pointer rounded-full"
              aria-label="Select Language"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} className="py-1 text-slate-800">
                  {l.native}
                  {l.code !== 'auto' && l.native !== l.label ? ` (${l.label})` : ''}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2 text-slate-500">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Mobile Hamburger Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-900/15 bg-white text-slate-700 hover:bg-slate-50 md:hidden"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <nav className="border-t border-emerald-900/10 bg-white px-4 py-3 shadow-md md:hidden flex flex-col gap-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#1B5E3F] text-white'
                    : 'text-slate-700 hover:bg-emerald-50 hover:text-[#1B5E3F]'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
