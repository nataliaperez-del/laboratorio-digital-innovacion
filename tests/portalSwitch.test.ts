import { describe, expect, it } from 'vitest';
import { ACCESS_COOKIE, decidePortal, HIDDEN_PAGE } from '../server/portalSwitch';

const KEY = 'clave-de-prueba-larga-123';
const SITE = 'https://ejemplo.test';

describe('interruptor del portal en Vercel', () => {
  it('queda oculto si la variable falta o tiene otro valor', () => {
    expect(decidePortal(`${SITE}/`, null, {}).kind).toBe('oculto');
    expect(decidePortal(`${SITE}/`, null, { PORTAL_ESTADO: 'oculto', PORTAL_CLAVE: KEY }).kind).toBe('oculto');
    expect(decidePortal(`${SITE}/api/unad-gemini`, null, { PORTAL_ESTADO: 'si' }).kind).toBe('oculto');
  });

  it('se abre a todos con PORTAL_ESTADO=activo', () => {
    expect(decidePortal(`${SITE}/`, null, { PORTAL_ESTADO: 'activo' }).kind).toBe('pasar');
    expect(decidePortal(`${SITE}/`, null, { PORTAL_ESTADO: ' Activo ' }).kind).toBe('pasar');
  });

  it('el equipo entra con la clave y la dirección queda limpia', () => {
    const decision = decidePortal(`${SITE}/?acceso=${KEY}&x=1#/estudio`, null, { PORTAL_CLAVE: KEY });
    expect(decision.kind).toBe('autorizar');
    if (decision.kind !== 'autorizar') return;
    expect(decision.location).toBe('/?x=1');
    expect(decision.cookie).toContain(`${ACCESS_COOKIE}=${KEY}`);
    expect(decision.cookie).toMatch(/HttpOnly; Secure/);
  });

  it('con la cookie de acceso pasa; con una clave equivocada no', () => {
    expect(decidePortal(`${SITE}/assets/x.js`, `otra=1; ${ACCESS_COOKIE}=${KEY}`, { PORTAL_CLAVE: KEY }).kind).toBe('pasar');
    expect(decidePortal(`${SITE}/`, `${ACCESS_COOKIE}=equivocada`, { PORTAL_CLAVE: KEY }).kind).toBe('oculto');
    expect(decidePortal(`${SITE}/?acceso=equivocada`, null, { PORTAL_CLAVE: KEY }).kind).toBe('oculto');
  });

  it('sin clave, o con una demasiado corta, nadie entra mientras esté oculto', () => {
    expect(decidePortal(`${SITE}/?acceso=`, `${ACCESS_COOKIE}=`, {}).kind).toBe('oculto');
    expect(decidePortal(`${SITE}/?acceso=abc`, null, { PORTAL_CLAVE: 'abc' }).kind).toBe('oculto');
  });

  it('la página de oculto no identifica el proyecto', () => {
    expect(HIDDEN_PAGE).not.toMatch(/UNAD|ZOE|Laboratorio|InnovaHub/i);
    expect(HIDDEN_PAGE).toContain('noindex');
  });
});
