#!/usr/bin/env node
/**
 * Actualiza hostinger_deploy/ con la última compilación: reemplaza el núcleo y los archivos
 * generados por Vite y retira los de compilaciones anteriores. No toca lo que no genera
 * Vite (config, includes, database, .htaccess ni los assets de marca).
 */
import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const DEPLOY = path.join(ROOT, 'hostinger_deploy');

if (!existsSync(path.join(DIST, 'index.html'))) {
  console.error('✗ No existe dist/index.html. Ejecuta primero: npm run build');
  process.exit(1);
}

const assets = path.join(DEPLOY, 'assets');
for (const name of readdirSync(assets)) {
  // Solo los archivos con hash de Vite: index-AbC123.js, pdf.worker-AbC123.mjs…
  if (/^(index|pdf\.worker|[\w.-]+)-[\w-]{8}\.(js|mjs|css)$/.test(name)) rmSync(path.join(assets, name));
}
rmSync(path.join(DEPLOY, 'REPOSITORIO_CIP_DF'), { recursive: true, force: true });

cpSync(path.join(DIST, 'assets'), assets, { recursive: true });
cpSync(path.join(DIST, 'REPOSITORIO_CIP_DF'), path.join(DEPLOY, 'REPOSITORIO_CIP_DF'), { recursive: true });
cpSync(path.join(DIST, 'index.html'), path.join(DEPLOY, 'index.html'));
console.log('✓ hostinger_deploy/ actualizado.');
if (!existsSync(path.join(DEPLOY, 'config', 'ia.php'))) {
  console.warn('! Falta config/ia.php: copia config/ia.example.php y completa las credenciales.');
}
