/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink:        '#090909',
        'warm-white': '#F7F6F2',
        'warm-grey': '#C9C6BE',
        'dark-grey': '#202020',
        olive:      '#686958',
        'success':  '#2E8B57',
        'success-bg': '#EEF8F1',
        'border-line': '#E7E5DF',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Helvetica Neue', 'sans-serif'],
      },
      fontSize: {
        'hero':     ['clamp(2.5rem, 5vw, 4.5rem)', { lineHeight: '1.05', letterSpacing: '-0.03em' }],
        'section':  ['clamp(2rem, 3.5vw, 2.75rem)', { lineHeight: '1.1',  letterSpacing: '-0.02em' }],
      },
      borderRadius: {
        card: '16px',
        'card-lg': '20px',
        btn: '12px',
      },
      maxWidth: {
        content: '1440px',
      },
      transitionDuration: {
        DEFAULT: '220ms',
      },
      boxShadow: {
        subtle: '0 1px 3px rgba(9,9,9,0.04), 0 1px 2px rgba(9,9,9,0.03)',
        lift:   '0 4px 16px rgba(9,9,9,0.07)',
      },
    },
  },
  plugins: [],
}
