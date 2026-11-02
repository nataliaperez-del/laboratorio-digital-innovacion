/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { unadGeminiProxyPlugin } from './vite-plugin-unad-gemini-proxy';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss(), unadGeminiProxyPlugin(env)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      environment: 'node',
      include: ['tests/**/*.test.ts'],
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/api-anthropic': {
          target: 'https://api.anthropic.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-anthropic/, ''),
          headers: {
            Origin: 'https://api.anthropic.com',
          },
        },
        '/api-openai': {
          target: 'https://api.openai.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-openai/, ''),
        },
      },
    },
  };
});
