/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        notion: {
          bg: '#ffffff',
          darkBg: '#191919',
          card: '#f7f6f3',
          darkCard: '#202020',
          border: '#e9e9e8',
          darkBorder: '#2f2f2f',
          text: '#37352f',
          darkText: '#d4d4d4',
          muted: '#787774',
          darkMuted: '#9b9a97'
        }
      }
    },
  },
  plugins: [],
}
