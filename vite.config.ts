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
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        },
        mainFields: ['module', 'main'],
      },
      build: {
        // Enable manual chunk splitting for better caching
        splitManualChunks: true,
        rollupOptions: {
          output: {
            manualChunks: {
              // React core - stable, rarely changes
              'react-vendor': ['react', 'react-dom'],
              // Framer Motion - animation library
              'motion-vendor': ['framer-motion'],
              // AI SDKs - large, change independently
              'ai-vendor': [
                '@google/genai',
                'openai',
                '@anthropic-ai/sdk',
                'cohere-ai'
              ],
              // Firebase - if used, separate for caching
              'firebase-vendor': ['firebase/app', 'firebase/firestore'],
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
