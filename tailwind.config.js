module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        rose: {
          base: 'var(--color-rose-base, #191724)',
          surface: 'var(--color-rose-surface, #1f1d2e)',
          overlay: 'var(--color-rose-overlay, #26233a)',
          muted: 'var(--color-rose-muted, #6e6a86)',
          subtle: 'var(--color-rose-subtle, #908caa)',
          text: 'var(--color-rose-text, #e0def4)',
          love: 'var(--color-rose-love, #eb6f92)',
          gold: 'var(--color-rose-gold, #f6c177)',
          rose: 'var(--color-rose-rose, #ebbcba)',
          pine: 'var(--color-rose-pine, #31748f)',
          foam: 'var(--color-rose-foam, #9ccfd8)',
          iris: 'var(--color-rose-iris, #c4a7e7)',
          highlightLow: 'var(--color-rose-highlightLow, #21202e)',
          highlightMed: 'var(--color-rose-highlightMed, #403d52)',
          highlightHigh: 'var(--color-rose-highlightHigh, #524f67)'
        }
      },
      fontFamily: {
        sans: ['Nebula Sans', 'Inter', 'sans-serif'],
      }
    }
  },
  plugins: []
}
