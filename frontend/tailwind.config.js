/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* nestflo.ai dark palette */
        navy: '#050710',
        'navy-light': '#100929',
        'navy-card': '#150343',
        orange: '#FF5943',
        'orange-dark': '#EF4F34',
        'brand-cyan': '#00F2EA',
        'brand-blue': '#2164FF',
        'brand-purple': '#5B67E6',
        'brand-lavender': '#BEAFF4',
        'brand-grey': '#7B83D8',
        offwhite: '#EDECE8',
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
