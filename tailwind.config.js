/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ivory: '#FAF8F4',
        cream: '#F4F0E9',
        sand: '#EAE3D8',
        stone: { 200: '#E4DED5', 300: '#D3CBBF', 400: '#B3AA9D', 500: '#8C847A', 600: '#6B655D', 700: '#4A4540' },
        ink: { DEFAULT: '#1E1C1A', soft: '#3A3632' },
        bronze: { 50: '#F6EFE7', 100: '#EBDCCB', 300: '#C9A27E', 500: '#A8642A', 600: '#8E5422', 700: '#6E4119' },
        sage: { 50: '#EEF3EF', 500: '#4E7A61', 700: '#365744' },
        rose: { 50: '#F8ECEC', 500: '#B4524A', 700: '#8A3A34' },
        amber: { 50: '#FAF1E2', 500: '#B7802A' },
        slate: { 50: '#EDF1F6', 500: '#2E7CC0' },
        violet: { 50: '#F1EEF8', 500: '#6A4FA8' },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(30,28,26,0.04), 0 4px 16px rgba(30,28,26,0.04)',
        lift: '0 2px 4px rgba(30,28,26,0.04), 0 12px 32px rgba(30,28,26,0.08)',
        drawer: '-24px 0 64px rgba(30,28,26,0.12)',
      },
      borderRadius: { xl: '14px', '2xl': '20px', '3xl': '28px' },
      transitionTimingFunction: { lux: 'cubic-bezier(0.22, 1, 0.36, 1)' },
    },
  },
  plugins: [],
}
