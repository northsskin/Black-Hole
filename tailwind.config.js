/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        ice: '#cfe0ff',
        glow: '#7fb0ff',
        dim: 'rgba(207, 224, 255, 0.45)',
      },
      letterSpacing: {
        hud: '0.32em',
        wide2: '0.18em',
      },
    },
  },
  plugins: [],
};
