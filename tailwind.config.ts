import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/views/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      screens: {
        'xxs': '320px',
        'xs': '375px',
      },
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
};

export default config;
