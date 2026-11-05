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
        },
        amber: {
          brand: '#F59E0B',
          hover: '#D97706',
        },
        ink: {
          primary: '#F1F3F9',
          secondary: '#8F99B0',
          tertiary: '#555E75',
          dim: '#3E4559',
        },
        // Mapped legacy tokens for seamless Obsidian & Amber aesthetic
        midnight: {
          950: '#090A0F', // deep matte obsidian canvas
          900: '#0F1117', // surface panel
          850: '#151821', // column backdrop
          800: '#1C202C', // card surface
          750: '#232838', // card hover surface
          700: '#2C3246', // primary 1px border
          600: '#3E4559', // subtle border
          500: '#8F99B0', // secondary text
          indigo: '#F59E0B', // industrial amber brand
          glow: '#F59E0B',
        },
        vanilla: {
          50: '#FFFFFF',
          100: '#F1F3F9', // crisp primary ink
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          text: '#F1F3F9',
          muted: '#8F99B0', // secondary ink
          dim: '#555E75', // tertiary metadata
        },
      },
    },
  },
  plugins: [],
};
