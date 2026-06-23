/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#07193B',
        orange: '#FF5943',
        offwhite: '#EDECE8',
        'navy-light': '#0E2A5E',
        'orange-dark': '#E84A35',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          "'Segoe UI'",
          'Roboto',
          "'Helvetica Neue'",
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
