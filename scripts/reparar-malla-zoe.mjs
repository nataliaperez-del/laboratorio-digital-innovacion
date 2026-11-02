#!/usr/bin/env node
/**
 * Repara la malla de ZOE sin tocar esqueleto, animación ni textura: quita los triángulos
 * degenerados, las esquirlas sueltas y cierra los huecos que dejó el remallado de Meshy.
 * Solo cambian los índices. Conviene pasarlo varias veces: cada pasada cierra lo que la
 * anterior dejó al separar bordes cruzados.
 *
 *   node scripts/reparar-malla-zoe.mjs entrada.glb salida.glb [máx. triángulos de esquirla]
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error('Uso: node scripts/reparar-malla-zoe.mjs entrada.glb salida.glb');
  process.exit(1);
}
/** Huecos más grandes que esto son aberturas del modelo, no defectos: no se cierran. */
const MAX_LOOP_EDGES = 64;
/** Piezas sueltas con hasta estos triángulos se consideran esquirlas (0 las conserva). */
const MAX_ISLAND_TRIS = Number(process.argv[4] ?? 60);

const file = readFileSync(input);
const jsonLength = file.readUInt32LE(12);
const gltf = JSON.parse(file.subarray(20, 20 + jsonLength).toString());
const binStart = 20 + jsonLength + 8;
const binLength = file.readUInt32LE(20 + jsonLength);
const bin = file.subarray(binStart, binStart + binLength);

const SIZE = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 };
const COUNT = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

function readAccessor(index) {
  const accessor = gltf.accessors[index];
  const view = gltf.bufferViews[accessor.bufferView];
  const n = COUNT[accessor.type];
  const size = SIZE[accessor.componentType];
  const start = (view.byteOffset || 0) + (accessor.byteOffset || 0);
  const stride = view.byteStride || size * n;
  const out = new Array(accessor.count * n);
  for (let i = 0; i < accessor.count; i++) {
    for (let c = 0; c < n; c++) {
      const at = start + i * stride + c * size;
      out[i * n + c] =
        accessor.componentType === 5126 ? bin.readFloatLE(at) : accessor.componentType === 5125 ? bin.readUInt32LE(at) : accessor.componentType === 5123 ? bin.readUInt16LE(at) : bin[at];
    }
  }
  return out;
}

const primitive = gltf.meshes[0].primitives[0];
const positions = readAccessor(primitive.attributes.POSITION);
const uvs = readAccessor(primitive.attributes.TEXCOORD_0);
const indices = readAccessor(primitive.indices);
const vertexCount = positions.length / 3;

// Las costuras de la textura duplican vértices: se sueldan por posición para ver los bordes reales.
const welded = new Int32Array(vertexCount);
const rawOf = [];
const byPosition = new Map();
for (let i = 0; i < vertexCount; i++) {
  const key = `${positions[i * 3].toFixed(7)},${positions[i * 3 + 1].toFixed(7)},${positions[i * 3 + 2].toFixed(7)}`;
  if (!byPosition.has(key)) {
    byPosition.set(key, byPosition.size);
    rawOf.push([]);
  }
  welded[i] = byPosition.get(key);
  rawOf[welded[i]].push(i);
}
const point = (w) => {
  const i = rawOf[w][0];
  return [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]];
};

// Triángulos válidos y sin repetir.
const triangles = [];
const seenTris = new Set();
let removed = 0;
for (let t = 0; t < indices.length; t += 3) {
  const [a, b, c] = [indices[t], indices[t + 1], indices[t + 2]];
  const [wa, wb, wc] = [welded[a], welded[b], welded[c]];
  const key = [wa, wb, wc].sort((x, y) => x - y).join('_');
  if (wa === wb || wb === wc || wa === wc || seenTris.has(key)) {
    removed++;
    continue;
  }
  seenTris.add(key);
  triangles.push([a, b, c]);
}

// Esquirlas: piezas sueltas diminutas que el remallado dejó flotando alrededor del cuerpo.
if (MAX_ISLAND_TRIS > 0) {
  const parent = rawOf.map((_, i) => i);
  const find = (x) => {
    while (parent[x] !== x) x = parent[x] = parent[parent[x]];
    return x;
  };
  for (const tri of triangles) {
    const root = find(welded[tri[0]]);
    parent[find(welded[tri[1]])] = root;
    parent[find(welded[tri[2]])] = root;
  }
  const sizes = new Map();
  for (const tri of triangles) {
    const root = find(welded[tri[0]]);
    sizes.set(root, (sizes.get(root) || 0) + 1);
  }
  const before = triangles.length;
  const kept = triangles.filter((tri) => sizes.get(find(welded[tri[0]])) > MAX_ISLAND_TRIS);
  triangles.length = 0;
  triangles.push(...kept);
  console.log(`· ${before - kept.length} triángulos de esquirlas sueltas quitados.`);
}

// Bordes abiertos con dirección: el relleno los recorre al revés para conservar la orientación.
const directed = new Map();
for (const tri of triangles) {
  for (let e = 0; e < 3; e++) {
    const k = `${welded[tri[e]]}_${welded[tri[(e + 1) % 3]]}`;
    directed.set(k, (directed.get(k) || 0) + 1);
  }
}
const next = new Map(); // de → [a…], siguiendo el sentido del relleno
for (const key of directed.keys()) {
  const [a, b] = key.split('_').map(Number);
  if (directed.has(`${b}_${a}`)) continue;
  if (!next.has(b)) next.set(b, []);
  next.get(b).push(a);
}

