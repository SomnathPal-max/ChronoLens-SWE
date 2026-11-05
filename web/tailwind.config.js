/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: {
          canvas: '#090A0F',
          surface: '#0F1117',
          panel: '#151821',
          elevated: '#1C202C',
          subtle: '#232838',
          border: '#2C3246',
          focus: '#3F4864',
        },
        amber: {
          brand: '#F59E0B',
          hover: '#D97706',
          subtle: 'rgba(245, 158, 11, 0.12)',
          glow: 'rgba(245, 158, 11, 0.25)',
        },
        ink: {
          primary: '#F1F3F9',
          secondary: '#8F99B0',
          tertiary: '#555E75',
          dim: '#3E4559',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
