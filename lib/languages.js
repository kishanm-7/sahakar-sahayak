// Strictly supported language codes in the application
export const ALLOWED_LANGUAGES = ['en', 'hi', 'ml', 'ta'];

// Languages offered in the UI dropdown.
export const LANGUAGES = [
  { code: 'auto', label: 'Auto-detect', native: 'Auto' },
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
];

export const LANGUAGE_NAMES = {
  en: 'English',
  hi: 'Hindi',
  ml: 'Malayalam',
  ta: 'Tamil',
};

// Offline language detection strictly mapped to supported scripts
const SCRIPT_RANGES = [
  { code: 'hi', re: /[ऀ-ॿ]/ }, // Devanagari (Hindi)
  { code: 'ml', re: /[ഀ-ൿ]/ }, // Malayalam
  { code: 'ta', re: /[஀-௿]/ }, // Tamil
];

export function detectLanguage(text) {
  if (!text) return 'en';
  for (const { code, re } of SCRIPT_RANGES) {
    if (re.test(text)) return code;
  }
  return 'en';
}

export function normalizeLanguage(code) {
  if (code && ALLOWED_LANGUAGES.includes(code)) {
    return code;
  }
  return 'auto';
}

export function languageName(code) {
  return LANGUAGE_NAMES[code] || 'English';
}
