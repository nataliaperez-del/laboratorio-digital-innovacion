/**
 * Única puerta de entrada al núcleo REPOSITORIO_CIP_DF.
 *
 * Nadie fuera de este módulo lee rutas de `/REPOSITORIO_CIP_DF/` directamente. El núcleo
 * vive dentro del repositorio (servido desde `public/`) y se carga bajo demanda por
 * `fetch` estático: cero llamadas a Google Drive. El orden de los recursos y qué versión
 * está vigente los decide el manifiesto sellado (`scripts/sellar-repositorio.mjs`).
 */
import { REPO_BASE_URL, REPO_GRUPOS, REPO_MANIFEST_URL } from '@/constants/repositorio';
import type { GrupoRepositorio, Manifest, RecursoMeta, TipoRecurso } from '@/repositorio/tipos';

/** Un recurso del núcleo metodológico con su texto. */
export type Recurso = { meta: RecursoMeta; texto: string };

let manifestCache: Manifest | null = null;
let manifestPromesa: Promise<Manifest> | null = null;
const recursoCache = new Map<string, string>();

/** Carga (y cachea) el manifiesto sellado. Reintentos concurrentes comparten la promesa. */
export function cargarManifest(): Promise<Manifest> {
  if (manifestCache) return Promise.resolve(manifestCache);
  if (manifestPromesa) return manifestPromesa;
  manifestPromesa = (async () => {
    const res = await fetch(REPO_MANIFEST_URL, { cache: 'no-cache' });
    if (!res.ok) {
      throw new Error(`No se pudo leer el manifiesto del núcleo (${REPO_MANIFEST_URL}, HTTP ${res.status}). ` + `Ejecuta «npm run sellar» para regenerarlo.`);
    }
    const manifest = (await res.json()) as Manifest;
    manifestCache = manifest;
    return manifest;
  })();
  try {
    return manifestPromesa;
  } finally {
    // Si falla, permite reintentar en la próxima llamada.
    manifestPromesa.catch(() => {
      manifestPromesa = null;
    });
  }
}

/** Metadatos de recursos según filtro. Requiere el manifiesto ya cargado (usa `cargarManifest` antes). */
export function listarRecursos(filtro?: { grupo?: GrupoRepositorio; tipo?: TipoRecurso; soloVigentes?: boolean }): RecursoMeta[] {
  if (!manifestCache) {
    throw new Error('El manifiesto del núcleo no está cargado. Llama a cargarManifest() antes de listarRecursos().');
  }
  const soloVigentes = filtro?.soloVigentes ?? true;
  const grupos = filtro?.grupo ? [filtro.grupo] : (REPO_GRUPOS as readonly GrupoRepositorio[]);
  const out: RecursoMeta[] = [];
  for (const g of grupos) {
    for (const r of manifestCache.grupos[g] ?? []) {
      if (soloVigentes && !r.vigente) continue;
      if (filtro?.tipo && r.tipo !== filtro.tipo) continue;
      out.push(r);
    }
  }
  return out;
}

function urlDeRuta(ruta: string): string {
  return encodeURI(`${REPO_BASE_URL}/${ruta}`);
}

async function descargarRuta(ruta: string): Promise<string> {
  const cacheado = recursoCache.get(ruta);
  if (cacheado != null) return cacheado;
  const res = await fetch(urlDeRuta(ruta), { cache: 'no-cache' });
  if (!res.ok) {
    throw new Error(`No se pudo leer el recurso del núcleo «${ruta}» (HTTP ${res.status}).`);
  }
  const texto = await res.text();
  recursoCache.set(ruta, texto);
  return texto;
}

/** Contenido de un recurso por su id (p. ej. `generales.vocacion_cip`). Lanza si el id no existe. */
export async function cargarRecurso(id: string): Promise<string> {
  const manifest = await cargarManifest();
  const meta = (REPO_GRUPOS as readonly GrupoRepositorio[]).flatMap((g) => manifest.grupos[g] ?? []).find((r) => r.id === id);
  if (!meta) throw new Error(`Recurso del núcleo no encontrado: «${id}».`);
  return descargarRuta(meta.ruta);
}

/** Todos los recursos vigentes de un grupo, en orden determinista. */
export async function cargarGrupo(grupo: GrupoRepositorio): Promise<Recurso[]> {
  await cargarManifest();
  const metas = listarRecursos({ grupo, soloVigentes: true });
  const recursos = await Promise.all(metas.map(async (meta) => ({ meta, texto: await descargarRuta(meta.ruta) })));
  return recursos;
}

/** Texto concatenado (en orden) de todos los recursos vigentes de un grupo. */
export async function cargarTextoGrupo(grupo: GrupoRepositorio): Promise<string> {
  const recursos = await cargarGrupo(grupo);
  return recursos
    .map((r) => r.texto.trim())
    .filter(Boolean)
    .join('\n\n');
}

/** Texto del recurso vigente de una familia dentro de un grupo (o null si no está). */
export async function cargarTextoFamilia(grupo: GrupoRepositorio, familia: string): Promise<string | null> {
  await cargarManifest();
  const meta = listarRecursos({ grupo, soloVigentes: true }).find((r) => r.familia === familia);
  if (!meta) return null;
  return descargarRuta(meta.ruta);
}

/** Versión del manifiesto (para trazabilidad). Requiere el manifiesto ya cargado. */
export function versionRepositorio(): string {
  return manifestCache?.version ?? '';
}

/** Manifiesto ya cargado en memoria (o null). Útil para metadatos de procedencia sin volver a pedir. */
export function manifestActual(): Manifest | null {
  return manifestCache;
}
