#!/usr/bin/env node
/**
 * Sellado del núcleo REPOSITORIO_CIP_DF.
 *
 * Recorre `public/<REPO_DIR>/**`, deriva los metadatos de cada recurso a partir de su
 * ruta (convención sobre configuración) y regenera `manifest.json`. Cierra las trampas
 * de «leer N archivos»: versiones conviviendo, orden no determinista, basura de Drive o
 * escritorio, codificación (UTF-8 sin BOM, falla ante bytes no decodificables) y el
 * techo de tokens del núcleo.
 *
 *   node scripts/sellar-repositorio.mjs           → regenera el manifiesto
 *   node scripts/sellar-repositorio.mjs --check   → falla si el manifiesto en disco
 *                                                    difiere del regenerado (para CI)
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/** Lee un valor declarado en src/constants/repositorio.ts para no duplicar literales. */
function leerConstante(nombre, porDefecto) {
  try {
    const src = readFileSync(path.join(ROOT, 'src/constants/repositorio.ts'), 'utf8');
    const m = src.match(new RegExp(`${nombre}\\s*=\\s*['"\`]?([^'"\`;\\n]+)`));
    if (m) return m[1].trim();
  } catch {
    /* usa el valor por defecto */
  }
  return porDefecto;
}

const REPO_DIR = leerConstante('REPO_DIR', 'REPOSITORIO_CIP_DF');
const TOKENS_MAX = Number(process.env.REPO_TOKENS_MAX) || Number(leerConstante('REPO_TOKENS_MAX_DEFAULT', '500000')) || 500_000;
const REPO_ABS = path.join(ROOT, 'public', REPO_DIR);
const MANIFEST_ABS = path.join(REPO_ABS, 'manifest.json');
const GRUPOS_ORDEN = ['CONTENEDOR_1', 'CONTENEDOR_2', 'GENERALES'];

const EXT_ACEPTADAS = new Set(['.txt', '.md', '.json']);
const BASURA_EXACTA = new Set(['.DS_Store', 'desktop.ini', 'Thumbs.db']);
const esBasura = (nombre) =>
  BASURA_EXACTA.has(nombre) ||
  nombre.startsWith('.') ||
  nombre.startsWith('_') ||
  nombre.startsWith('~$') ||
  nombre.endsWith('.tmp');

const avisos = [];

/** Recorre recursivamente y devuelve rutas relativas (POSIX) de archivos candidatos. */
function recorrer(dirAbs, relBase = '') {
  const out = [];
  for (const entry of readdirSync(dirAbs, { withFileTypes: true })) {
    const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (esBasura(entry.name)) {
        avisos.push(`${rel}/ omitida: carpeta ignorada por convención.`);
        continue;
      }
      out.push(...recorrer(path.join(dirAbs, entry.name), rel));
    } else {
      if (entry.name === 'manifest.json' && !relBase) continue; // el propio manifiesto
      if (esBasura(entry.name)) {
        avisos.push(`${rel} omitido: archivo de sistema o temporal.`);
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase();
      if (!EXT_ACEPTADAS.has(ext)) {
        avisos.push(`${rel} omitido: extensión ${ext || '(sin extensión)'} no soportada.`);
        continue;
      }
      out.push(rel);
    }
  }
  return out;
}

/** Normaliza a UTF-8 sin BOM; lanza si hay bytes no decodificables (evita mojibake). */
function leerTextoUtf8(absPath, rel) {
  const buf = readFileSync(absPath);
  const sinBom = buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf ? buf.subarray(3) : buf;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(sinBom);
  } catch {
    throw new Error(
      `Codificación inválida en ${rel}: no es UTF-8 (probablemente CP-1252/Latin-1 desde Windows o Drive). ` +
        `Reguárdalo como UTF-8 sin BOM antes de sellar. Se prefiere una construcción rota a acentos destrozados llegando al modelo.`,
    );
  }
}

