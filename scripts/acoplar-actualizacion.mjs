#!/usr/bin/env node
/**
 * Herramienta de acoplamiento seguro de actualizaciones.
 *
 * Permite integrar archivos actualizados (del despliegue, zip o carpeta de entrega)
 * al proyecto local sin sobreescribir a ciegas el trabajo del desarrollador.
 *
 * Regla mandatoria: Si un archivo existente presenta diferencias, pregunta de forma
 * obligatoria al desarrollador para que decida si lo acepta (s), descarta (n),
 * revisa las diferencias (d), o crea una copia de respaldo antes de reemplazar (b).
 *
 * Uso:
 *   node scripts/acoplar-actualizacion.mjs <carpeta_actualizacion>
 *   node scripts/acoplar-actualizacion.mjs --revertir [timestamp]
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative, join, dirname } from 'node:path';
import { createInterface } from 'node:readline';

const BACKUP_ROOT = resolve('.respaldo_actualizaciones');

function printHelp() {
  console.log(`
Uso:
  node scripts/acoplar-actualizacion.mjs <carpeta_de_actualizacion>
  node scripts/acoplar-actualizacion.mjs --revertir [timestamp_respaldo]

Opciones:
  --revertir    Restaura los archivos respaldados de la última actualización (o la indicada).
  --help        Muestra esta ayuda.
`);
}

function promptUser(rl, query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

function walkDir(dir) {
  const files = [];
  if (!existsSync(dir)) return files;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.respaldo_actualizaciones') continue;
      files.push(...walkDir(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

function showSimpleDiff(oldContent, newContent) {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  console.log('\n--- Actual en tu proyecto');
  console.log('+++ Nuevo de la actualización');
  let changes = 0;
  for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
    const o = oldLines[i];
    const n = newLines[i];
    if (o !== n) {
      if (o !== undefined) console.log(`\x1b[31m- L${i + 1}: ${o.slice(0, 100)}\x1b[0m`);
      if (n !== undefined) console.log(`\x1b[32m+ L${i + 1}: ${n.slice(0, 100)}\x1b[0m`);
      changes++;
      if (changes >= 15) {
        console.log('... (más diferencias omitidas para brevedad)');
        break;
      }
    }
  }
  console.log('');
}

async function revertir(targetTimestamp) {
  if (!existsSync(BACKUP_ROOT)) {
    console.error('No se encontró la carpeta de respaldos (.respaldo_actualizaciones).');
    process.exit(1);
  }
  const backups = readdirSync(BACKUP_ROOT).filter((f) => statSync(join(BACKUP_ROOT, f)).isDirectory()).sort();
  if (!backups.length) {
    console.error('No existen respaldos para revertir.');
    process.exit(1);
  }
  const chosen = targetTimestamp || backups[backups.length - 1];
  const backupDir = join(BACKUP_ROOT, chosen);
  if (!existsSync(backupDir)) {
    console.error(`No existe el respaldo con identificador: ${chosen}`);
    process.exit(1);
  }

  console.log(`\nRevertiendo al respaldo: ${chosen}...`);
  const files = walkDir(backupDir);
  for (const f of files) {
    const rel = relative(backupDir, f);
    const dest = resolve(rel);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(f, dest);
    console.log(`  Restaurado: ${rel}`);
  }
  console.log('\nReversión completada con éxito.');
}

async function acoplar(origenDir) {
  const absOrigen = resolve(origenDir);
  if (!existsSync(absOrigen)) {
    console.error(`El directorio de origen no existe: ${absOrigen}`);
    process.exit(1);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sessionBackupDir = join(BACKUP_ROOT, timestamp);
  mkdirSync(sessionBackupDir, { recursive: true });

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const incomingFiles = walkDir(absOrigen);

  console.log(`\n=== ACOPLAMIENTO SEGURO DE ACTUALIZACIÓN ===`);
  console.log(`Origen: ${absOrigen}`);
  console.log(`Destino: ${process.cwd()}`);
  console.log(`Respaldo automático en: ${sessionBackupDir}\n`);

  const stats = { agregados: 0, actualizados: 0, conservados: 0, identicos: 0 };

  for (const srcFile of incomingFiles) {
    const relPath = relative(absOrigen, srcFile);
    const destFile = resolve(relPath);

    // Archivo nuevo
    if (!existsSync(destFile)) {
      mkdirSync(dirname(destFile), { recursive: true });
      copyFileSync(srcFile, destFile);
      console.log(`\x1b[32m[NUEVO]\x1b[0m ${relPath} (agregado automáticamente)`);
      stats.agregados++;
      continue;
    }

    // Comprobación de contenido
    const destBuf = readFileSync(destFile);
    const srcBuf = readFileSync(srcFile);

    if (destBuf.equals(srcBuf)) {
      stats.identicos++;
      continue;
    }

    // El archivo existe y tiene diferencias: PREGUNTA OBLIGATORIA
    console.log(`\n\x1b[33m[MODIFICADO]\x1b[0m ${relPath}`);
    console.log(`Este archivo ya existe en tu proyecto y la actualización trae cambios.`);

    let decision = '';
    while (!['s', 'n', 'b'].includes(decision)) {
      const resp = await promptUser(
        rl,
        `¿Deseas reemplazarlo con la actualización?
  [s] Sí, reemplazar
  [n] No, conservar mi versión actual
  [d] Ver diferencias rápidas
  [b] Guardar respaldo .bak local y reemplazar
Tu elección [s/n/d/b]: `
      );
      decision = resp.trim().toLowerCase();

      if (decision === 'd') {
        const oldText = destBuf.toString('utf-8');
        const newText = srcBuf.toString('utf-8');
        showSimpleDiff(oldText, newText);
      }
    }

    // Respaldar siempre en la carpeta de sesión antes de sobreescribir
    const backupFile = join(sessionBackupDir, relPath);
    mkdirSync(dirname(backupFile), { recursive: true });
    copyFileSync(destFile, backupFile);

    if (decision === 's') {
      copyFileSync(srcFile, destFile);
      console.log(`\x1b[32m-> Reemplazado con éxito.\x1b[0m`);
      stats.actualizados++;
    } else if (decision === 'b') {
      const bakLocal = `${destFile}.bak`;
      copyFileSync(destFile, bakLocal);
      copyFileSync(srcFile, destFile);
      console.log(`\x1b[32m-> Guardado ${relPath}.bak y reemplazado con éxito.\x1b[0m`);
      stats.actualizados++;
    } else {
      console.log(`\x1b[36m-> Conservada tu versión actual.\x1b[0m`);
      stats.conservados++;
    }
  }

  rl.close();

  console.log(`\n===========================================`);
  console.log(`RESUMEN DEL ACOPLAMIENTO:`);
  console.log(`- Archivos idénticos (sin cambios): ${stats.identicos}`);
  console.log(`- Archivos nuevos agregados:       ${stats.agregados}`);
  console.log(`- Archivos actualizados:           ${stats.actualizados}`);
  console.log(`- Archivos conservados (tu código): ${stats.conservados}`);
  console.log(`- Copia de seguridad guardada en:  ${sessionBackupDir}`);
  console.log(`(Si necesitas deshacer los cambios, ejecuta: node scripts/acoplar-actualizacion.mjs --revertir ${timestamp})\n`);
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args.includes('--help')) {
    printHelp();
    process.exit(0);
  }

  if (args[0] === '--revertir') {
    await revertir(args[1]);
    return;
  }

  await acoplar(args[0]);
}

main().catch((err) => {
  console.error('Error durante el acoplamiento:', err);
  process.exit(1);
});
