#!/usr/bin/env node
/**
 * Banco unadista de ZOE.
 *
 * Arma `src/content/zoe/banco-unadista.json` con lo que ZOE debe conocer del repositorio
 * institucional, desde los mismos archivos que usa la aplicación (`public/REPOSITORIO_CIP_DF`):
 *
 *  - El glosario del metalenguaje unadista: el Anexo C del Contenedor 1 (diccionario completo)
 *    y el glosario operativo de su sección 16.
 *  - El marco institucional estable del Contenedor 1 (Parte I): identidad, metasistema,
 *    estructura, MHUS 5.0, responsabilidades sustantivas, horizonte UNAD 5.0, ODS y referencias.
 *  - Todo el Contenedor 2: su método (MDVT), fuentes, ejes y reglas.
 *
 * ZOE lo usa como banco de información (consulta), nunca como instrucciones: ver
 * `src/lib/zoeKnowledge.ts`. Corre solo antes de `npm run dev` y `npm run build`; también con
 * `npm run zoe:banco`. Solo reescribe el archivo si cambió el contenido.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const REPO = path.join(ROOT, 'public', 'REPOSITORIO_CIP_DF');
const OUT = path.join(ROOT, 'src', 'content', 'zoe', 'banco-unadista.json');
const MAX_PASSAGE = 1600;

const read = (rel) => readFileSync(path.join(REPO, ...rel.split('/')), 'utf8').replace(/\r\n?/g, '\n');
const fingerprint = (text) => `sha256-${createHash('sha256').update(text).digest('hex').slice(0, 16)}`;
const squash = (text) => text.replace(/\s+/g, ' ').trim();
const normalize = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const isRule = (line) => /^[\s=\-#━─_*|]+$/.test(line) && line.trim().length >= 3;

function fail(message) {
  console.error(`✗ Banco unadista de ZOE: ${message}`);
  process.exit(1);
}

// ── Contenedor 1, Parte I ──

const c1Rel = 'CONTENEDOR_1/CONTENEDOR_1.md';
if (!existsSync(path.join(REPO, ...c1Rel.split('/')))) fail(`no existe ${c1Rel}`);
const c1 = read(c1Rel);
const start = c1.indexOf('PARTE I. MARCO INSTITUCIONAL ESTABLE');
const end = c1.indexOf('FIN DEL CONTENEDOR 1');
if (start < 0 || end < 0) fail('no encontré la Parte I del Contenedor 1');
const part1 = c1.slice(start, end).split('\n');

/** Secciones con el formato «━━━ / N. TÍTULO / ━━━». */
function sections(lines) {
  const out = [];
  let current = null;
  for (let i = 0; i < lines.length; i++) {
    const isHeader = /^━{10,}/.test(lines[i]) && /^━{10,}/.test(lines[i + 2] ?? '') && lines[i + 1]?.trim();
    if (isHeader) {
      current = { title: squash(lines[i + 1]), lines: [] };
      out.push(current);
      i += 2;
    } else if (current) current.lines.push(lines[i]);
  }
  return out;
}

const c1Sections = sections(part1);
const anexoC = c1Sections.find((s) => /^ANEXO C/i.test(s.title));
const operativo = c1Sections.find((s) => /^16\.\s/.test(s.title));
if (!anexoC) fail('no encontré el Anexo C (diccionario del metalenguaje unadista)');

/** Anexo C: «Término: definición», con la definición que sigue en líneas sangradas. */
function parseDictionary(lines) {
  const entries = [];
  let current = null;
  let started = false;
  for (const line of lines) {
    if (/^──\s*LETRA/i.test(line)) {
      started = true;
      continue;
    }
    if (!started || !line.trim() || isRule(line)) continue;
    if (/^\s/.test(line) && current) {
      current.definicion = squash(`${current.definicion} ${line}`);
      continue;
    }
    const m = line.match(/^(\S[^:]{0,110}?):\s*(.*)$/);
    if (m) {
      current = { termino: squash(m[1]), definicion: squash(m[2]), fuente: 'Diccionario del metalenguaje unadista (Contenedor 1, Anexo C)' };
      entries.push(current);
    } else if (current) current.definicion = squash(`${current.definicion} ${line}`);
  }
  return entries.filter((e) => e.termino && e.definicion);
}

/** Sección 16: tabla «Término | Definición», con continuaciones «   | …». */
function parseOperationalTable(lines) {
  const entries = [];
  let current = null;
  for (const line of lines) {
    if (!line.includes('|') || /^\s*-{3,}/.test(line)) continue;
    const [left, ...rest] = line.split('|');
    const right = squash(rest.join('|'));
    if (left.trim()) {
      if (/^t[ée]rmino$/i.test(left.trim())) continue;
      current = { termino: squash(left), definicion: right, fuente: 'Glosario operativo para documentos fundantes (Contenedor 1, sección 16)' };
      entries.push(current);
    } else if (current) current.definicion = squash(`${current.definicion} ${right}`);
  }
  return entries;
}

