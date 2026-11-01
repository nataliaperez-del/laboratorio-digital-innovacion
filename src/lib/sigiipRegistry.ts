/**
 * Registro SIGIIP (Parte IV del Contenedor 1): 513 proyectos en bloques `PROYECTO n`
 * con campos `Campo: valor`.
 *
 * El registro vive al final del Contenedor 1 y el texto institucional se recorta por
 * el inicio (`slice(0, max)`), así que en la práctica nunca llegaba al modelo: por eso
 * las tablas de experiencias previas salían vacías o inventadas. Aquí se parsea, se
 * seleccionan los proyectos pertinentes (zona de la ficha + tema del Centro de Innovación) y se entrega
 * como bloque propio, ya tabulado, para que la IA transcriba nombres reales en lugar
 * de reconstruirlos.
 */

import { UNAD_ESCUELA_BY_SIGLA } from '@/constants/unadEscuelas';

export interface SigiipProject {
  /** Número de bloque en el registro (`PROYECTO 12`). */
  index: number;
  name: string;
  code: string;
  type: string;
  /** Investigador responsable: es el único participante que publica el registro. */
  responsible: string;
  startDate: string;
  endDate: string;
  status: string;
  zone: string;
  call: string;
  callStatus: string;
  /**
   * Campos opcionales: el registro público no los trae, pero la Parte IV del
   * Contenedor 1 puede enriquecerse con ellos (ver `PROPUESTA_FORMATO_REGISTRO_SIGIIP.md`).
   * Cuando llegan, se transcriben; cuando no, el apartado 6 los marca como no disponibles.
   */
  school: string;
  group: string;
  groupCategory: string;
  lines: string;
  researchers: string;
  municipality: string;
  /** Escuelas del proyecto: el campo `Escuela` si viene, o las siglas del código. */
  escuelas: string[];
}

/** De la sigla más larga a la más corta: `ECAPMA` contiene `ECAP`, y varios códigos traen dos escuelas. */
const SIGLAS_BY_LENGTH = Object.keys(UNAD_ESCUELA_BY_SIGLA).sort((a, b) => b.length - a.length);

/** Campos de texto que trae cada bloque; `index` y `escuelas` se derivan, no se leen. */
type SigiipTextField = Exclude<keyof SigiipProject, 'index' | 'escuelas'>;

const FIELD_LABELS: Record<string, SigiipTextField> = {
  'nombre del proyecto': 'name',
  'código del proyecto': 'code',
  'codigo del proyecto': 'code',
  'tipo de proyecto': 'type',
  responsable: 'responsible',
  'fecha de inicio': 'startDate',
  'fecha de finalización': 'endDate',
  'fecha de finalizacion': 'endDate',
  'estado del proyecto': 'status',
  zona: 'zone',
  convocatoria: 'call',
  'estado en la convocatoria': 'callStatus',
  escuela: 'school',
  escuelas: 'school',
  'grupo de investigación': 'group',
  'grupo de investigacion': 'group',
  'categoría del grupo': 'groupCategory',
  'categoria del grupo': 'groupCategory',
  'líneas de investigación': 'lines',
  'lineas de investigacion': 'lines',
  'número de investigadores': 'researchers',
  'numero de investigadores': 'researchers',
  municipio: 'municipality',
};

/** Marcas de "sin dato" que el registro puede traer en un campo opcional. */
const EMPTY_MARKERS = /^(no disponible[^|]*|n\/?a|sin dato[^|]*|-{1,3}|0)$/i;

function optional(value: string | undefined): string {
  const clean = value?.trim() ?? '';
  return EMPTY_MARKERS.test(clean) ? '' : clean;
}

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

function escuelasFromCode(code: string): string[] {
  const upper = normalize(code).replace(/ /g, '');
  const found: string[] = [];
  for (const sigla of SIGLAS_BY_LENGTH) {
    const nombre = UNAD_ESCUELA_BY_SIGLA[sigla];
    if (upper.includes(sigla) && !found.includes(nombre)) found.push(nombre);
  }
  return found;
}

/**
 * Aísla la Parte IV del Contenedor 1. Se acepta cualquier encabezado que mencione el
 * registro; si no aparece, se devuelve el texto completo para que el parser busque
 * los bloques `PROYECTO n` donde estén.
 */
