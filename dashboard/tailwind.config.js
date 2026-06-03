/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx,html}'],
  theme: {
    extend: {
      fontFamily: {
        barlow: ['Barlow', 'sans-serif'], 
      },
      colors: {
        primary: 'rgb(var(--color-primary, 79 70 229) / <alpha-value>)',
        'primary-hover': 'rgb(var(--color-primary-hover, 67 56 202) / <alpha-value>)',
        secondary: 'rgb(var(--color-secondary, 100 116 139) / <alpha-value>)',
        'secondary-hover': 'rgb(var(--color-secondary-hover, 71 85 105) / <alpha-value>)',
        background: '#f8fafc', // slate-50
      },
      boxShadow: {
        'soft': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
        'premium': '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)',
      }
    },
  },
  plugins: [],
};
