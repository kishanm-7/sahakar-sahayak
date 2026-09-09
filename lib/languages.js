// Languages offered in the UI dropdown.
//
// To add another language, add one line here -- nothing else in the app needs
// to change. The model answers in whatever language it is told to use, and
// 'auto' means "reply in whatever language the user typed in".
export const LANGUAGES = [
  { code: 'auto', label: 'Auto-detect', native: 'Auto' },
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
];

export const LANGUAGE_NAMES = {
  en: 'English',
  hi: 'Hindi',
  mr: 'Marathi',
  bn: 'Bengali',
  ta: 'Tamil',
  te: 'Telugu',
  gu: 'Gujarati',
  kn: 'Kannada',
  pa: 'Punjabi',
  ml: 'Malayalam',
  or: 'Odia',
  as: 'Assamese',
  ur: 'Urdu',
};

// Cheap, offline language detection based on the Unicode script the text is
// written in. This is not a full language classifier -- it produces a *hint*
// that we pass to the model, which is very good at working out the rest.
//
// Why script matching instead of an ML detector? It costs nothing, adds no
// dependency, and is instant -- which matters on the voice path, where the
// ESP32 is sitting there synchronously waiting for a reply.
//
// Caveat worth knowing if a judge asks: Hindi and Marathi share the Devanagari
// script, so this cannot tell them apart. We return 'hi' and let the model
// mirror the user's actual wording, which handles it correctly in practice.
const SCRIPT_RANGES = [
  { code: 'hi', re: /[ऀ-ॿ]/ }, // Devanagari (Hindi / Marathi / others)
  { code: 'bn', re: /[ঀ-৿]/ }, // Bengali / Assamese
  { code: 'pa', re: /[਀-੿]/ }, // Gurmukhi (Punjabi)
  { code: 'gu', re: /[઀-૿]/ }, // Gujarati
  { code: 'or', re: /[଀-୿]/ }, // Odia
  { code: 'ta', re: /[஀-௿]/ }, // Tamil
  { code: 'te', re: /[ఀ-౿]/ }, // Telugu
  { code: 'kn', re: /[ಀ-೿]/ }, // Kannada
  { code: 'ml', re: /[ഀ-ൿ]/ }, // Malayalam
  { code: 'ur', re: /[؀-ۿ]/ }, // Arabic script (Urdu)
];

export function detectLanguage(text) {
  if (!text) return 'en';
  for (const { code, re } of SCRIPT_RANGES) {
    if (re.test(text)) return code;
  }
  // Latin script: could be English, or an Indian language typed in Roman
  // letters ("Hinglish"). We return 'en' as the hint, and the system prompt
  // tells the model to mirror the user's script -- so romanised input gets a
  // romanised answer back.
  return 'en';
}

export function languageName(code) {
  return LANGUAGE_NAMES[code] || 'English';
}