function isolateRegistrySection(contenedor1: string): string {
  const marker = contenedor1.match(
    /(?:REGISTRO INTEGRAL DE LOS[^\n]*PROYECTOS SIGIIP|REGISTRO[^\n]*SIGIIP|LISTADO[^\n]*(?:SIGIIP|INVESTIGACI[ÓO]N|PROYECTOS)|PROYECTOS DE INVESTIGACI[ÓO]N|<<<\s*INICIO_LISTADO_SIGIIP\s*>>>)/i,
  );
  const from = marker?.index != null ? marker.index : 0;
  const rest = contenedor1.slice(from);
  const end = rest.match(/<<<\s*FIN_LISTADO_SIGIIP\s*>>>/i);
  return end?.index != null ? rest.slice(0, end.index) : rest;
}

/** Convierte el registro en objetos; ignora bloques sin nombre de proyecto. */
export function parseSigiipRegistry(contenedor1Text: string): SigiipProject[] {
  if (!contenedor1Text.trim()) return [];
  const section = isolateRegistrySection(contenedor1Text);
  const lines = section.split(/\r?\n/);

  const projects: SigiipProject[] = [];
  let current: Partial<SigiipProject> | null = null;
  let lastField: SigiipTextField | null = null;

  const flush = () => {
    if (current?.name?.trim()) {
      const school = optional(current.school);
      projects.push({
        index: current.index ?? projects.length + 1,
        name: current.name.trim(),
        code: current.code?.trim() || '',
        type: current.type?.trim() || '',
        responsible: current.responsible?.trim() || '',
        startDate: current.startDate?.trim() || '',
        endDate: current.endDate?.trim() || '',
        status: current.status?.trim() || '',
        zone: current.zone?.trim() || '',
        call: current.call?.trim() || '',
        callStatus: current.callStatus?.trim() || '',
        school,
        group: optional(current.group),
        groupCategory: optional(current.groupCategory),
        lines: optional(current.lines),
        researchers: optional(current.researchers),
        municipality: optional(current.municipality),
        escuelas: school
          ? school
              .split(/\s*(?:·|;|\||\/)\s*/)
              .map((s) => s.trim())
              .filter(Boolean)
          : escuelasFromCode(current.code || ''),
      });
    }
    current = null;
    lastField = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    // Tolerante a variantes: "PROYECTO 1", "PROYECTO No. 1", "PROYECTO N° 1", "PROYECTO #1"
    // y "PROYECTO 1: Título del proyecto" (el título tras el número se toma como nombre).
    const header = line.match(/^PROYECTO\s*(?:N[°ºo]\.?\s*|#\s*)?(\d{1,4})\s*[:.)\-–]?\s*(.*)$/i);
    if (header) {
      flush();
      current = { index: Number(header[1]) };
      const trailing = header[2]?.trim();
      if (trailing) current.name = trailing;
      continue;
    }
    if (!current) continue;
    if (/^-{5,}$/.test(line)) {
      flush();
      continue;
    }

    const field = line.match(/^([^:]{3,45}):\s*(.*)$/);
    const key = field ? FIELD_LABELS[field[1].trim().toLowerCase()] : undefined;
    if (field && key) {
      current[key] = field[2].trim();
      lastField = key;
      continue;
    }
    // Continuación de un nombre o una convocatoria que ocupó más de una línea.
    if (line && lastField) {
      current[lastField] = `${current[lastField] ?? ''} ${line}`.trim();
    }
  }
  flush();

  return projects;
}

const STOPWORDS = new Set(
  [
    'para',
    'como',
    'desde',
    'entre',
    'sobre',
    'mediante',
    'del',
    'las',
    'los',
    'una',
    'unos',
    'unas',
    'con',
    'por',
    'que',
    'sus',
    'este',
    'esta',
    'estos',
    'estas',
    'proyecto',
    'proyectos',
    'zona',
    'unad',
    'centro',
    'nacional',
    'colombia',
    'universidad',
    'municipio',
    'departamento',
    'innovacion',
    'productividad',
    'desarrollo',
    'fortalecimiento',
    'estrategia',
    'estrategias',
    'analisis',
    'diseno',
    'modelo',
    'proceso',
    'procesos',
    'general',
    'nueva',
    'nuevo',
  ].map((w) => w.toUpperCase()),
);

/** Palabras significativas de un texto (tema del Centro de Innovación, ficha) para puntuar pertinencia. */
export function keywordsFromText(text: string, limit = 30): string[] {
  const counts = new Map<string, number>();
  for (const token of normalize(text).split(' ')) {
    if (token.length < 5 || STOPWORDS.has(token)) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w);
}

/**
 * Nombre y sigla de una zona. La ficha ofrece «Zona Centro Sur (ZCSUR)» y el registro
 * escribe «Zona Centro Sur (Zcsur)», pero no siempre coinciden: la ficha dice ZCBC
 * donde el registro dice Zcbog, y el registro escribe «Amazonia y Orinoquia» donde la
 * ficha escribe «Amazonía Orinoquía». Se comparan las dos claves por separado.
 */
function zoneKeys(zone: string): { name: string; sigla: string } {
  // La sigla se toma antes de normalizar: `normalize` borra los paréntesis.
  const sigla = normalize(zone.match(/\(([^)]+)\)/)?.[1] ?? '').replace(/ /g, '');
  const name = normalize(zone.replace(/\([^)]*\)/g, ' '))
    .replace(/^ZONA /, '')
    .split(' ')
    .filter((t) => t && t !== 'Y')
    .join(' ');
  return { name, sigla };
}

