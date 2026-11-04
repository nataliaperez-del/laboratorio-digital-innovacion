/**
 * Las manos de ZOE: lee los campos y botones que hay en pantalla y actúa sobre ellos mientras
 * conversa (escribir, elegir, marcar, presionar), como lo haría la persona. La IA solo ve una
 * lista corta con un id por control y devuelve acciones con esos ids; aquí se ejecutan sobre la
 * página real, con un resaltado para que se vea qué está haciendo.
 *
 * Nunca toca claves, archivos ni sus propios controles. Lo que borra o descarta algo (limpiar,
 * eliminar…) no se ejecuta sin una confirmación de viva voz: ver `isRisky`.
 */
import type { ToolId } from '@/components/layout/Header';
import { AI_MOVES, cleanZoeReply, type ZoeMove } from '@/lib/zoeContext';

/** Tipo de control de la pantalla que ZOE puede manejar. */
export type ZoeControlKind = 'texto' | 'lista' | 'casilla' | 'opcion' | 'boton';

/** Un control visible para la IA: id, tipo, etiqueta, valor y opciones. */
export interface ZoeControl {
  id: string;
  kind: ZoeControlKind;
  label: string;
  value?: string;
  options?: string[];
  optionCount?: number;
  disabled?: boolean;
}

/** Una acción que la IA pide: ir, escribir, elegir, marcar, presionar o hacer un movimiento de ZOE. */
export type ZoeAction =
  | { hacer: 'ir'; herramienta: ToolId }
  | { hacer: 'escribir'; id: string; texto: string }
  | { hacer: 'elegir'; id: string; opcion: string }
  | { hacer: 'marcar'; id: string; valor: boolean }
  | { hacer: 'presionar'; id: string }
  | { hacer: 'animar'; movimiento: ZoeMove };

/**
 * Lo que ZOE pone de su parte al actuar: cambiar de pantalla y, si se puede, caminar hasta el
 * control (`approach`) y moverse (`animate`). Sin cuerpo en pantalla basta con `navigate`.
 */
export interface ZoeHands {
  navigate: (tool: ToolId) => void;
  /** ZOE camina hasta el control y hace el gesto de presionarlo; resuelve cuando llegó. */
  approach?: (el: HTMLElement) => Promise<void>;
  /** Un movimiento pedido por la IA (sacudirse, sentarse, dar vueltas…). */
  animate?: (move: ZoeMove) => Promise<void> | void;
}

const handsOf = (hands: ZoeHands | ((tool: ToolId) => void)): ZoeHands => (typeof hands === 'function' ? { navigate: hands } : hands);

/** Respuesta de la IA: lo que dice, lo que hace y si le falta terminar en otra pantalla. */
export interface ZoeAgentReply {
  /** Lo que ZOE dice en voz alta. */
  decir: string;
  acciones: ZoeAction[];
  /** Tras estas acciones (por ejemplo, cambiar de pantalla) le falta terminar la tarea. */
  seguir: boolean;
}

const TOOLS: readonly ToolId[] = ['portal', 'radar', 'estudio', 'ideacion', 'arbol', 'prototipado', 'banco'];
const MAX_FIELDS = 40;
const MAX_BUTTONS = 50;
const MAX_OPTIONS = 30;

// ── Funciones puras (probadas en tests/zoeScreen.test.ts) ──

