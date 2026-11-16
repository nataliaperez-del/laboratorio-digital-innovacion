/**
 * Pase del Laboratorio: lo entrega el servidor al ingresar con Google y lo piden el concentrador de
 * datos, la IA y el Radar (encabezado X-Lab-Token). Sin pase válido el servidor no responde.
 * También dice si el servidor reconoce a la cuenta como administradora: ese dato lo decide el servidor,
 * el navegador no tiene lista de administradores.
 */

const PASS_KEY = 'lab-pase';
/** Aviso a la aplicación de que el servidor rechazó el pase: hay que volver a ingresar. */
export const PASS_REJECTED_EVENT = 'lab-pase-rechazado';

export interface LabPass {
  token: string;
  /** Segundos epoch. */
  expira: number;
  admin: boolean;
}

function readStored(): LabPass | null {
  try {
    const raw = localStorage.getItem(PASS_KEY);
    return raw ? (JSON.parse(raw) as LabPass) : null;
  } catch {
    return null;
  }
}

/** El pase guardado, si todavía sirve (con un minuto de margen). */
export function currentPass(): LabPass | null {
  const pass = readStored();
  return pass && pass.token && pass.expira * 1000 > Date.now() + 60_000 ? pass : null;
}

/** Había un pase y ya venció: la persona debe ingresar de nuevo. */
export function passExpired(): boolean {
  const pass = readStored();
  return Boolean(pass && pass.token && pass.expira * 1000 <= Date.now() + 60_000);
}

export function storePass(pass: LabPass): void {
  try {
    localStorage.setItem(PASS_KEY, JSON.stringify({ token: pass.token, expira: pass.expira, admin: pass.admin === true }));
  } catch {
    /* Sin espacio: el Laboratorio sigue, sin concentrar esta visita. */
  }
}

export function clearPass(): void {
  try {
    localStorage.removeItem(PASS_KEY);
  } catch {
    /* Nada que borrar. */
  }
}

/** Encabezado con el pase, para las solicitudes que el servidor protege. Vacío si no hay pase. */
export function labAuthHeaders(): Record<string, string> {
  const pass = currentPass();
  return pass ? { 'X-Lab-Token': pass.token } : {};
}

/** El servidor rechazó el pase (venció o no es válido): se olvida y se avisa para pedir el ingreso otra vez. */
export function reportPassRejected(): void {
  clearPass();
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(PASS_REJECTED_EVENT));
}