/**
 * Comparación por igualdad exacta de nombre o de sigla, nunca por inclusión: «Zona Sur»
 * está contenida en «Zona Centro Sur» y con inclusión se mezclarían dos zonas distintas.
 */
function zoneMatches(projectZone: string, fichaZone: string): boolean {
  const p = zoneKeys(projectZone);
  const f = zoneKeys(fichaZone);
  if (!p.name && !p.sigla) return false;
  if (f.name && p.name && f.name === p.name) return true;
  return Boolean(f.sigla && p.sigla && f.sigla === p.sigla);
}

function themeScore(project: SigiipProject, keywords: readonly string[]): number {
  if (!keywords.length) return 0;
  const haystack = `${normalize(project.name)} ${normalize(project.type)}`;
  let score = 0;
  for (const k of keywords) if (haystack.includes(k)) score++;
  return score;
}

export interface SigiipSelection {
  /** Proyectos elegidos, en el orden de prioridad del apartado 6. */
  selected: SigiipProject[];
  total: number;
  zoneTotal: number;
  /** Conteos reales del registro, para las figuras de datos. */
  byZone: Array<{ label: string; value: number }>;
  byType: Array<{ label: string; value: number }>;
  byEscuela: Array<{ label: string; value: number }>;
}

function countBy(projects: readonly SigiipProject[], pick: (p: SigiipProject) => string[]): Array<{ label: string; value: number }> {
  const counts = new Map<string, number>();
  for (const p of projects) {
    for (const label of pick(p)) {
      if (!label) continue;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
}

/**
 * Orden de selección del apartado 6: zona + tema → otras zonas + tema →
 * zona sin coincidencia temática (capacidades transferibles) → trayectoria general.
 */
export function selectSigiipProjects(
  projects: readonly SigiipProject[],
  fichaZone: string,
  themeText: string,
  limit = 30,
): SigiipSelection {
  const keywords = keywordsFromText(themeText);
  const scored = projects.map((p) => ({
    p,
    inZone: zoneMatches(p.zone, fichaZone),
    score: themeScore(p, keywords),
  }));

  const byPriority = [
    scored.filter((s) => s.inZone && s.score > 0).sort((a, b) => b.score - a.score),
    scored.filter((s) => !s.inZone && s.score > 0).sort((a, b) => b.score - a.score),
    scored.filter((s) => s.inZone && s.score === 0),
    scored.filter((s) => !s.inZone && s.score === 0),
  ];

  const selected: SigiipProject[] = [];
  for (const group of byPriority) {
    for (const { p } of group) {
      if (selected.length >= limit) break;
      selected.push(p);
    }
  }

  return {
    selected,
    total: projects.length,
    zoneTotal: scored.filter((s) => s.inZone).length,
    byZone: countBy(projects, (p) => [p.zone]),
    byType: countBy(projects, (p) => [p.type]),
    byEscuela: countBy(projects, (p) => p.escuelas),
  };
}

/**
 * Proyectos que se envían al modelo: 10 a 12 proyectos estratégicos priorizados
 * permiten una matriz ejecutiva densa, rigurosa y cohesionada sin desbordar el apartado
 * ni exceder el tope institucional de 60 páginas; se puede ajustar con `VITE_MAX_SIGIIP_PROJECTS`.
 */
export function getSigiipProjectLimit(): number {
  const raw = import.meta.env.VITE_MAX_SIGIIP_PROJECTS?.trim();
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 3) return Math.min(Math.floor(n), 60);
  }
  return 12;
}

function cell(value: string): string {
  const clean = value.replace(/\s+/g, ' ').replace(/\|/g, '/').trim();
  return clean || 'No disponible en la fuente consultada';
}

function escuelasCell(p: SigiipProject): string {
  if (!p.escuelas.length) return 'No disponible en la fuente consultada';
  return p.escuelas.join(' · ');
}

