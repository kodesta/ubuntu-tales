import { fileURLToPath, URL } from 'node:url';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite';

/**
 * Vite config for the Ubuntu Tales web app.
 *
 * Notes:
 * - TanStack Router is file-based: the plugin generates `src/routeTree.gen.ts` from `src/routes`
 *   on dev/build. That file is gitignored, so both `vite dev` and `vite build` generate it.
 * - `@` and the two workspace packages are aliased to source to mirror `tsconfig.json` paths, so
 *   typecheck and bundling agree (the packages are consumed from source during development).
 * - `/api` is proxied to the NestJS API on :4100 (the client uses the `/api/v1` base URL).
 */
export default defineConfig({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectRegister: null,
      manifest: {
        name: 'Ubuntu Tales',
        short_name: 'Ubuntu Tales',
        description: 'African folktales, kept alive — read and listen.',
        theme_color: '#E8820B',
        background_color: '#FFFFFF',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,woff2,svg}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@ubuntu-tales/shared': fileURLToPath(
        new URL('../../packages/shared/src/index.ts', import.meta.url),
      ),
      '@ubuntu-tales/api-client': fileURLToPath(
        new URL('../../packages/api-client/src/index.ts', import.meta.url),
      ),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4100',
        changeOrigin: true,
      },
      // Narration audio and other media are served by the API (local storage in Phase 3).
      '/media': {
        target: 'http://localhost:4100',
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    cssCodeSplit: true,
  },
});
