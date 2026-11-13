/**
 * Prueba el concentrador de datos de Hostinger (`hostinger_deploy/includes/lab.php`) de verdad: levanta
 * el servidor de desarrollo de PHP con una base de datos SQLite temporal y le hace solicitudes.
 * Si este equipo no tiene PHP, la prueba se salta.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const hasPhp = (() => {
  try {
    const probe = spawnSync('php', ['-r', 'echo extension_loaded("pdo_sqlite") ? "si" : "no";'], { encoding: 'utf8' });
    return probe.status === 0 && probe.stdout.trim() === 'si';
  } catch {
    return false;
  }
})();

const PORT = 8137;
const BASE = `http://127.0.0.1:${PORT}/api/lab`;
let server: ChildProcess | undefined;
let folder = '';

async function call(route: string, init: { method?: string; token?: string; body?: unknown; origin?: string } = {}) {
  const response = await fetch(`${BASE}/${route}`, {
    method: init.method ?? (init.body !== undefined ? 'POST' : 'GET'),
    headers: { ...(init.token ? { 'X-Lab-Token': init.token } : {}), ...(init.origin ? { Origin: init.origin } : {}), 'Content-Type': 'application/json' },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  return { status: response.status, data: (await response.json()) as Record<string, any> };
}

const signIn = async (email: string, name = '') => (await call('sesion', { body: { access_token: `prueba:${email}`, nombre: name, consentimiento: true } })).data;

describe.skipIf(!hasPhp)('concentrador de datos (PHP)', () => {
  let user = '';
  let admin = '';

  beforeAll(async () => {
    folder = mkdtempSync(path.join(tmpdir(), 'lab-prueba-'));
    server = spawn('php', ['-S', `127.0.0.1:${PORT}`, 'scripts/pruebas/router-php.php'], {
      env: { ...process.env, LAB_PRUEBA: '1', LAB_SQLITE: path.join(folder, 'lab.sqlite'), LAB_ADMINISTRADORES: 'admin@unad.edu.co', LAB_DOMINIOS: 'unad.edu.co' },
      stdio: 'ignore',
    });
    for (let i = 0; i < 50; i++) {
      try {
        await fetch(`${BASE}/nada`);
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    user = (await signIn('ana@unad.edu.co', 'Ana Pérez')).token;
    admin = (await signIn('admin@unad.edu.co', 'Administración')).token;
  }, 20_000);

  afterAll(() => {
    server?.kill();
    try {
      rmSync(folder, { recursive: true, force: true });
    } catch {
      /* Windows puede tardar en soltar el archivo. */
    }
  });

  it('solo entrega el pase a cuentas del dominio institucional', async () => {
    expect(user).toMatch(/^[\w-]+\.[\w-]+$/);
    const outsider = await call('sesion', { body: { access_token: 'prueba:alguien@gmail.com' } });
    expect(outsider.status).toBe(403);
    expect((await call('sesion', { body: {} })).status).toBe(400);
    // Un token cualquiera se consulta con Google de verdad: no es el modo de prueba.
    expect((await signIn('ana@unad.edu.co')).admin).toBe(false);
    expect((await signIn('admin@unad.edu.co')).admin).toBe(true);
  });

  it('no acepta datos sin pase, con un pase alterado ni desde otro sitio', async () => {
    expect((await call('eventos', { body: { eventos: [] } })).status).toBe(401);
    expect((await call('eventos', { token: `${user}x`, body: { eventos: [] } })).status).toBe(401);
    expect((await call('eventos', { token: user, origin: 'https://otro.sitio', body: { eventos: [] } })).status).toBe(403);
  });

  it('guarda los eventos una sola vez aunque lleguen repetidos y descarta los desconocidos', async () => {
    const eventos = [
      { id: 'e1', tipo: 'generacion', modulo: 'estudio', at: '2026-11-13T10:00:00Z', datos: { ok: true, segundos: 120 } },
      { id: 'e2', tipo: 'generacion', modulo: 'estudio', at: '2026-11-13T10:05:00Z', datos: { ok: false } },
      { id: 'e3', tipo: 'encuesta', modulo: 'estudio', at: '2026-11-13T10:06:00Z', datos: { utilidad: 5, facilidad: 4, recomendacion: 9, format: 'pdf' } },
      { id: 'e4', tipo: 'descarga', modulo: 'estudio', at: '2026-11-13T10:07:00Z', datos: { format: 'word' } },
      { id: 'e5', tipo: 'zoe', at: '2026-11-13T10:08:00Z', datos: { cantidad: 7 } },
      { id: 'e6', tipo: 'inventado' },
    ];
    expect((await call('eventos', { token: user, body: { eventos } })).data.recibidos).toBe(5);
    await call('eventos', { token: user, body: { eventos } });
    const board = (await call('tablero', { token: admin })).data;
    expect(board.uso[0]).toEqual({ modulo: 'estudio', ok: 1, fallidas: 1, segundosPromedio: 120 });
    expect(board.encuestas).toHaveLength(1);
    expect(board.descargas).toHaveLength(1);
    expect(board.zoe).toBe(7);
    expect((await call('eventos', { token: user, body: { eventos: Array.from({ length: 101 }, (_, i) => ({ id: `x${i}`, tipo: 'zoe' })) } })).status).toBe(413);
  });

  it('guarda un resultado con tildes, lo actualiza sin duplicarlo y reemplaza sus insumos', async () => {
    const resultado = {
      id: 'study-1',
      modulo: 'estudio',
      titulo: 'Estudio Territorial de Duitama',
      departamento: 'Boyacá',
      municipio: 'Duitama',
      zona: 'ZCB',
      creadoEn: '2026-11-13T10:00:00Z',
      resumen: { sections: [{ status: 'ok' }] },
      documento: { containerData: '# Estudio de Boyacá', prompt0Data: { municipality: 'Duitama' } },
      sintesis: 'Diagnóstico productivo de Duitama.',
      origenInsumos: 'ia',
      insumos: [
        { tipo: 'oportunidad', titulo: 'Fruta deshidratada', descripcion: 'Mercado de snacks saludables.', relevancia: 5, palabrasClave: ['fruta', 'snacks'] },
        { tipo: 'brecha', titulo: 'Poca asociatividad', descripcion: 'Productores dispersos.', relevancia: 3 },
        { tipo: 'inventado', titulo: 'No entra', descripcion: 'Tipo desconocido.' },
      ],
    };
    const first = (await call('resultado', { token: user, body: resultado })).data;
    expect(first).toEqual({ guardado: true, nuevo: true, insumos: 2 });
    const second = (await call('resultado', { token: user, body: { ...resultado, titulo: 'Estudio de Duitama (corregido)', insumos: [resultado.insumos[0]] } })).data;
    expect(second).toEqual({ guardado: true, nuevo: false, insumos: 1 });

    const list = (await call('resultados?q=Duitama', { token: admin })).data;
    expect(list.total).toBe(1);
    expect(list.resultados[0]).toMatchObject({ titulo: 'Estudio de Duitama (corregido)', departamento: 'Boyacá', autor: 'Ana Pérez', correo: 'ana@unad.edu.co' });
    const full = (await call(`resultado?id=${list.resultados[0].id}`, { token: admin })).data;
    expect(full.documento.containerData).toBe('# Estudio de Boyacá');
    expect(full.sintesis).toBe('Diagnóstico productivo de Duitama.');

    const board = (await call('tablero', { token: admin })).data;
    expect(board.totales.estudio).toBe(1);
    expect(board.resultados.estudio[0]).toMatchObject({ id: 'study-1', municipio: 'Duitama', resumen: { sections: [{ status: 'ok' }] } });
    expect(board.usuarios).toMatchObject({ total: 2, conConsentimiento: 2 });
    expect(board.insumos).toBe(1);
  });

  it('el banco de insumos no dice quién hizo cada pieza y se puede buscar', async () => {
    const bank = (await call('insumos?q=snacks', { token: admin })).data;
    expect(bank.total).toBe(1);
    expect(bank.insumos[0]).toMatchObject({ tipo: 'oportunidad', titulo: 'Fruta deshidratada', municipio: 'Duitama', relevancia: 5, palabrasClave: ['fruta', 'snacks'], origen: 'ia' });
    expect(JSON.stringify(bank)).not.toMatch(/ana@unad|Ana Pérez/);
    expect((await call('insumos?tipo=brecha', { token: admin })).data.total).toBe(0);
  });

  it('los datos de todos son solo para administradores', async () => {
    for (const route of ['tablero', 'resultados', 'resultado?id=1', 'insumos']) expect((await call(route, { token: user })).status, route).toBe(403);
    expect((await call('no-existe', { token: admin })).status).toBe(404);
  });
});
