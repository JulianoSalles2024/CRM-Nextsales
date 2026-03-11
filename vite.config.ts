import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      root: './frontend',
      server: {
        port: 3002,
        host: '0.0.0.0',
        proxy: {
          '/api/': {
            target: 'http://localhost:3000',
            changeOrigin: true,
          }
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './frontend'),
        }
      },
      build: {
        outDir: path.resolve(__dirname, 'dist'),
        emptyOutDir: true,
      },
    };
});
