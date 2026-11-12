/**
 * Prueba de carga de las páginas del Laboratorio: simula visitas simultáneas y mide tiempos y errores.
 *
 * Cada «visita» descarga lo que baja un navegador al entrar: la página y los archivos que ella
 * enlaza (código y estilos). Los archivos pesados (voz de ZOE, modelo 3D) solo se incluyen con
 * `--pesados`, porque cada descarga gasta ancho de banda real del plan de Vercel.
 *
 * Uso:
 *   node scripts/pruebas/carga-paginas.mjs                       # 10 y 50 visitas simultáneas
 *   node scripts/pruebas/carga-paginas.mjs --etapas 100,500,2000
 *   node scripts/pruebas/carga-paginas.mjs --url http://localhost:3000 --etapas 20
 *   node scripts/pruebas/carga-paginas.mjs --pesados --etapas 5   # incluye voz y modelo 3D
 *
 * Límite honesto: un solo computador no reproduce 7.000 personas reales (comparte una conexión y
 * una dirección IP, y Vercel puede frenar tanto tráfico desde un mismo origen). Sirve para ver
 * tendencia y errores hasta unos cientos o pocos miles; la cifra completa pide un servicio de
 * carga distribuida.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const BASE = option('url', 'https://laboratorio-digital-innovacion.vercel.app').replace(/\/$/, '');
const STAGES = option('etapas', '10,50')
  .split(',')
  .map((n) => Number(n.trim()))
  .filter((n) => n > 0);
const HEAVY = flag('pesados');
const TIMEOUT_MS = Number(option('espera', '30000'));
const HEAVY_ASSETS = ['/assets/zoe/voz-propia/zoe-raven-v4.onnx', '/assets/zoe/zoe.glb'];

/** Archivos que enlaza la página de entrada (código y estilos del mismo sitio). */
async function discoverAssets() {
  const html = await (await fetch(`${BASE}/`)).text();
  const found = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((m) => m[1]).filter((u) => u.startsWith('/') || u.startsWith('./'));
  return [...new Set(found.map((u) => u.replace(/^\./, '')))];
}

async function download(path) {
  const started = performance.now();
  try {
    const response = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { 'cache-control': 'no-cache' } });
    const bytes = (await response.arrayBuffer()).byteLength;
    return { ok: response.ok, status: response.status, ms: performance.now() - started, bytes };
  } catch (e) {
    return { ok: false, status: e?.name === 'TimeoutError' ? 'tiempo agotado' : 'sin conexión', ms: performance.now() - started, bytes: 0 };
  }
}

/** Una visita: la página y luego sus archivos en paralelo, como hace el navegador. */
async function visit(assets) {
  const started = performance.now();
  const page = await download('/');
  const rest = await Promise.all(assets.map(download));
  const all = [page, ...rest];
  return { ms: performance.now() - started, ok: all.every((r) => r.ok), firstByteMs: page.ms, requests: all };
}

const percentile = (sorted, p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] : 0);

async function runStage(concurrent, assets) {
  const started = performance.now();
  const visits = await Promise.all(Array.from({ length: concurrent }, () => visit(assets)));
  const seconds = (performance.now() - started) / 1000;
  const times = visits.map((v) => v.ms).sort((a, b) => a - b);
  const pageTimes = visits.map((v) => v.firstByteMs).sort((a, b) => a - b);
  const requests = visits.flatMap((v) => v.requests);
  const statuses = {};
  for (const r of requests) statuses[r.status] = (statuses[r.status] ?? 0) + 1;
  return {
    visitas: concurrent,
    fallidas: visits.filter((v) => !v.ok).length,
    porcentajeFallo: Math.round((visits.filter((v) => !v.ok).length / concurrent) * 1000) / 10,
    paginaP50ms: Math.round(percentile(pageTimes, 50)),
    paginaP95ms: Math.round(percentile(pageTimes, 95)),
    visitaP50ms: Math.round(percentile(times, 50)),
    visitaP95ms: Math.round(percentile(times, 95)),
    visitaMaxMs: Math.round(times.at(-1) ?? 0),
    solicitudes: requests.length,
    megabytes: Math.round((requests.reduce((sum, r) => sum + r.bytes, 0) / 1e6) * 10) / 10,
    segundos: Math.round(seconds * 10) / 10,
    respuestas: statuses,
  };
}

const assets = [...(await discoverAssets()), ...(HEAVY ? HEAVY_ASSETS : [])];
console.log(`Sitio: ${BASE}`);
console.log(`Cada visita descarga la página y ${assets.length} archivos${HEAVY ? ' (incluye voz y modelo 3D)' : ''}.`);
console.log(`Etapas (visitas simultáneas): ${STAGES.join(', ')}\n`);

const results = [];
for (const stage of STAGES) {
  process.stdout.write(`→ ${stage} visitas simultáneas… `);
  const result = await runStage(stage, assets);
  results.push(result);
  console.log(
    `${result.fallidas} fallidas (${result.porcentajeFallo} %), página p95 ${result.paginaP95ms} ms, visita completa p95 ${result.visitaP95ms} ms, ${result.megabytes} MB`,
  );
  // Si una etapa ya falla mucho, subir más solo confirma lo mismo y gasta ancho de banda.
  if (result.porcentajeFallo > 20) {
    console.log('  Más del 20 % de fallos: se detiene aquí. Este es el punto de quiebre desde este computador.');
    break;
  }
  await new Promise((r) => setTimeout(r, 3000));
}

console.table(results.map(({ respuestas, ...row }) => row));
mkdirSync('resultados-pruebas', { recursive: true });
const file = `resultados-pruebas/carga-paginas-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
writeFileSync(file, JSON.stringify({ sitio: BASE, pesados: HEAVY, archivosPorVisita: assets.length, etapas: results }, null, 2));
console.log(`Resultado guardado en ${file}`);
