import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      // PWA Configuration
      publicDir: 'public',
      build: {
        // Ensure service worker and other PWA files are copied to dist
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html'),
          }
        },
        // Generate source maps for debugging
        sourcemap: mode !== 'production',
      }
    };
});
