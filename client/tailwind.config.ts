import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        coral:      { DEFAULT: '#d85a30', hover: '#993c1d', tint: '#faece7', soft: '#f5c4b3', dark: '#712b13' },
        warm:       { bg: '#faf9f7', card: '#f4f1ec', border: '#e8e5df' },
        ink:        { DEFAULT: '#2c2c2a', muted: '#6b6a66' },
      },
      borderRadius: {
        card: '12px',
        container: '16px',
        pill: '999px',
      },
    },
  },
  plugins: [],
} satisfies Config;
