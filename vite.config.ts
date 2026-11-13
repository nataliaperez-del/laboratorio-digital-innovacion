/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { unadGeminiProxyPlugin } from './vite-plugin-unad-gemini-proxy';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    plugins: [react(), tailwindcss(), unadGeminiProxyPlugin(env)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        // Fonetizador de Piper (espeak-ng en WebAssembly) que trae la librería sin exportarlo.
        // El nombre lleva el hash de la versión 1.0.5, fijada en package.json.
        'piper-phonemize': path.resolve(__dirname, './node_modules/@mintplex-labs/piper-tts-web/dist/piper-o91UDS6e.js'),
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
        // Solo para probar en local el concentrador de datos de Hostinger: `php -S` con
        // scripts/pruebas/router-php.php y LAB_PHP=http://127.0.0.1:8099.
        ...(process.env.LAB_PHP ? { '/api/lab': { target: process.env.LAB_PHP, changeOrigin: false } } : {}),
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
