/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: '#0b0f19',
        darkCard: '#151d30',
        darkBorder: '#222f4c',
        accentBlue: '#3b82f6',
        accentCyan: '#06b6d4',
      }
    },
  },
  plugins: [],
}