const loops = [];
for (const start of [...next.keys()]) {
  while (next.get(start)?.length) {
    const path = [start];
    let current = next.get(start).pop();
    while (current !== start && path.length <= MAX_LOOP_EDGES * 2) {
      // Si el camino se cruza consigo mismo, se separa un lazo simple (bordes no manifold).
      const seen = path.indexOf(current);
      if (seen >= 0) {
        loops.push(path.splice(seen));
      }
      path.push(current);
      const options = next.get(current);
      if (!options?.length) break;
      current = options.pop();
    }
    if (current === start && path.length >= 3) loops.push(path);
  }
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Recorte de orejas sobre el plano del hueco. */
function triangulate(loop) {
  const pts = loop.map(point);
  let normal = [0, 0, 0];
  for (let i = 0; i < pts.length; i++) {
    const [p, q] = [pts[i], pts[(i + 1) % pts.length]];
    normal = [normal[0] + (p[1] - q[1]) * (p[2] + q[2]), normal[1] + (p[2] - q[2]) * (p[0] + q[0]), normal[2] + (p[0] - q[0]) * (p[1] + q[1])];
  }
  const out = [];
  const open = loop.map((_, i) => i);
  const inside = (p, a, b, c) => dot(cross(sub(b, a), sub(p, a)), normal) >= 0 && dot(cross(sub(c, b), sub(p, b)), normal) >= 0 && dot(cross(sub(a, c), sub(p, c)), normal) >= 0;
  let guard = open.length * open.length + 8;
  while (open.length > 3 && guard-- > 0) {
    let best = -1;
    for (let i = 0; i < open.length; i++) {
      const [ia, ib, ic] = [open[(i + open.length - 1) % open.length], open[i], open[(i + 1) % open.length]];
      if (dot(cross(sub(pts[ib], pts[ia]), sub(pts[ic], pts[ia])), normal) <= 0) continue;
      if (open.some((j) => j !== ia && j !== ib && j !== ic && inside(pts[j], pts[ia], pts[ib], pts[ic]))) continue;
      best = i;
      break;
    }
    if (best < 0) best = 0; // Hueco muy irregular: se cierra igual, con un corte simple.
    out.push([open[(best + open.length - 1) % open.length], open[best], open[(best + 1) % open.length]]);
    open.splice(best, 1);
  }
  if (open.length === 3) out.push([open[0], open[1], open[2]]);
  return out.map((tri) => tri.map((i) => loop[i]));
}

/** De las copias de un vértice en la costura, la de textura más cercana: el relleno no se estira. */
function rawNear(w, ref) {
  let best = rawOf[w][0];
  let bestDistance = Infinity;
  for (const i of rawOf[w]) {
    const d = (uvs[i * 2] - uvs[ref * 2]) ** 2 + (uvs[i * 2 + 1] - uvs[ref * 2 + 1]) ** 2;
    if (d < bestDistance) {
      bestDistance = d;
      best = i;
    }
  }
  return best;
}

let filled = 0;
let skipped = 0;
for (const loop of loops) {
  if (loop.length > MAX_LOOP_EDGES) {
    skipped++;
    continue;
  }
  const ref = rawOf[loop[0]][0];
  for (const tri of triangulate(loop)) {
    triangles.push(tri.map((w) => rawNear(w, ref)));
  }
  filled++;
}

// Solo se reemplazan los índices: el resto del binario queda idéntico.
const indexAccessor = gltf.accessors[primitive.indices];
const wide = vertexCount > 65535;
const newIndices = Buffer.alloc(triangles.length * 3 * (wide ? 4 : 2));
triangles.flat().forEach((v, i) => (wide ? newIndices.writeUInt32LE(v, i * 4) : newIndices.writeUInt16LE(v, i * 2)));
const padding = (4 - (bin.length % 4)) % 4;
const offset = bin.length + padding;
gltf.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: newIndices.length, target: 34963 });
indexAccessor.bufferView = gltf.bufferViews.length - 1;
indexAccessor.byteOffset = 0;
indexAccessor.count = triangles.length * 3;
indexAccessor.componentType = wide ? 5125 : 5123;
const newBin = Buffer.concat([bin, Buffer.alloc(padding), newIndices, Buffer.alloc((4 - (newIndices.length % 4)) % 4)]);
gltf.buffers[0].byteLength = newBin.length;

const json = Buffer.from(JSON.stringify(gltf));
const jsonPadded = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)]);
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + 8 + jsonPadded.length + 8 + newBin.length, 8);
const chunk = (data, type) => {
  const head = Buffer.alloc(8);
  head.writeUInt32LE(data.length, 0);
  head.writeUInt32LE(type, 4);
  return Buffer.concat([head, data]);
};
writeFileSync(output, Buffer.concat([header, chunk(jsonPadded, 0x4e4f534a), chunk(newBin, 0x004e4942)]));
console.log(`✓ ${removed} triángulos degenerados o repetidos quitados · ${filled} huecos cerrados · ${skipped} aberturas grandes conservadas.`);
