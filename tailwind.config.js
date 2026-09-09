/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Headings: a geometric display sans (Latin only -- see app/layout.js).
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        // Body: a system stack. Deliberately NOT a webfont, because it has to
        // render Devanagari, Malayalam and Tamil, and the OS ships better
        // coverage for those scripts than any Latin webfont we could load.
        sans: ['var(--font-body)', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },

      colors: {
        // Deepened version of the existing agricultural green. brand-700 is the
        // original #1B5E3F, so anything already using it stays on-palette.
        brand: {
          50: '#EDF7F1',
          100: '#D3EDE0',
          200: '#A8DBC2',
          300: '#74C39F',
          400: '#43A87D',
          500: '#2E9E68',
          600: '#227A52',
          700: '#1B5E3F',
          800: '#16543A',
          900: '#103A28',
          950: '#0B2B1D',
        },
        // Teal end of the primary gradient.
        teal: {
          500: '#12897A',
          600: '#0E7C6B',
          700: '#0B6559',
        },
        canvas: '#FAF8F5',
        parchment: '#F4F0E8',
      },

      spacing: {
        // Notch / home-indicator insets. Only non-zero when the viewport is
        // declared with viewport-fit=cover (see app/layout.js).
        safe: 'env(safe-area-inset-bottom, 0px)',
        'safe-t': 'env(safe-area-inset-top, 0px)',
        // Height of the mobile bottom nav, so content can clear it.
        nav: '4.25rem',
      },

      minHeight: {
        // Apple/Google both put the comfortable touch target at 44px.
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },

      boxShadow: {
        // Layered shadows read as depth; a single hard shadow reads as a border.
        soft: '0 1px 2px rgba(11,43,29,.04), 0 4px 12px -2px rgba(11,43,29,.06)',
        lift: '0 2px 4px rgba(11,43,29,.04), 0 12px 28px -6px rgba(11,43,29,.12)',
        float: '0 8px 20px -6px rgba(11,43,29,.14), 0 24px 48px -12px rgba(11,43,29,.16)',
        glow: '0 0 0 1px rgba(27,94,63,.08), 0 8px 24px -6px rgba(27,94,63,.28)',
        'glow-rose': '0 0 0 6px rgba(244,63,94,.10), 0 0 28px -4px rgba(244,63,94,.45)',
        inset: 'inset 0 1px 0 rgba(255,255,255,.6)',
      },

      backgroundImage: {
        'brand-gradient': 'linear-gradient(115deg, #1B5E3F 0%, #177055 45%, #0E7C6B 100%)',
        'brand-gradient-soft': 'linear-gradient(115deg, #227A52 0%, #12897A 100%)',
        'hero-mesh':
          'radial-gradient(60% 80% at 12% 18%, rgba(46,158,104,.22) 0%, transparent 60%),' +
          'radial-gradient(50% 70% at 88% 12%, rgba(14,124,107,.20) 0%, transparent 62%),' +
          'radial-gradient(70% 90% at 65% 100%, rgba(251,191,36,.14) 0%, transparent 60%)',
      },

      keyframes: {
        // Ambient hero wash -- slow enough to read as light, not motion.
        drift: {
          '0%,100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(0,-14px,0) scale(1.06)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        // Two-stage bounce for the typing indicator.
        dot: {
          '0%,60%,100%': { transform: 'translateY(0)', opacity: '.45' },
          '30%': { transform: 'translateY(-5px)', opacity: '1' },
        },
        breathe: {
          '0%,100%': { opacity: '.55' },
          '50%': { opacity: '1' },
        },
      },

      animation: {
        drift: 'drift 14s ease-in-out infinite',
        'drift-slow': 'drift 20s ease-in-out infinite',
        shimmer: 'shimmer 1.8s infinite',
        dot: 'dot 1.25s ease-in-out infinite',
        breathe: 'breathe 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
