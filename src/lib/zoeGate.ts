/**
 * Compuerta de ruido de ZOE: decide, a partir del volumen del micrófono en decibelios y de la
 * sensibilidad elegida, cuándo hay una voz y cuándo solo ruido de fondo.
 *
 * Funciona así:
 *  - El volumen (RMS 0–1) se pasa a dBFS: 0 dB es el máximo; el silencio ronda −60 dB o menos.
 *  - Se aprende el «piso de ruido» del lugar: baja rápido cuando se calla y sube muy despacio, y se
 *    congela mientras la compuerta está abierta (la voz no cuenta como piso).
 *  - También se aprende el «ambiente»: hasta dónde sube el sonido de fondo que va y viene (un televisor,
 *    gente conversando). Sube en un par de segundos y baja muy despacio, así las pausas del televisor no lo
 *    borran; una voz cercana arranca de golpe y lo supera antes de que el ambiente la alcance.
 *  - La compuerta se abre cuando el volumen supera el piso por un margen (más pequeño con sensibilidad
 *    alta, más grande con baja) de forma sostenida, y se cierra tras un rato por debajo (con histéresis).
 *
 * Es puro y sin navegador: se prueba con números.
 */

export type Sensitivity = 'alta' | 'media' | 'baja';

/** Decibelios por encima del piso de ruido que debe superar una voz para abrir la compuerta. */
export const GATE_MARGIN_DB: Record<Sensitivity, number> = { alta: 7, media: 11, baja: 16 };
/** Decibelios por encima del ambiente (televisor, voces de fondo) que debe superar una voz cercana. */
export const AMBIENT_MARGIN_DB: Record<Sensitivity, number> = { alta: 3, media: 5, baja: 8 };
/** Si el ambiente supera al piso por esto, de fondo hay sonido que va y viene: un televisor, otra conversación. */
export const BUSY_ROOM_DB = 10;
/** Margen extra para interrumpir a ZOE mientras habla: su propia voz puede colarse al micrófono. */
export const BARGE_IN_EXTRA_DB = 7;
/** Por debajo de este nivel nunca se abre: es el cero digital del micrófono. */
export const GATE_FLOOR_DB = -54;
/** Piso de ruido (dBFS) a partir del cual el lugar es demasiado ruidoso para hablar con comodidad. */
export const NOISY_FLOOR_DB = -38;
/** Un volumen medio por encima de esto, aunque el piso sea bajo, también se considera mucho ruido. */
export const LOUD_ROOM_DB = -34;

export const SENSITIVITIES: Sensitivity[] = ['alta', 'media', 'baja'];
export const SENSITIVITY_LABEL: Record<Sensitivity, string> = { alta: 'Alta', media: 'Media', baja: 'Baja' };

export function isSensitivity(value: unknown): value is Sensitivity {
  return value === 'alta' || value === 'media' || value === 'baja';
}

/** Volumen RMS (0–1) a decibelios relativos al máximo (dBFS). */
export function toDb(rms: number): number {
  return 20 * Math.log10(Math.max(rms, 1e-6));
}

export interface GateReading {
  /** Volumen actual en dBFS. */
  db: number;
  /** Piso de ruido aprendido en dBFS. */
  floorDb: number;
  /** Hasta dónde sube el sonido de fondo que va y viene, en dBFS. */
  ambientDb: number;
  /** ¿De fondo hay un televisor u otras voces? */
  busy: boolean;
  /** Nivel que hay que superar para abrir la compuerta, en dBFS. */
  gateDb: number;
  /** ¿Hay una voz ahora mismo? */
  open: boolean;
  /** ¿Se abrió alguna vez desde el último `reset`? */
  everOpened: boolean;
}

export interface GateOptions {
  sensitivity?: Sensitivity;
  /** Margen adicional sobre el de la sensibilidad (p. ej. para interrumpir a ZOE). */
  extraDb?: number;
  /** Tiempo sostenido sobre el nivel de apertura para abrir. */
  attackMs?: number;
  /** Tiempo por debajo del nivel de cierre para cerrar. */
  releaseMs?: number;
  /** Tiempo inicial en que solo se aprende el piso y no se abre. */
  calibrationMs?: number;
}

/** Una voz que lleva abierta la compuerta más que esto sin una sola pausa empieza a contar como ambiente: nadie le habla a ZOE tanto de corrido, un televisor sí. */
const OPEN_LEARN_AFTER_MS = 5000;
/** Tras este silencio seguido, el ambiente aprendido se olvida rápido: ya no hay televisor. */
const QUIET_FORGET_MS = 2500;
/** Histéresis: se cierra 3 dB por debajo de donde se abrió, para que no parpadee en el límite. */
const HYSTERESIS_DB = 3;

