import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        allowedHosts: ['.ws', '.local', 'localhost', '127.0.0.1'],
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          '@shared': path.resolve(__dirname, './shared'),
        },
        mainFields: ['module', 'main'],
      },
      build: {
        // Enable manual chunk splitting for better caching
        splitManualChunks: true,
        rollupOptions: {
          external: [
            '@tiptap/react', '@tiptap/starter-kit', '@tiptap/extension-mention',
            'flexsearch', 'jszip',
            '@google/genai', 'openai', '@anthropic-ai/sdk', 'cohere-ai',
            'firebase/app', 'firebase/firestore'
          ],
          output: {
            manualChunks: {
              // React core - stable, rarely changes
              'react-vendor': ['react', 'react-dom'],
              // Framer Motion - animation library
              'motion-vendor': ['framer-motion'],
            },
            // Content-hash based naming for long-term caching
            entryFileNames: 'assets/[name]-[hash].js',
            chunkFileNames: 'assets/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash].[ext]',
          }
        },
        // Optimize chunk size warnings (default is 500KB)
        chunkSizeWarningLimit: 1000,
      }
    };
});