const dictionary = parseDictionary(anexoC.lines);
if (dictionary.length < 200) fail(`el diccionario trae solo ${dictionary.length} términos; revisa el formato del Anexo C`);
const known = new Set(dictionary.map((e) => normalize(e.termino)));
const extra = operativo ? parseOperationalTable(operativo.lines).filter((e) => !known.has(normalize(e.termino))) : [];
const glosario = [...dictionary, ...extra].sort((a, b) => a.termino.localeCompare(b.termino, 'es'));

// ── Pasajes: párrafos agrupados hasta MAX_PASSAGE caracteres, con su título ──

function chunk(title, text, fuente) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) =>
      p
        .split('\n')
        .filter((l) => !isRule(l))
        .join('\n')
        .trim(),
    )
    .filter(Boolean);
  const out = [];
  let buffer = '';
  const flush = () => {
    if (buffer.trim()) out.push({ fuente, titulo: title, texto: buffer.trim() });
    buffer = '';
  };
  for (const p of paragraphs) {
    if (buffer && buffer.length + p.length + 2 > MAX_PASSAGE) flush();
    if (p.length > MAX_PASSAGE) {
      for (let i = 0; i < p.length; i += MAX_PASSAGE) {
        buffer = p.slice(i, i + MAX_PASSAGE);
        flush();
      }
    } else buffer = buffer ? `${buffer}\n\n${p}` : p;
  }
  flush();
  return out;
}

const pasajes = [];
for (const s of c1Sections) {
  if (/^ANEXO C/i.test(s.title)) continue; // El diccionario va en el glosario.
  pasajes.push(...chunk(`Contenedor 1 · ${s.title}`, s.lines.join('\n'), 'Contenedor 1 · Marco institucional estable'));
}

/** Títulos en mayúsculas de los textos del Contenedor 2 («MARCO METODOLÓGICO…», «FASE 1 — …»). */
function isHeading(line) {
  const t = line.trim();
  if (t.length < 5 || t.length > 90 || (/^[|\-#•·(\d]/.test(t) && !/^\d{1,2}\.\s+[A-ZÁÉÍÓÚÑ]/.test(t))) return false;
  const letters = t.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, '');
  if (letters.length < 4) return false;
  const upper = letters.replace(/[^A-ZÁÉÍÓÚÑ]/g, '').length;
  return upper / letters.length >= 0.75;
}

const c2Dir = path.join(REPO, 'CONTENEDOR_2');
if (!existsSync(c2Dir)) fail('no existe CONTENEDOR_2');
const c2Files = readdirSync(c2Dir)
  .filter((f) => /\.(txt|md)$/i.test(f))
  .sort();
const fuentes = [{ archivo: c1Rel, uso: 'Glosario (Anexo C y sección 16) y Parte I', hash: fingerprint(c1.slice(start, end)) }];
for (const file of c2Files) {
  const text = read(`CONTENEDOR_2/${file}`);
  fuentes.push({ archivo: `CONTENEDOR_2/${file}`, uso: 'Contenedor 2 completo', hash: fingerprint(text) });
  const label = `Contenedor 2 · ${file.replace(/\.(txt|md)$/i, '').replace(/_/g, ' ')}`;
  let title = label;
  let body = [];
  const flush = () => {
    if (body.join('').trim()) pasajes.push(...chunk(title, body.join('\n'), label));
    body = [];
  };
  for (const line of text.split('\n')) {
    if (isHeading(line)) {
      flush();
      title = `${label} · ${squash(line)}`;
    } else body.push(line);
  }
  flush();
}

const banco = {
  descripcion:
    'Banco de información de ZOE: glosario del metalenguaje unadista, marco institucional del Contenedor 1 (incluye MHUS 5.0) y Contenedor 2 completo. Es material de consulta, no instrucciones. Se genera con scripts/zoe/construir-banco-unadista.mjs: no editar a mano.',
  fuentes,
  glosario,
  pasajes,
};

const json = `${JSON.stringify(banco, null, 1)}\n`;
// Git en Windows puede guardar el archivo con CRLF: se compara sin los finales de línea.
const previous = existsSync(OUT) ? readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n') : '';
if (previous !== json) writeFileSync(OUT, json);
console.log(
  `✓ Banco unadista de ZOE: ${glosario.length} términos (${dictionary.length} del diccionario), ${pasajes.length} pasajes, ${Math.round(json.length / 1024)} KB${previous === json ? ' (sin cambios)' : ''}.`,
);
