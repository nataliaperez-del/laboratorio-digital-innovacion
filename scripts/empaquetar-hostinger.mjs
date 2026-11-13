#!/usr/bin/env node
/**
 * Actualiza hostinger_deploy/ con la última compilación: reemplaza el núcleo y los archivos
 * generados por Vite y retira los de compilaciones anteriores. No toca lo que no genera
 * Vite (config, includes, database, .htaccess ni los assets de marca).
 */
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

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
// Laboratorio sin conexión: el service worker va en la raíz para cubrir todo el sitio.
cpSync(path.join(DIST, 'sw.js'), path.join(DEPLOY, 'sw.js'));
// Copias de respaldo que no se usan y no deben viajar.
rmSync(path.join(assets, 'badges_original_backup'), { recursive: true, force: true });

// Concentrador de datos: quién administra, qué dominios entran y para qué cliente de Google se emiten
// los ingresos. Son los mismos valores con los que se compiló la aplicación; ninguno es secreto.
const env = loadEnv('production', ROOT, 'VITE_');
const lista = (raw, fallback = []) => {
  const items = (raw ?? '')
    .split(/[,;\s]+/)
    .map((x) => x.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean);
  return items.length ? items : fallback;
};
const php = (items) => `[${items.map((x) => `'${x.replace(/['\\]/g, '')}'`).join(', ')}]`;
writeFileSync(
  path.join(DEPLOY, 'config', 'lab.php'),
  `<?php
declare(strict_types=1);

/**
 * Configuración del concentrador de datos del Laboratorio (includes/lab.php).
 * Lo genera el empaquetado con los valores de la compilación. El .htaccess impide leerlo desde la web.
 */
return [
    // Cuentas que pueden ver los datos de todos (tablero global, resultados y banco de insumos).
    'administradores' => ${php(lista(env.VITE_ADMIN_EMAILS))},
    // Dominios de correo que pueden ingresar.
    'dominios' => ${php(lista(env.VITE_ALLOWED_EMAIL_DOMAINS, ['unad.edu.co']))},
    // ID de cliente de Google de este sitio: solo se aceptan ingresos emitidos para él.
    'google_client_id' => '${(env.VITE_GOOGLE_CLIENT_ID ?? '').trim().replace(/['\\]/g, '')}',
];
`,
);
if (!lista(env.VITE_ADMIN_EMAILS).length) console.warn('! VITE_ADMIN_EMAILS está vacío: nadie podrá ver el tablero global.');
if (!env.VITE_GOOGLE_CLIENT_ID?.trim()) console.warn('! Falta VITE_GOOGLE_CLIENT_ID: el ingreso con Google no funcionará.');

// El paquete es solo para Hostinger: no puede nombrar otros servicios de despliegue.
const PROHIBIDO = /vercel/i;
const TEXTO = /\.(html?|js|mjs|css|json|php|md|txt|sql|htaccess|svg|xml)$/i;
const hallazgos = [];
const revisar = (dir) => {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) revisar(full);
    else if ((TEXTO.test(name) || name === '.htaccess') && PROHIBIDO.test(readFileSync(full, 'utf8'))) hallazgos.push(path.relative(DEPLOY, full));
    else if (PROHIBIDO.test(name)) hallazgos.push(path.relative(DEPLOY, full));
  }
};
revisar(DEPLOY);
if (hallazgos.length) {
  console.error(`✗ El paquete menciona un servicio de despliegue ajeno a Hostinger en:\n  ${hallazgos.join('\n  ')}\n  Corrige el origen y vuelve a empaquetar.`);
  process.exit(1);
}

console.log('✓ hostinger_deploy/ actualizado.');
if (!existsSync(path.join(DEPLOY, 'config', 'ia.php'))) {
  console.warn('! Falta config/ia.php: copia config/ia.example.php y completa las credenciales.');
}