/** Para comparar lo dictado con lo escrito en pantalla: sin tildes, mayúsculas ni espacios de más. */
export function normalizeLabel(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** La opción de una lista que corresponde a lo dicho: exacta, luego por inicio, luego contenida. -1 si ninguna. */
export function bestOption(options: readonly string[], wanted: string): number {
  const w = normalizeLabel(wanted);
  if (!w) return -1;
  const norm = options.map(normalizeLabel);
  const exact = norm.indexOf(w);
  if (exact >= 0) return exact;
  const starts = norm.findIndex((o) => o.startsWith(w) || w.startsWith(o));
  if (starts >= 0) return starts;
  return norm.findIndex((o) => o.includes(w) || (o.length > 3 && w.includes(o)));
}

/** Botones que borran, limpian o descartan algo: ZOE pide permiso antes de presionarlos. */
export function isRisky(label: string): boolean {
  return /\b(limpiar|eliminar|borrar|descartar|quitar|reiniciar|restablecer|vaciar|cerrar sesi[oó]n|salir|cancelar)\b/i.test(normalizeLabel(label));
}

/** La lista que ve la IA: un control por línea, con su id, tipo, etiqueta y valor. */
export function describeControls(controls: readonly ZoeControl[]): string {
  if (!controls.length) return '(no hay campos ni botones en esta pantalla)';
  return controls
    .map((c) => {
      const parts = [c.id, c.kind, `«${c.label}»`];
      if (c.value !== undefined) parts.push(c.value ? `valor: «${c.value}»` : 'vacío');
      if (c.options?.length) {
        const more = (c.optionCount ?? c.options.length) - c.options.length;
        parts.push(`opciones: ${c.options.join(', ')}${more > 0 ? ` y ${more} más (di el nombre)` : ''}`);
      }
      if (c.disabled) parts.push('desactivado');
      return parts.join(' · ');
    })
    .join('\n');
}

function validAction(raw: unknown): ZoeAction | null {
  if (!raw || typeof raw !== 'object') return null;
  const a = raw as Record<string, unknown>;
  const id = typeof a.id === 'string' ? a.id.trim() : '';
  switch (a.hacer) {
    case 'ir':
      return TOOLS.includes(a.herramienta as ToolId) ? { hacer: 'ir', herramienta: a.herramienta as ToolId } : null;
    case 'escribir':
      return id && typeof a.texto === 'string' ? { hacer: 'escribir', id, texto: a.texto } : null;
    case 'elegir':
      return id && typeof a.opcion === 'string' ? { hacer: 'elegir', id, opcion: a.opcion } : null;
    case 'marcar':
      return id ? { hacer: 'marcar', id, valor: a.valor !== false } : null;
    case 'presionar':
      return id ? { hacer: 'presionar', id } : null;
    case 'animar': {
      const move = AI_MOVES[normalizeLabel(String(a.movimiento ?? ''))];
      return move ? { hacer: 'animar', movimiento: move } : null;
    }
    default:
      return null;
  }
}

/**
 * Lee la respuesta de la IA. Espera un objeto JSON {decir, acciones, seguir}; si llega texto
 * suelto, se dice tal cual y no se hace nada. Nunca deja que se lea JSON en voz alta.
 */
export function parseAgentReply(raw: string): ZoeAgentReply {
  const text = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      const data = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
      const decir = typeof data.decir === 'string' ? cleanZoeReply(data.decir) : '';
      const acciones = Array.isArray(data.acciones) ? data.acciones.map(validAction).filter((a): a is ZoeAction => a !== null) : [];
      return { decir, acciones, seguir: data.seguir === true && acciones.length > 0 };
    } catch {
      /* JSON roto: abajo se rescata lo que había que decir. */
    }
  }
  if (start >= 0 && /"decir"|"acciones"/.test(text)) {
    // JSON roto o cortado: se rescata al menos lo que había que decir, sin hacer nada.
    const said = text.match(/"decir"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    return { decir: said ? cleanZoeReply(said[1].replace(/\\"/g, '"').replace(/\\n/g, ' ')) : '', acciones: [], seguir: false };
  }
  return { decir: cleanZoeReply(text), acciones: [], seguir: false };
}

/** Resumen breve de lo que hizo, para la siguiente vuelta de la IA. */
export function describeAction(action: ZoeAction, label?: string): string {
  switch (action.hacer) {
    case 'ir':
      return `fuiste a la pantalla «${action.herramienta}»`;
    case 'escribir':
      return `escribiste «${action.texto}» en «${label ?? action.id}»`;
    case 'elegir':
      return `elegiste «${action.opcion}» en «${label ?? action.id}»`;
    case 'marcar':
      return `${action.valor ? 'marcaste' : 'desmarcaste'} «${label ?? action.id}»`;
    case 'presionar':
      return `presionaste «${label ?? action.id}»`;
    case 'animar':
      return `hiciste el movimiento «${Object.keys(AI_MOVES).find((k) => AI_MOVES[k] === action.movimiento) ?? action.movimiento}»`;
  }
}

// ── La página real ──

/** Controles de la última lectura, por id. */
const registry = new Map<string, { el: HTMLElement; control: ZoeControl }>();

const OFF_LIMITS = '.zoe-stage, .zoe-house, .lab-credits, header, [aria-label="Proveedor de IA"], [aria-hidden="true"], [hidden]';

const squash = (text: string | null | undefined, max = 80) => (text ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

function isVisible(el: HTMLElement): boolean {
  if (!el.getClientRects().length) return false;
  const style = getComputedStyle(el);
  return style.visibility !== 'hidden' && style.display !== 'none';
}

/** El nombre con que una persona llamaría al control. */
function labelOf(el: HTMLElement): string {
  const aria = el.getAttribute('aria-label');
  if (aria) return squash(aria);
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ');
    if (text.trim()) return squash(text);
  }
  const labels = (el as HTMLInputElement).labels;
  if (labels?.length) {
    // La etiqueta puede envolver al propio control: solo cuenta su texto.
    const text = squash(labels[0].textContent);
    if (text) return text;
  }
  if (el instanceof HTMLButtonElement || el.getAttribute('role') === 'button') {
    const text = squash(el.textContent);
    if (text) return text;
  }
  return squash(el.getAttribute('title') || el.getAttribute('placeholder') || el.closest('label')?.textContent || el.getAttribute('name') || '');
}

/** Lee la pantalla: campos primero, luego botones. Reemplaza la lectura anterior. */
export function readScreen(): ZoeControl[] {
  registry.clear();
  const roots = [document.querySelector('main'), ...Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]'))].filter(
    (root): root is HTMLElement => Boolean(root) && !root!.closest('.zoe-stage, .zoe-intro'),
  );
  const fields: Array<{ el: HTMLElement; control: Omit<ZoeControl, 'id'> }> = [];
  const buttons: Array<{ el: HTMLElement; control: Omit<ZoeControl, 'id'> }> = [];
  const seen = new Set<HTMLElement>();

  for (const root of roots) {
    for (const el of Array.from(root.querySelectorAll<HTMLElement>('input, textarea, select, button, [role="button"]'))) {
      if (seen.has(el) || el.closest(OFF_LIMITS) || !isVisible(el)) continue;
      seen.add(el);
      const label = labelOf(el);
      if (!label) continue;
      const disabled = (el as HTMLInputElement).disabled || el.getAttribute('aria-disabled') === 'true';
      if (el instanceof HTMLInputElement) {
        // Ni claves ni archivos: eso lo hace siempre la persona.
        if (['password', 'file', 'hidden', 'submit', 'image', 'reset'].includes(el.type)) continue;
        if (el.type === 'checkbox') fields.push({ el, control: { kind: 'casilla', label, value: el.checked ? 'marcada' : 'sin marcar', disabled } });
        else if (el.type === 'radio') fields.push({ el, control: { kind: 'opcion', label, value: el.checked ? 'elegida' : 'no elegida', disabled } });
        else fields.push({ el, control: { kind: 'texto', label, value: squash(el.value, 60), disabled } });
      } else if (el instanceof HTMLTextAreaElement) {
        fields.push({ el, control: { kind: 'texto', label, value: squash(el.value, 60), disabled } });
      } else if (el instanceof HTMLSelectElement) {
        const options = Array.from(el.options)
          .filter((o) => o.value !== '' && !o.disabled)
          .map((o) => squash(o.textContent, 40));
        fields.push({
          el,
          control: {
            kind: 'lista',
            label,
            value: squash(el.selectedOptions[0]?.textContent, 40),
            options: options.slice(0, MAX_OPTIONS),
            optionCount: options.length,
            disabled,
          },
        });
      } else {
        buttons.push({ el, control: { kind: 'boton', label, disabled } });
      }
    }
  }

  const controls: ZoeControl[] = [];
  fields.slice(0, MAX_FIELDS).forEach(({ el, control }, i) => {
    const full = { ...control, id: `c${i + 1}` };
    registry.set(full.id, { el, control: full });
    controls.push(full);
  });
  buttons.slice(0, MAX_BUTTONS).forEach(({ el, control }, i) => {
    const full = { ...control, id: `b${i + 1}` };
    registry.set(full.id, { el, control: full });
    controls.push(full);
  });
  return controls;
}

/** La etiqueta del control con ese id, según la última lectura. */
export function labelOfControl(id: string): string | undefined {
  return registry.get(id)?.control.label;
}

/** ¿Esta acción necesita confirmación de viva voz? */
export function needsConfirmation(action: ZoeAction): boolean {
  if (action.hacer !== 'presionar') return false;
  const label = labelOfControl(action.id);
  return label !== undefined && isRisky(label);
}

const pause = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Lleva el control a la vista y lo ilumina mientras ZOE actúa sobre él. */
async function spotlight(el: HTMLElement) {
  el.scrollIntoView({ block: 'center', behavior: reduceMotion() ? 'auto' : 'smooth' });
  el.classList.add('zoe-acting');
  window.setTimeout(() => el.classList.remove('zoe-acting'), 1600);
  await pause(reduceMotion() ? 50 : 380);
}

/**
 * React no se entera de un `value` asignado a mano: se usa el setter nativo y se avisa con el
 * evento que escucha (input para campos de texto, change para listas).
 */
function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string, event: 'input' | 'change') {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(el, value);
  el.dispatchEvent(new Event(event, { bubbles: true }));
}

/** Escribe de a poco, para que se vea a ZOE escribiendo (como máximo un segundo). */
async function typeInto(el: HTMLInputElement | HTMLTextAreaElement, text: string) {
  el.focus({ preventScroll: true });
  const steps = reduceMotion() ? 1 : Math.min(30, Math.max(1, Math.ceil(text.length / 3)));
  for (let i = 1; i <= steps; i++) {
    setNativeValue(el, text.slice(0, Math.round((text.length * i) / steps)), 'input');
    if (i < steps) await pause(30);
  }
}

/** Resultado de ejecutar una acción, con una nota para la conversación. */
export interface ActionResult {
  action: ZoeAction;
  ok: boolean;
  /** Para la siguiente vuelta de la IA o para explicar qué falló. */
  note: string;
}

/**
 * Ejecuta una acción sobre la página. Las que necesitan confirmación deben filtrarse antes.
 * `hands` puede ser solo la función de navegar o, con ZOE en pantalla, también sus pasos.
 */
export async function performAction(action: ZoeAction, hands: ZoeHands | ((tool: ToolId) => void)): Promise<ActionResult> {
  const { navigate, approach, animate } = handsOf(hands);
  if (action.hacer === 'ir') {
    navigate(action.herramienta);
    await pause(700); // Que la nueva pantalla alcance a dibujarse.
    return { action, ok: true, note: describeAction(action) };
  }
  if (action.hacer === 'animar') {
    await animate?.(action.movimiento);
    return { action, ok: true, note: describeAction(action) };
  }
  const entry = registry.get(action.id);
  const label = entry?.control.label;
  const el = entry?.el;
  if (!el || !el.isConnected) return { action, ok: false, note: `no encontraste el control ${action.id}` };
  if ((el as HTMLInputElement).disabled) return { action, ok: false, note: `«${label}» está desactivado` };

  await spotlight(el);
  // ZOE camina hasta el control y lo «toca» con el hocico antes de que pase algo.
  await approach?.(el);
  if (action.hacer === 'escribir') {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return { action, ok: false, note: `«${label}» no es un campo de texto` };
    await typeInto(el, action.texto);
  } else if (action.hacer === 'elegir') {
    if (!(el instanceof HTMLSelectElement)) return { action, ok: false, note: `«${label}» no es una lista` };
    const options = Array.from(el.options);
    const index = bestOption(
      options.map((o) => o.textContent ?? ''),
      action.opcion,
    );
    if (index < 0) return { action, ok: false, note: `«${action.opcion}» no está entre las opciones de «${label}»` };
    setNativeValue(el, options[index].value, 'change');
  } else if (action.hacer === 'marcar') {
    if (!(el instanceof HTMLInputElement)) return { action, ok: false, note: `«${label}» no se puede marcar` };
    if (el.type === 'radio' ? !el.checked : el.checked !== action.valor) el.click();
  } else {
    el.click();
  }
  return { action, ok: true, note: describeAction(action, label) };
}

/** Ejecuta varias acciones en orden, con un respiro entre una y otra para que se vean. */
export async function performActions(actions: readonly ZoeAction[], hands: ZoeHands | ((tool: ToolId) => void)): Promise<ActionResult[]> {
  const results: ActionResult[] = [];
  for (const action of actions) {
    results.push(await performAction(action, hands));
    await pause(reduceMotion() ? 60 : 260);
  }
  return results;
}

// ── Para el recorrido guiado: señalar y dejar ejemplos sin pisar el trabajo de la persona ──

/** Busca en la pantalla lo que ZOE va a señalar: un selector CSS o el texto visible de un botón. */
export function findOnScreen(target: { selector?: string; text?: RegExp }): HTMLElement | null {
  const main = document.querySelector('main') ?? document.body;
  if (target.selector) {
    const el = main.querySelector<HTMLElement>(target.selector);
    if (el && isVisible(el)) return el;
  }
  if (target.text) {
    const re = target.text;
    const hit = Array.from(main.querySelectorAll<HTMLElement>('button, [role="tab"], [role="button"], h1, h2, h3, label')).find(
      (el) => isVisible(el) && !el.closest(OFF_LIMITS) && re.test(squash(el.textContent, 200)),
    );
    if (hit) return hit;
  }
  return null;
}

/** Señala un elemento: lo trae a la vista, lo ilumina y ZOE se acerca. No lo toca. */
export async function pointAt(el: HTMLElement, approach?: ZoeHands['approach']): Promise<void> {
  await spotlight(el);
  await approach?.(el);
}

/**
 * Deja un valor de ejemplo en un campo o una lista, solo si está vacío: nunca pisa lo que la
 * persona escribió. Devuelve si lo llenó, si lo dejó como estaba o si el campo no está.
 */
export async function fillExample(el: HTMLElement | null, value: string, approach?: ZoeHands['approach']): Promise<'filled' | 'kept' | 'missing'> {
  if (!el || !el.isConnected || (el as HTMLInputElement).disabled) return 'missing';
  if (el instanceof HTMLSelectElement) {
    if (el.value) return 'kept';
    const options = Array.from(el.options);
    const index = bestOption(
      options.map((o) => o.textContent ?? ''),
      value,
    );
    if (index < 0) return 'missing';
    await pointAt(el, approach);
    setNativeValue(el, options[index].value, 'change');
    return 'filled';
  }
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    if (el.value.trim()) return 'kept';
    await pointAt(el, approach);
    await typeInto(el, value);
    return 'filled';
  }
  return 'missing';
}