/**
 * Bloque para el prompt: tabla con los proyectos seleccionados más los conteos reales
 * del registro. Declara explícitamente qué campos **no** existen en la fuente, para que
 * el modelo los marque en lugar de inventarlos.
 */
export function buildSigiipPromptBlock(selection: SigiipSelection, fichaZone: string): string {
  if (!selection.selected.length) return '';

  // Columnas opcionales: solo se piden al modelo si el registro las trae de verdad.
  const extras = (
    [
      ['Grupo de investigación', (p: SigiipProject) => p.group],
      ['Categoría del grupo', (p: SigiipProject) => p.groupCategory],
      ['Líneas de investigación', (p: SigiipProject) => p.lines],
      ['N.º de investigadores', (p: SigiipProject) => p.researchers],
      ['Municipio', (p: SigiipProject) => p.municipality],
    ] as const
  ).filter(([, pick]) => selection.selected.some((p) => pick(p)));

  const explicitSchools = selection.selected.some((p) => p.school);
  const missingFields = [
    ...(extras.some(([label]) => label === 'Grupo de investigación') ? [] : ['grupo de investigación']),
    ...(extras.some(([label]) => label === 'Categoría del grupo') ? [] : ['categoría del grupo']),
    ...(extras.some(([label]) => label === 'Líneas de investigación') ? [] : ['líneas de investigación']),
    ...(extras.some(([label]) => label === 'N.º de investigadores') ? [] : ['número de investigadores']),
    'número de proyectos por grupo',
  ];

  const header = [
    'N.º',
    'Nombre del proyecto (textual)',
    'Código',
    'Tipo',
    'Responsable',
    explicitSchools ? 'Escuela' : 'Escuela (deducida del código)',
    'Zona',
    'Estado',
    'Convocatoria',
    ...extras.map(([label]) => label),
  ];

  const rows = selection.selected
    .map((p) =>
      [
        String(p.index),
        cell(p.name),
        cell(p.code),
        cell(p.type),
        cell(p.responsible),
        escuelasCell(p),
        cell(p.zone),
        cell(p.status),
        cell(p.call),
        ...extras.map(([, pick]) => cell(pick(p))),
      ]
        .map((v) => ` ${v} `)
        .join('|'),
    )
    .map((row) => `|${row}|`)
    .join('\n');

  const zoneLine = fichaZone.trim()
    ? `Proyectos del registro que corresponden a la zona de la ficha (**${fichaZone.trim()}**): **${selection.zoneTotal}**.`
    : 'La ficha no trae zona UNAD: la selección se hizo solo por pertinencia temática.';

  const zoneCounts = selection.byZone.map((z) => `${z.label}: ${z.value}`).join(' · ');
  const typeCounts = selection.byType
    .slice(0, 8)
    .map((t) => `${t.label}: ${t.value}`)
    .join(' · ');

  return `
══════════════════════════════════════════════════
REGISTRO SIGIIP — PROYECTOS REALES (transcribir, no reconstruir)
══════════════════════════════════════════════════

Este bloque viene del registro oficial de proyectos que contiene el Contenedor 1. Total del registro: **${selection.total}** proyectos. ${zoneLine}
Abajo van los **${selection.selected.length}** proyectos seleccionados por zona y por pertinencia con el tema del Centro de Innovación, en ese orden de prioridad.

REGLAS DE USO OBLIGATORIAS DE ESTE BLOQUE
- El **nombre del proyecto** se transcribe **textualmente y entre comillas**, tal como aparece abajo: no lo resumas, no lo traduzcas, no lo reescribas ni le cambies la puntuación.
- Cada fila de tu matriz de experiencias debe traer, además del nombre textual, todas las columnas que aparecen abajo: el **investigador responsable** es el único participante que publica el registro.
- La **escuela** se escribe con su denominación completa, sin siglas${explicitSchools ? '' : '; en este bloque está deducida de las siglas del código del proyecto'}.
- Campos que el registro **no contiene**: ${missingFields.join(', ')}. Para esos campos escribe exactamente **"No disponible en la fuente consultada"** y añade la alerta de verificación humana. **Prohibido** inventarlos, estimarlos o deducirlos.
- No cites este bloque, el Contenedor 1 ni el listado como fuente: la fuente es el registro institucional de proyectos de investigación de la Universidad Nacional Abierta y a Distancia, citado como (Universidad Nacional Abierta y a Distancia, año del proyecto).

| ${header.join(' | ')} |
|${header.map(() => '---').join('|')}|
${rows}

Conteo real por zona en el registro completo: ${zoneCounts}.
Conteo real por tipo de proyecto (ocho más frecuentes): ${typeCounts}.
`.trim();
}
