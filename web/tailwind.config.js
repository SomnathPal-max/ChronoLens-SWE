/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        chrono: {
          bg: '#0a0d14',
          card: '#111622',
          border: '#1f293d',
          accent: '#6366f1',
          muted: '#64748b',
        },
      },
    },
  },
  plugins: [],
};