export function createNoiseGate(options: GateOptions = {}) {
  let sensitivity: Sensitivity = options.sensitivity ?? 'media';
  let extraDb = options.extraDb ?? 0;
  const attackMs = options.attackMs ?? 100;
  const releaseMs = options.releaseMs ?? 600;
  const calibrationMs = options.calibrationMs ?? 400;

  let floorDb = -60;
  let ambientDb = -60;
  let elapsed = 0;
  let open = false;
  let everOpened = false;
  let aboveMs = 0;
  let belowMs = 0;
  let openMs = 0;
  let quietMs = 0;

  const gateAt = () => Math.max(GATE_FLOOR_DB, floorDb + GATE_MARGIN_DB[sensitivity] + extraDb, ambientDb + AMBIENT_MARGIN_DB[sensitivity] + extraDb);
  const busy = () => ambientDb - floorDb > BUSY_ROOM_DB && ambientDb > -48;

  return {
    /** Cambia la sensibilidad sobre la marcha. */
    setSensitivity(next: Sensitivity) {
      sensitivity = next;
    },
    /** Cambia el margen adicional sobre la marcha (p. ej. al entrar o salir del modo multitud). */
    setExtraDb(next: number) {
      extraDb = next;
    },
    reset() {
      floorDb = -60;
      ambientDb = -60;
      elapsed = 0;
      open = false;
      everOpened = false;
      aboveMs = 0;
      belowMs = 0;
      openMs = 0;
      quietMs = 0;
    },
    /** Una lectura: volumen RMS y milisegundos desde la anterior. */
    update(rms: number, dtMs: number): GateReading {
      const db = toDb(rms);
      elapsed += dtMs;

      if (elapsed <= calibrationMs) {
        // Calibración: el piso sigue al promedio de lo que se oye, sin abrir.
        floorDb = elapsed <= dtMs ? db : floorDb + (db - floorDb) * 0.4;
        ambientDb = floorDb;
      } else {
        const gate = gateAt();
        const closeAt = gate - HYSTERESIS_DB;
        if (!open) {
          aboveMs = db > gate ? aboveMs + dtMs : 0;
          if (aboveMs >= attackMs) {
            open = true;
            everOpened = true;
            belowMs = 0;
            openMs = 0;
          }
          // Con la compuerta cerrada el piso se aprende: baja rápido, sube despacio.
          floorDb += db < floorDb ? (db - floorDb) * 0.35 : (db - floorDb) * 0.02 * (dtMs / 80);
          // El ambiente sigue al sonido de fondo: sube en un par de segundos y baja muy despacio.
          quietMs = db < floorDb + 4 ? quietMs + dtMs : 0;
          ambientDb += (db - ambientDb) * (db > ambientDb ? 0.035 : quietMs > QUIET_FORGET_MS ? 0.08 : 0.01) * (dtMs / 80);
          if (ambientDb < floorDb) ambientDb = floorDb;
        } else {
          belowMs = db < closeAt ? belowMs + dtMs : 0;
          if (belowMs >= releaseMs) {
            open = false;
            aboveMs = 0;
          }
          // Abierta: el piso se congela (la voz no es ruido). El ambiente también, salvo que lleve abierta
          // demasiado tiempo sin pausa: eso es un televisor u otra conversación, y se aprende.
          openMs += dtMs;
          if (openMs > OPEN_LEARN_AFTER_MS && db > ambientDb) ambientDb += (db - ambientDb) * 0.025 * (dtMs / 80);
        }
      }
      return { db, floorDb, ambientDb, busy: busy(), gateDb: gateAt(), open, everOpened };
    },
  };
}

/** ¿El lugar es demasiado ruidoso para hablar? Piso alto sostenido, o la sala suena fuerte en promedio. */
export function isNoisyRoom(floorDb: number, averageDb?: number): boolean {
  return floorDb > NOISY_FLOOR_DB || (averageDb !== undefined && averageDb > LOUD_ROOM_DB);
}

/** Texto corto para mostrar el nivel: «−41 dB». */
export function formatDb(db: number): string {
  return `${Math.round(Math.max(-90, db))} dB`;
}

/** Pasos de la barra de nivel (0–1) a partir del volumen sobre el piso: lo que se ve «subir» al hablar. */
export function meterFraction(db: number, floorDb: number): number {
  return Math.max(0, Math.min(1, (db - floorDb) / 30));
}
