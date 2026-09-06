import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Zero-config deploy target: `npm run build` -> dist/ (Vercel / Netlify pick it up automatically).
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/postprocessing/') || id.includes('@react-three/postprocessing')) return 'postfx';
          if (id.includes('/node_modules/three/')) return 'three';
          if (id.includes('/gsap/')) return 'gsap';
          return undefined;
        },
      },
    },
  },
});
