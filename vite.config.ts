import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/xianDayanPagoda/',
  plugins: [react()],
  server: { host: '0.0.0.0', port: 5178, strictPort: true, watch: { ignored: ['**/docs/**', '**/blender/**', '**/.playwright-mcp/**'] } },
  preview: { host: '0.0.0.0', port: 5178, strictPort: true },
  build: { chunkSizeWarningLimit: 800, rollupOptions: { output: { manualChunks: (id) => id.includes('/node_modules/three/') ? 'three' : undefined } } },
});
