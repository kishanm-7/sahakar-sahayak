// Languages offered in the UI dropdown.
// Supported languages: English, Hindi, Malayalam, Tamil + Auto-detect.
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

// Cheap, offline language detection based on the Unicode script the text is
// written in.
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

export function languageName(code) {
  return LANGUAGE_NAMES[code] || 'English';
}
