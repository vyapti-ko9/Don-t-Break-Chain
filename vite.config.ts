import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the built app works inside the Capacitor Android WebView.
// preserveSymlinks: folder name contains an apostrophe; building via a junction
// (e.g. C:\project-v\dbc) must not realpath back to don't-break-chain or Rollup
// emits invalid asset names like "../don't-break-chain/index.html".
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    preserveSymlinks: true,
  },
  build: {
    outDir: 'dist',
    target: 'es2020',
    sourcemap: false,
  },
  server: {
    host: true,
    port: 5173,
  },
});