/** Deriva todos los metadatos de la ruta relativa (§3.2.2). */
function derivarMetadatos(rel) {
  const partes = rel.split('/');
  const grupo = partes[0];
  const archivo = partes[partes.length - 1];
  const sinExt = archivo.replace(/\.[^.]+$/, '');

  const prefijoNum = sinExt.match(/^(\d{1,3})_/);
  const orden = prefijoNum ? Number(prefijoNum[1]) : null;

  const tipo = sinExt.toLowerCase().startsWith('prompt_') ? 'prompt' : 'documento';

  // familia: sin prompt_, sin prefijo numérico y sin _vN; conserva _parteN.
  let base = sinExt;
  base = base.replace(/^\d{1,3}_/, '');
  base = base.replace(/^prompt_/i, '');
  const versionMatch = base.match(/_v(\d+)$/i);
  const version = versionMatch ? Number(versionMatch[1]) : 1;
  const familia = base.replace(/_v\d+$/i, '').toLowerCase();

  return {
    grupo,
    familia,
    tipo,
    ordenPrefijo: orden,
    version,
    aceptaFuentesPropias: grupo === 'CONTENEDOR_2',
    id: `${grupo.toLowerCase()}.${familia}`,
  };
}

function sha256(texto) {
  return 'sha256-' + createHash('sha256').update(texto, 'utf8').digest('hex');
}

function construirManifest() {
  if (!existsSync(REPO_ABS)) {
    throw new Error(`No existe la carpeta del núcleo: public/${REPO_DIR}/. Créala y coloca los recursos antes de sellar.`);
  }

  const rutas = recorrer(REPO_ABS).sort();
  const recursos = [];

  for (const rel of rutas) {
    const meta = derivarMetadatos(rel);
    if (!GRUPOS_ORDEN.includes(meta.grupo)) {
      avisos.push(`${rel} omitido: «${meta.grupo}» no es un grupo reconocido (${GRUPOS_ORDEN.join(', ')}).`);
      continue;
    }
    const absPath = path.join(REPO_ABS, ...rel.split('/'));
    const texto = leerTextoUtf8(absPath, rel);
    const bytes = statSync(absPath).size;
    const caracteres = texto.length;
    recursos.push({
      id: meta.id,
      ruta: rel,
      grupo: meta.grupo,
      familia: meta.familia,
      tipo: meta.tipo,
      ordenPrefijo: meta.ordenPrefijo,
      version: meta.version,
      vigente: true,
      aceptaFuentesPropias: meta.aceptaFuentesPropias,
      bytes,
      caracteres,
      tokensEstimados: Math.ceil(caracteres / 4),
      hash: sha256(texto),
    });
  }

  // Versiones conviviendo: por (grupo, familia) gana la versión más alta; el resto se archiva.
  const porFamilia = new Map();
  for (const r of recursos) {
    const clave = `${r.grupo}::${r.familia}`;
    const prev = porFamilia.get(clave);
    if (!prev || r.version > prev.version) porFamilia.set(clave, r);
  }
  for (const r of recursos) {
    const ganador = porFamilia.get(`${r.grupo}::${r.familia}`);
    r.vigente = ganador === r;
    if (!r.vigente) {
      avisos.push(`${r.grupo}/${r.familia}: v${r.version} ARCHIVADA (vigente v${ganador.version}).`);
    }
  }

  // Orden determinista: grupo → prefijo numérico → alfabético por ruta.
  const rangoGrupo = (g) => GRUPOS_ORDEN.indexOf(g);
  recursos.sort((a, b) => {
    if (a.grupo !== b.grupo) return rangoGrupo(a.grupo) - rangoGrupo(b.grupo);
    const oa = a.ordenPrefijo ?? Number.POSITIVE_INFINITY;
    const ob = b.ordenPrefijo ?? Number.POSITIVE_INFINITY;
    if (oa !== ob) return oa - ob;
    return a.ruta.localeCompare(b.ruta);
  });

  const grupos = { CONTENEDOR_1: [], CONTENEDOR_2: [], GENERALES: [] };
  let idx = 0;
  for (const r of recursos) {
    const orden = r.ordenPrefijo ?? idx * 10;
    idx += 1;
    grupos[r.grupo].push({
      id: r.id,
      ruta: r.ruta,
      grupo: r.grupo,
      familia: r.familia,
      tipo: r.tipo,
      orden,
      version: r.version,
      vigente: r.vigente,
      aceptaFuentesPropias: r.aceptaFuentesPropias,
      bytes: r.bytes,
      caracteres: r.caracteres,
      tokensEstimados: r.tokensEstimados,
      hash: r.hash,
    });
  }

  // Totales sobre lo que realmente se carga (recursos vigentes).
  const vigentes = recursos.filter((r) => r.vigente);
  const totales = {
    recursos: vigentes.length,
    caracteres: vigentes.reduce((s, r) => s + r.caracteres, 0),
    tokensEstimados: vigentes.reduce((s, r) => s + r.tokensEstimados, 0),
  };

  if (totales.tokensEstimados > TOKENS_MAX) {
    throw new Error(
      `El núcleo supera el techo de tokens: ${totales.tokensEstimados.toLocaleString()} > ${TOKENS_MAX.toLocaleString()} (REPO_TOKENS_MAX). ` +
        `Reduce contenido o sube el techo de forma deliberada. El error sale en construcción, no en producción.`,
    );
  }

  const version = calcularVersion(grupos);

  // Firma global del núcleo: sha256 sobre «ruta=hash» de los recursos vigentes, en orden estable.
  // Da un identificador de contenido para la trazabilidad de procedencia (§5), independiente de SemVer.
  const firma = vigentes
    .map((r) => `${r.ruta}=${r.hash}`)
    .sort()
    .join('|');
  const hash = sha256(firma);

  return {
    generadoEn: new Date().toISOString(),
    version,
    hash,
    repoDir: REPO_DIR,
    totales,
    grupos,
    avisos,
  };
}

