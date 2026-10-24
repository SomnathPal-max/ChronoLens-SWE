/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        chrono: {
          bg: '#0B0D1B',
          card: '#121634',
          border: '#252D5E',
          accent: '#5E6CE7',
          muted: '#8D97BE',
          vanilla: '#FDF8EC',
          'vanilla-muted': '#D8CCA8',
        },
      },
    },
  },
  plugins: [],
};
