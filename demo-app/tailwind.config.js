/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        midnight: {
          950: '#0B0D1B', // deep dark midnight canvas
          900: '#10142A', // panel & nav surface
          850: '#141A38', // column backdrop
          800: '#192044', // card surface
          750: '#202956', // card hover surface
          700: '#2C3770', // primary border
          600: '#3D4C9A', // focus & accent border
          500: '#5364C7', // muted indigo
          indigo: '#5E6CE7', // vivid brand midnight indigo
          glow: '#7B88FF', // indigo light glow
        },
        vanilla: {
          50: '#FFFDF8',  // ultra light vanilla
          100: '#FDF8EC', // primary vanilla cream
          200: '#F7EED5', // soft vanilla custard
          300: '#EDE0BA', // warm vanilla
          400: '#DECA97', // golden vanilla
          500: '#C7B078', // antique vanilla
          text: '#FDF8EC', // primary high-contrast text
          muted: '#D5C9A9', // secondary subtle text
          dim: '#9E947A',  // tertiary metadata
        },
      },
    },
  },
  plugins: [],
};
