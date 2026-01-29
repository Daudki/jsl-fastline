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
        'fastline-blue': '#0A84FF',
        'electric-teal': '#00E5CC',
        'graphite': '#0F172A',
        'ai-purple': '#7C3AED',
        'energy-orange': '#F97316',
        'offline-red': '#EF4444',
        'online-green': '#22C55E',
      },
      backgroundImage: {
        'primary-gradient': 'linear-gradient(135deg, #0A84FF, #00E5CC)',
        'ai-gradient': 'linear-gradient(135deg, #7C3AED, #0A84FF)',
        'dark-gradient': 'linear-gradient(180deg, #020617, #0F172A)',
      },
    },
  },
  plugins: [],
}