/** SemVer: minor si cambió el conjunto de rutas vigentes; patch si solo cambió contenido. */
function calcularVersion(grupos) {
  let previo = null;
  if (existsSync(MANIFEST_ABS)) {
    try {
      previo = JSON.parse(readFileSync(MANIFEST_ABS, 'utf8'));
    } catch {
      previo = null;
    }
  }
  if (!previo?.version) return '1.0.0';

  const listar = (m) =>
    GRUPOS_ORDEN.flatMap((g) => (m.grupos?.[g] ?? []).filter((r) => r.vigente));
  const rutasDe = (lista) => lista.map((r) => r.ruta).sort().join('|');
  const hashesDe = (lista) =>
    lista
      .map((r) => `${r.ruta}=${r.hash}`)
      .sort()
      .join('|');

  const actual = listar({ grupos });
  const anterior = listar(previo);

  const [maj, min, pat] = String(previo.version).split('.').map((n) => Number(n) || 0);
  if (rutasDe(actual) !== rutasDe(anterior)) return `${maj}.${min + 1}.0`;
  if (hashesDe(actual) !== hashesDe(anterior)) return `${maj}.${min}.${pat + 1}`;
  return previo.version;
}

/** Copia comparable: sin `generadoEn` (cambia siempre) para el modo --check. */
function normalizarParaComparar(m) {
  const { generadoEn, ...resto } = m;
  return JSON.stringify(resto, null, 2);
}

function main() {
  const check = process.argv.includes('--check');
  const manifest = construirManifest();

  if (check) {
    if (!existsSync(MANIFEST_ABS)) {
      console.error('✗ No hay manifest.json en disco. Ejecuta: npm run sellar');
      process.exit(1);
    }
    const enDisco = JSON.parse(readFileSync(MANIFEST_ABS, 'utf8'));
    if (normalizarParaComparar(enDisco) !== normalizarParaComparar(manifest)) {
      console.error('✗ El manifest.json en disco está desactualizado. Ejecuta: npm run sellar');
      process.exit(1);
    }
    console.log(`✓ manifest.json vigente (v${manifest.version}, ${manifest.totales.recursos} recursos).`);
    return;
  }

  writeFileSync(MANIFEST_ABS, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`✓ Sellado public/${REPO_DIR}/manifest.json  ·  v${manifest.version}`);
  console.log(
    `  ${manifest.totales.recursos} recursos vigentes · ${manifest.totales.caracteres.toLocaleString()} caracteres · ~${manifest.totales.tokensEstimados.toLocaleString()} tokens (techo ${TOKENS_MAX.toLocaleString()})`,
  );
  for (const g of GRUPOS_ORDEN) {
    for (const r of manifest.grupos[g]) {
      console.log(`  · ${r.ruta}  [${r.tipo} · familia=${r.familia} · v${r.version}${r.vigente ? '' : ' ARCHIVADA'}]`);
    }
  }
  if (manifest.avisos.length) {
    console.log('  Avisos:');
    for (const a of manifest.avisos) console.log(`   - ${a}`);
  }
}

try {
  main();
} catch (e) {
  console.error(`✗ Sellado fallido: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
}
