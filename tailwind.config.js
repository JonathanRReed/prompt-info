module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        oled: '#000000',
        sidebar: '#0a0f29',
        footer: '#260b41',
        accentPrimary: '#4dfff0',
        accentSecondary: '#ff4dc4',
        accentGold: '#ffd24d',
        accentPurple: '#9933ff'
      },
      fontFamily: {
        sans: ['Nebula Sans', 'Inter', 'sans-serif'],
      }
    }
  },
  plugins: []
}
