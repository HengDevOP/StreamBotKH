/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          cyan: '#00F0FF',
          pink: '#FF007A',
          purple: '#8A2BE2',
          yellow: '#FFE600',
          green: '#00FF66',
          dark: '#080B12',
          card: '#0F172A',
          border: '#1E293B',
          glow: 'transparent'
        }
      },
      boxShadow: {
        'neon-cyan': 'none',
        'neon-pink': 'none',
        'neon-purple': 'none',
        'neon-green': 'none',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounce 2s infinite',
      }
    },
  },
  plugins: [],
}
