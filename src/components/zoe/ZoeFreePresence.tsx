import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Compass, Dog, Footprints, Globe, Heart, House, MessageSquare, Mic, Moon, Volume2, VolumeX, X } from 'lucide-react';
import type { ZoeSoulState, ZoeTrick } from './ZoeCanvas3D';
import { splitSentences, useZoeVoice, type ZoeListenFailure } from './useZoeVoice';
import { doghouseDoor, ZoeDoghouse } from './ZoeDoghouse';
import { ZoeChat, type ZoeChatMessage } from './ZoeChat';
import { splitBarks } from '@/lib/zoeBark';
import type { ToolId } from '../layout/Header';
import { askZoe, currentWork } from '@/services/zoeAi';
import {
  isConfirmation,
  isDoneReply,
  parseZoeCommand,
  seemsUnfinished,
  toolMentioned,
  TOOL_HINTS,
  TOOL_NAMES,
  wantsMoreTime,
  type ZoeMove,
  type ZoeTurn,
} from '@/lib/zoeContext';
import {
  checkBox,
  findOnScreen,
  isUsable,
  labelOfControl,
  needsConfirmation,
  performActions,
  pointAt,
  pressElement,
  setValue,
  type ZoeAction,
  type ZoeHands,
} from '@/lib/zoeScreen';
import { crisisReply, offlineAnswer } from '@/lib/zoeOffline';
import { APOLOGY_REPLY, isApology, respectReply } from '@/lib/zoeRespect';
import { assessHarmfulIntent, EthicsBlockedError } from '@/lib/ethicsGuard';
import {
  describeProgress,
  firstSentence,
  parseTourReply,
  readyQuestion,
  TOUR_END,
  TOUR_STEPS,
  TOUR_STOP,
  TOUR_WAIT,
  type TourContext,
  type TourGesture,
  type TourReply,
  type TourSnapshot,
} from '@/lib/zoeTour';
import { useStore } from '@/store/useStore';
import { parseThemeProposal } from '@/lib/themeProposal';
import type { TreeLevel } from '@/lib/innovationTreeGraph';
// El mismo documento que lee la IA es la memoria de ZOE cuando no hay conexión.
import MASTER_DOCUMENT from '@/content/zoe/documento-maestro.md?raw';

// El modelo 3D y Three.js pesan: se descargan aparte, sin demorar la herramienta que se abrió.
const ZoeCanvas3D = lazy(() => import('./ZoeCanvas3D'));

/** Tamaño de ZOE en pantalla; en celulares se reduce para dejarle el espacio al contenido. */
const stageSize = () => {
  if (typeof window === 'undefined') return { width: 260, height: 290 };
  // Celular en horizontal: la pantalla es baja, ZOE se encoge para no tapar todo.
  if (window.innerHeight < 520) return { width: 128, height: 144 };
  if (window.innerWidth < 380) return { width: 150, height: 168 };
  if (window.innerWidth < 768) return { width: 170, height: 190 };
  return { width: 260, height: 290 };
};
/** Se recalcula en cada uso: si se gira el celular o se cambia el tamaño de la ventana, ZOE se ajusta. */
const STAGE = {
  get width() {
    return stageSize().width;
  },
  get height() {
    return stageSize().height;
  },
};
const POSITION_KEY = 'innovahub_zoe_pos_v2';
/** Alto de la franja de la firma y la casita, abajo a la derecha. */
const CORNER_HEIGHT = 64;
/** Las patas de ZOE quedan casi al pie de su escenario. */
const FEET = 0.97;
/** Dónde queda el hocico cuando ZOE mira de lado: fracción del ancho y del alto del escenario. */
const SNOUT_X = 0.8;
const SNOUT_Y = 0.4;
const WALK_SPEED = 90; // píxeles por segundo; acorde al tamaño, para que las patas no parezcan patinar
const TROT_SPEED = 230;
/** Desde esta distancia va al trote: caminando, cruzar la pantalla tomaría demasiado. */
const TROT_FROM = 320;
/** Lo más que una acción espera a que ZOE llegue junto al control. */
const APPROACH_MAX_MS = 2500;
/** Lo que dura entrar o salir de la casita (coincide con la animación en index.css). */
const HOUSE_MS = 650;
/** Si no responde la IA en este tiempo, ZOE dice algo: el silencio es lo que rompe la conversación. */
const FILLER_AFTER_MS = 1500;
/** Cuando ZOE piensa dice «¡Woa, woa!»; nunca empieza con «mmm». */
const FILLERS = ['¡Woa, woa! Déjame pensarlo.', 'Woa, woa… a ver, a ver.', '¡Woa, woa! Buena pregunta.', 'Woa, woa, déjame olfatear eso.'];
/** Tras un fallo de la IA, durante este tiempo ZOE contesta de memoria sin hacer esperar a nadie. */
const AI_RETRY_MS = 60_000;
const AFTER_SPEECH_MS = 250;
/** Vueltas máximas de un mismo pedido (cambiar de pantalla y terminar allá cuenta como dos). */
const MAX_AGENT_ROUNDS = 3;
/** Lo que ZOE explica cuando no puede escuchar; cada causa tiene una solución distinta. */
const MIC_PROBLEMS: Partial<Record<ZoeListenFailure, string>> = {
  'sin-permiso': 'El navegador no me deja usar el micrófono. Dale permiso en el candadito de la barra de direcciones y me vuelves a tocar.',
  'sin-microfono': 'No encuentro un micrófono disponible. Revisa que esté conectado y que otra aplicación no lo esté usando.',
  'mic-mudo': 'No me llega ningún sonido de tu micrófono. Revisa que no esté silenciado y que el navegador use el correcto.',
  'sin-https': 'Para escucharte, esta página debe abrirse con una dirección segura, con h t t p s.',
  'sin-red': 'El servicio de voz del navegador no responde. Necesita internet, y funciona en Chrome o Edge.',
  error: 'No alcancé a escucharte: el reconocimiento de voz falló. Intentemos otra vez en un momento.',
  ruido: 'Escríbeme: hay mucho ruido y no puedo escucharte. Te respondo aquí mismo.',
};

/** Saludo de la primera conversación: sin afán, pregunta antes de avanzar. */
const GREETING = '¡Hola! Qué alegría verte. Estoy aquí contigo, sin prisa. ¿Todo listo para continuar?';
const READY_YES =
  '¡Qué bien! Cuéntame qué tienes en mente: puedo explicarte una herramienta, llevarte a una pantalla, hacer contigo el recorrido guiado o simplemente conversar un rato.';
const READY_NO = 'Sin ningún afán. Aquí me quedo contigo; cuando quieras me dices «listo» y seguimos.';
/** Se dice una vez cuando la IA no responde: sin alarma, con una alternativa. */
const OFFLINE_NOTICE = 'La IA se fue a dar un paseíto, pero no te preocupes: yo sigo aquí contigo con lo que sé de memoria.';

/** Lo que ZOE dice al hacer cada movimiento cuando se lo piden de viva voz. */
const MOVE_LINES: Record<ZoeMove, string[]> = {
  sit: ['Sentado, como todo un profesional.', 'Me siento y te pongo toda la atención.'],
  stand: ['¡Arriba! Listo para lo que venga.', 'De pie y con las orejas atentas.'],
  lie: ['Me echo un ratico, pero sigo escuchándote.', 'Echadito y cómodo. Aquí sigo contigo.'],
  sleep: ['Busco un rinconcito y me echo un rato. Tócame cuando quieras.'],
  walk: ['¡Vamos a estirar las patas!', 'Un paseíto para despejar la cabeza.'],
  come: ['¡Voy para allá!', '¡Aquí voy, a tu lado!'],
  move: ['Perdón, me hago a un lado.', 'Te dejo el espacio libre.'],
  home: ['Me voy a mi casita. Tócala cuando me necesites.'],
  shake: ['¡Sacudida holográfica!', 'Me sacudo las ideas viejas para que entren las nuevas.'],
  spin: ['¡A perseguir mi cola!', '¡Vueltas de pura alegría!'],
  jump: ['¡Hop!', '¡Un salto de emoción!'],
  wag: ['¡Mira cómo muevo la cola!', 'La cola no me deja mentir: estoy feliz.'],
  bow: ['Te hago una reverencia, como buen anfitrión.', '¡A tus órdenes, con reverencia y todo!'],
  still: ['Quieto como estatua.', 'Me quedo quieto aquí.'],
};

const pause = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const pickOne = (list: readonly string[]) => list[Math.floor(Math.random() * list.length)] ?? '';
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Busca dónde echarse: el tramo del piso de la página con menos botones y enlaces debajo. */
function findQuietSpot(currentX: number) {
  const y = clampPosition(0, window.innerHeight).y;
  const crowding = (x: number) => {
    let found = 0;
    for (const px of [0.25, 0.5, 0.75]) {
      for (const py of [0.5, 0.9]) {
        const under = document.elementsFromPoint(x + STAGE.width * px, y + STAGE.height * py).find((el) => !el.closest('.zoe-stage'));
        if (under?.closest('button, a, input, select, textarea, [role="button"], .lab-credits')) found += 1;
      }
    }
    return found;
  };
  const spots = Array.from({ length: 8 }, (_, i) => clampPosition(((window.innerWidth - STAGE.width) * i) / 7, y).x).filter(
    (x) => Math.abs(x - currentX) > 120,
  );
  const best = spots.map((x) => ({ x, score: crowding(x) + Math.random() })).sort((a, b) => a.score - b.score)[0];
  return { x: best?.x ?? currentX, y };
}

/** Dónde empieza, desde la izquierda, la esquina de la firma y la casita (abajo a la derecha). */
function cornerLeft() {
  const credits = document.querySelector('.lab-credits')?.getBoundingClientRect();
  // Antes de que la firma esté en pantalla, su ancho aproximado.
  return credits?.width ? credits.left : window.innerWidth - (window.innerWidth < 768 ? 280 : 360);
}

/**
 * Mantiene a ZOE en pantalla. En el piso no se para sobre la firma ni sobre la casita: se queda
 * a su izquierda y, si no cabe (celulares), un poco más arriba.
 */
function clampPosition(x: number, y: number) {
  let top = Math.max(4, Math.min(window.innerHeight - STAGE.height - 4, y));
  let maxX = window.innerWidth - STAGE.width - 48;
  if (top + STAGE.height * FEET > window.innerHeight - CORNER_HEIGHT) {
    const beside = cornerLeft() - 12 - STAGE.width * 0.8;
    if (beside >= 4) maxX = Math.min(maxX, beside);
    else top = Math.min(top, window.innerHeight - CORNER_HEIGHT - STAGE.height * FEET);
  }
  return { x: Math.max(4, Math.min(maxX, x)), y: Math.max(4, top) };
}

function initialPosition() {
  try {
    const saved = JSON.parse(localStorage.getItem(POSITION_KEY) ?? 'null');
    if (typeof saved?.x === 'number') return clampPosition(saved.x, saved.y);
  } catch {
    /* Posición guardada ilegible: se usa la de siempre. */
  }
  // Abajo a la derecha, junto a la firma y la casita (clampPosition no la deja encima de ellas).
  return clampPosition(window.innerWidth, window.innerHeight);
}

/**
 * Coloca el globo de subtítulos dentro de la pantalla. Prefiere alinearlo con el borde de ZOE que queda
 * hacia el centro, pero siempre lo mantiene entero a la vista: en un celular, 320 px de globo no caben
 * a un lado de ZOE, así que se corre lo necesario (8 px de margen).
 */
function captionInside(x: number): React.CSSProperties {
  const viewport = window.innerWidth;
  const width = Math.min(320, viewport - 24);
  const stageWidth = STAGE.width + 44;
  const wanted = x < viewport / 2 ? x : x + stageWidth - width;
  const left = Math.max(8, Math.min(viewport - 8 - width, wanted));
  return { left: left - x, right: 'auto', width };
}

/** Posición del escenario con las patas de ZOE frente a la puerta de su casita. */
function atTheDoor() {
  const door = doghouseDoor();
  return { x: door.x - STAGE.width / 2, y: door.y - STAGE.height * FEET };
}

/**
 * Espera a que el control deje de moverse (el desplazamiento suave tarda) y devuelve dónde quedó.
 * Se mide el tiempo real: en segundo plano el navegador estira cada espera a un segundo.
 */
async function settledRect(el: HTMLElement): Promise<DOMRect> {
  let rect = el.getBoundingClientRect();
  const until = performance.now() + 900;
  while (performance.now() < until) {
    await pause(70);
    const next = el.getBoundingClientRect();
    if (Math.abs(next.top - rect.top) < 1 && Math.abs(next.left - rect.left) < 1) return next;
    rect = next;
  }
  return rect;
}

/** El trabajo real, para que el recorrido narre el resultado que quedó en pantalla y nada más. */
function buildTourSnapshot(): TourSnapshot {
  const s = useStore.getState();
  const proposal = parseThemeProposal(s.themeProposalMarkdown);
  const chosen = proposal && s.selectedLabThemeIndex !== null ? proposal.themes[s.selectedLabThemeIndex] : undefined;
  const nodes = s.treeGraph?.nodos ?? [];
  const level = (l: TreeLevel) => nodes.filter((n) => n.nivel === l);
  const plan = s.prototypes.find((p) => p.id === s.activePrototypeId);
  return {
    study: {
      blocks: s.contenedor2Sections.length,
      issues: s.contenedor2Sections.filter((x) => x.status !== 'ok').length,
      municipality: s.prompt0Data.municipality || undefined,
    },
    ideation: {
      has: Boolean(s.themeProposalMarkdown.trim()),
      vocation: proposal ? firstSentence(proposal.vocationMarkdown) : undefined,
      themes: proposal?.themes.map((t) => t.title) ?? [],
      chosen: chosen?.title,
      chosenBody: chosen?.body,
    },
    tree: {
      has: Boolean(s.treeGraph),
      tema: s.treeGraph?.tema,
      global: level('global').length,
      nacional: level('nacional').length,
      territorial: level('territorial').length,
      hojas: level('hoja').length,
      frutos: level('fruto').map((n) => n.nombre),
    },
    prototype: {
      has: Boolean(plan),
      name: plan?.name,
      tagline: plan?.tagline,
      hypothesis: plan?.hypothesis,
      trl: plan?.trlTarget,
      weeks: plan?.durationWeeks,
      phases: plan?.phases.length ?? 0,
      // «Tiempo de biotransformación: alcanzar la maduración en ≤ 21 días…» se dice solo por su nombre.
      metrics: (plan?.validationMetrics ?? []).map((m) => (m.includes(':') ? m.split(':')[0] : firstSentence(m, 90)).trim()),
    },
    bank: { studies: s.savedStudies.length, ideations: s.savedIdeations.length, trees: s.savedTrees.length, prototypes: s.prototypes.length },
  };
}

/** Lo que dice la barra de avance de la herramienta («el bloque 3 de 12, …»), o null si no está generando. */
function progressNow(): string | null {
  for (const el of Array.from(document.querySelectorAll('main [role="status"]'))) {
    if (el.closest('.zoe-stage')) continue;
    const progress = describeProgress(el.textContent ?? '');
    if (progress) return progress;
  }
  return null;
}

/** Si el navegador no puede dibujar 3D, ZOE sigue presente con su imagen. */
class CanvasBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <img src="/assets/zoe/zoe_fallback.png" alt="" className="w-full h-full object-contain" /> : this.props.children;
  }
}

/** Pedido de otra pantalla: iniciar la conversación y, si trae texto, preguntarlo. */
export interface ZoeRequest {
  id: number;
  text?: string;
}

interface Props {
  currentTool: ToolId;
  onSelectTool: (tool: ToolId) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  request: ZoeRequest | null;
}

/** ZOE en la pantalla: vida propia, conversación por voz, órdenes, manos sobre la interfaz, recorrido guiado y casita. */
export const ZoeFreePresence: React.FC<Props> = ({ currentTool, onSelectTool, theme, onToggleTheme, isOpen, onToggleOpen, request }) => {
  const voice = useZoeVoice();
  const [behavior, setBehavior] = useState<ZoeSoulState>('idle');
  const [isWalking, setIsWalking] = useState(false);
  const [trotting, setTrotting] = useState(false);
  const [facing, setFacing] = useState<-1 | 0 | 1>(0);
  /** Hacia dónde sigue mirando al detenerse: junto a un botón mira al botón; si no, de frente. */
  const holdFacing = useRef<-1 | 0 | 1>(0);
  /** El viaje a la casita: ir, entrar y, al llamarla, salir. */
  const [homeTrip, setHomeTrip] = useState<'none' | 'going' | 'entering' | 'leaving'>('none');
  const [modelReady, setModelReady] = useState(false);
  /** Dónde estaba antes de irse a la casita: ahí vuelve al salir. */
  const returnSpot = useRef<{ x: number; y: number } | null>(null);
  const comingOut = useRef(false);
  const [posture, setPosture] = useState<'sitting' | 'standing' | 'lying'>('sitting');
  const postureRef = useRef(posture);
  postureRef.current = posture;
  const [napping, setNapping] = useState(false);
  const [show360, setShow360] = useState(false);
  const [petCounter, setPetCounter] = useState(0);
  const [trick, setTrick] = useState<{ name: ZoeTrick; id: number } | null>(null);

  /** Modo conversación: al terminar de hablar, ZOE vuelve a escuchar solo. */
  const [talking, setTalking] = useState(false);
  const talkingRef = useRef(false);
  talkingRef.current = talking;
  const historyRef = useRef<ZoeTurn[]>([]);
  /** Lo que la persona va diciendo mientras ZOE le confirma si ya terminó. */
  const pendingRef = useRef('');
  const askedDoneRef = useRef(false);
  /** ZOE preguntó «¿Todo listo para continuar?» y espera un sí o un no. */
  const readyAsked = useRef(false);
  /** Al terminar el recorrido, ZOE espera saber por qué herramienta empezar. */
  const awaitingRoute = useRef(false);
  /** Hasta cuándo se contesta de memoria tras un fallo de la IA. */
  const aiDownUntil = useRef(0);
  const offlineNoticed = useRef(false);
  const [caption, setCaption] = useState<string | null>(null);
  // Chat de texto: cuando hay ruido o falla el micrófono, se le escribe a ZOE; responde en texto y, si se quiere, en voz.
  const [chatOpen, setChatOpen] = useState(false);
  const chatOpenRef = useRef(false);
  const [chatVoice, setChatVoice] = useState(true);
  const chatVoiceRef = useRef(true);
  const [chatLog, setChatLog] = useState<ZoeChatMessage[]>([]);
  const chatSeq = useRef(0);
  const [heard, setHeard] = useState<string | null>(null);
  const silentTries = useRef(0);
  const captionTimer = useRef<number | undefined>(undefined);

  /** Recorrido guiado: en qué parada va y un contador para cancelar la parada en curso. */
  const tourRef = useRef<{ step: number } | null>(null);
  const tourRun = useRef(0);
  const [touring, setTouring] = useState(false);

  const [position, setPosition] = useState(initialPosition);
  const positionRef = useRef(position);
  positionRef.current = position;
  const drag = useRef<{ dx: number; dy: number; startX: number; startY: number; moved: boolean } | null>(null);
  const seenTools = useRef(new Set<ToolId>());
  const walkTarget = useRef<{ x: number; y: number } | null>(null);
  const speedRef = useRef(WALK_SPEED);
  const onArrive = useRef<(() => void) | null>(null);
  const routine = useRef(0);
  const levelRef = useRef<HTMLSpanElement>(null);
  const busyRef = useRef(false);
  busyRef.current = talking || napping || behavior !== 'idle' || homeTrip !== 'none';
  const toolRef = useRef(currentTool);
  toolRef.current = currentTool;

  // ── Rutinas: secuencias de caminar y descansar que cualquier toque interrumpe ──
  /**
   * Camina hasta un punto. `free`: sin los márgenes de siempre, para llegar hasta la puerta de la
   * casita. `speed`: para llegar rápido a un botón sin que la conversación espere.
   */
  const walkTo = useCallback((x: number, y: number, free = false, speed?: number) => {
    return new Promise<void>((resolve) => {
      walkTarget.current = free ? { x, y } : clampPosition(x, y);
      const { x: fromX, y: fromY } = positionRef.current;
      const trot = speed ? speed > WALK_SPEED * 1.5 : Math.hypot(walkTarget.current.x - fromX, walkTarget.current.y - fromY) > TROT_FROM;
      speedRef.current = speed ?? (trot ? TROT_SPEED : WALK_SPEED);
      setTrotting(trot);
      onArrive.current = resolve;
      setIsWalking(true);
    });
  }, []);

  const stopRoutine = useCallback(() => {
    routine.current += 1;
    walkTarget.current = null;
    setIsWalking(false);
    setNapping(false);
    setHomeTrip('none');
    const arrived = onArrive.current;
    onArrive.current = null;
    arrived?.();
  }, []);

  /** Lo despierta si estaba acostado; si no, solo corta lo que estuviera haciendo. */
  const wake = useCallback(() => {
    stopRoutine();
    setBehavior((b) => (b === 'sleeping' ? 'idle' : b));
    setPosture((p) => (p === 'lying' ? 'sitting' : p));
  }, [stopRoutine]);

  const playTrick = useCallback((name: ZoeTrick) => setTrick((prev) => ({ name, id: (prev?.id ?? 0) + 1 })), []);

  /** Deja de mirar al botón y vuelve a mirar de frente. */
  const releaseFacing = useCallback(() => {
    holdFacing.current = 0;
    setFacing(0);
  }, []);

  /** Se levanta, busca un sitio olfateando, da unas vueltas, se echa y duerme un momento. */
  const nap = useCallback(async () => {
    stopRoutine();
    const id = routine.current;
    const alive = () => id === routine.current;
    setNapping(true);
    setBehavior('idle');
    setPosture('standing');
    await pause(900);
    if (!alive()) return;
    const from = positionRef.current;
    const spot = findQuietSpot(from.x);
    await walkTo((from.x + spot.x) / 2, (from.y + spot.y) / 2);
    if (!alive()) return;
    setPetCounter((n) => n + 1); // El olfateo.
    await pause(1500);
    if (!alive()) return;
    await walkTo(spot.x, spot.y);
    if (!alive()) return;
    // Como todo perro, da un par de pasos sobre el sitio antes de echarse.
    const side = spot.x > window.innerWidth / 2 ? -1 : 1;
    await walkTo(spot.x + side * 34, spot.y);
    if (!alive()) return;
    await walkTo(spot.x, spot.y);
    if (!alive()) return;
    setPosture('lying');
    await pause(2200);
    if (!alive()) return;
    setBehavior('sleeping');
    await pause(30000 + Math.random() * 25000);
    if (!alive()) return;
    setBehavior('idle');
    await pause(1200);
    if (!alive()) return;
    setPosture('sitting');
    setNapping(false);
  }, [stopRoutine, walkTo]);

  /** Camina hasta otro punto del piso y se queda ahí, casi siempre sentado. */
  const stroll = useCallback(async () => {
    stopRoutine();
    const id = routine.current;
    const { x, y } = positionRef.current;
    const span = Math.max(240, window.innerWidth * 0.3) * (0.5 + Math.random() * 0.5);
    setPosture('standing');
    await walkTo(x + (x > window.innerWidth / 2 ? -span : span), y);
    if (id === routine.current) setPosture(Math.random() < 0.7 ? 'sitting' : 'standing');
  }, [stopRoutine, walkTo]);

  /** «Ven»: llega al frente y al centro de la pantalla, se sienta y mueve la cola. */
  const comeHere = useCallback(async () => {
    wake();
    const id = routine.current;
    releaseFacing();
    setPosture('standing');
    await walkTo((window.innerWidth - STAGE.width) / 2, clampPosition(0, window.innerHeight).y);
    if (id !== routine.current) return;
    setPosture('sitting');
    playTrick('wag');
  }, [playTrick, releaseFacing, wake, walkTo]);

  /** «Muévete»: se va al tramo del piso donde menos estorba. */
  const stepAside = useCallback(async () => {
    wake();
    const id = routine.current;
    releaseFacing();
    setPosture('standing');
    const spot = findQuietSpot(positionRef.current.x);
    await walkTo(spot.x, spot.y);
    if (id === routine.current) setPosture('sitting');
  }, [releaseFacing, wake, walkTo]);

  /** Camina (o trota) hasta su casita y entra: en pantalla queda solo la casita. */
  const goHome = useCallback(async () => {
    stopRoutine();
    const id = routine.current;
    const alive = () => id === routine.current;
    returnSpot.current = positionRef.current;
    releaseFacing();
    setBehavior('idle');
    setPosture('standing');
    setHomeTrip('going');
    await pause(500);
    if (!alive()) return;
    const door = atTheDoor();
    await walkTo(door.x, door.y, true);
    if (!alive()) return;
    setHomeTrip('entering');
    await pause(HOUSE_MS);
    if (!alive()) return;
    setHomeTrip('none');
    setPosture('sitting');
    onToggleOpen();
  }, [onToggleOpen, releaseFacing, stopRoutine, walkTo]);

  /** Tocar la casita: ZOE sale y vuelve a donde estaba. */
  const comeOut = () => {
    comingOut.current = true;
    onToggleOpen();
  };

  /**
   * Antes de tocar un control, ZOE camina hasta él, lo mira y le da un toque con el hocico.
   * En celulares o con movimiento reducido solo se ilumina el control: ZOE no cruza la pantalla.
   */
  const approach = useCallback(
    async (el: HTMLElement) => {
      if (window.innerWidth < 768 || reduceMotion() || homeTrip !== 'none') return;
      const rect = await settledRect(el);
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      // Control a la derecha: ZOE llega por su izquierda mirando a la derecha, y al revés.
      const dir: -1 | 1 = rect.left + rect.width / 2 > window.innerWidth / 2 ? 1 : -1;
      const x = dir === 1 ? rect.left - STAGE.width * SNOUT_X + 8 : rect.right - STAGE.width * (1 - SNOUT_X) - 8;
      const target = clampPosition(x, rect.top + rect.height / 2 - STAGE.height * SNOUT_Y);
      wake();
      setPosture('standing');
      holdFacing.current = dir;
      const { x: fromX, y: fromY } = positionRef.current;
      const distance = Math.hypot(target.x - fromX, target.y - fromY);
      // Nunca se hace esperar a la acción: si el paso se demora (pestaña en segundo plano), ZOE termina de llegar mientras actúa.
      if (distance > 24) await Promise.race([walkTo(target.x, target.y, false, Math.max(TROT_SPEED, distance / 1.4)), pause(APPROACH_MAX_MS)]);
      setFacing(dir);
      playTrick('boop');
      await pause(420);
    },
    [homeTrip, playTrick, wake, walkTo],
  );

  const showCaption = useCallback((text: string, ms?: number) => {
    window.clearTimeout(captionTimer.current);
    setCaption(text);
    if (ms) captionTimer.current = window.setTimeout(() => setCaption(null), ms);
  }, []);

  // ── La conversación: escuchar → pensar → hablar → volver a escuchar ──
  const listenRef = useRef<() => void>(() => undefined);

  /** Al terminar de hablar: si la conversación sigue abierta, vuelve a escuchar. */
  const afterSpeech = useCallback((keepListening: boolean) => {
    setBehavior('idle');
    // Con el chat abierto no se vuelve a abrir el micrófono: se está escribiendo.
    if (keepListening && talkingRef.current && !chatOpenRef.current) {
      // Un respiro antes de abrir el micrófono: que no se oiga a sí mismo.
      window.setTimeout(() => {
        if (talkingRef.current) listenRef.current();
      }, AFTER_SPEECH_MS);
    } else window.setTimeout(() => setCaption(null), 2500);
  }, []);

  /** Dice algo y avisa cuando termina; si otra locución la interrumpe, no avisa. */
  const logChat = useCallback((from: ZoeChatMessage['from'], text: string) => {
    chatSeq.current += 1;
    setChatLog((log) => [...log, { id: chatSeq.current, from, text }].slice(-60));
  }, []);

  const sayAndWait = useCallback(
    (text: string) =>
      new Promise<void>((resolve) => {
        setBehavior('speaking');
        setHeard(null);
        const written = splitBarks(text).rest || '¡Guau!';
        setCaption(splitSentences(written)[0] ?? written);
        if (chatOpenRef.current) {
          // En el chat la respuesta queda escrita; la voz es opcional.
          logChat('zoe', written);
          if (!chatVoiceRef.current) {
            window.setTimeout(resolve, Math.min(3500, 500 + text.length * 20));
            return;
          }
        }
        voice.speak(text, resolve, setCaption);
      }),
    [logChat, voice],
  );

  /** Dice algo y, si la conversación sigue abierta, vuelve a escuchar. */
  const say = useCallback(
    (text: string, keepListening = true) => {
      void sayAndWait(text).then(() => afterSpeech(keepListening && voice.canListen));
    },
    [afterSpeech, sayAndWait, voice.canListen],
  );

  /** Guarda un intercambio para que la IA tenga el hilo cuando vuelva. */
  const remember = useCallback((user: string | null, zoe: string) => {
    const turns: ZoeTurn[] = user ? [{ role: 'user', text: user }] : [];
    historyRef.current = [...historyRef.current, ...turns, { role: 'zoe' as const, text: zoe }].slice(-12);
  }, []);

  /** Faltas de respeto seguidas en esta charla: 1.ª recuerdo amable, 2.ª firme, 3.ª pausa. */
  const disrespect = useRef(0);

  /** Lo que ZOE preguntó si podía presionar (limpiar, eliminar…): espera un sí o un no. */
  const pendingActions = useRef<ZoeAction[] | null>(null);

  const startTalking = useCallback(() => {
    setTalking(true);
    talkingRef.current = true;
    silentTries.current = 0;
  }, []);

  const endConversation = useCallback(() => {
    setTalking(false);
    talkingRef.current = false;
    pendingRef.current = '';
    askedDoneRef.current = false;
    voice.stopListening();
    voice.stopSpeaking();
    setBehavior('idle');
    setHeard(null);
  }, [voice]);

  /** Abre el chat flotante; con `notice`, ZOE lo dice y lo deja escrito (p. ej. «hay mucho ruido»). */
  const openChat = useCallback(
    (notice?: string) => {
      chatOpenRef.current = true;
      setChatOpen(true);
      voice.stopListening();
      if (!talkingRef.current) startTalking();
      if (notice) {
        remember(null, notice);
        void sayAndWait(notice).then(() => afterSpeech(false));
      }
    },
    [afterSpeech, remember, sayAndWait, startTalking, voice],
  );

  const closeChat = useCallback(() => {
    chatOpenRef.current = false;
    setChatOpen(false);
    endConversation();
  }, [endConversation]);

  /** Del chat de vuelta a la voz. */
  const chatToMic = useCallback(() => {
    chatOpenRef.current = false;
    setChatOpen(false);
    voice.stopSpeaking();
    if (!talkingRef.current) startTalking();
    listenRef.current();
  }, [startTalking, voice]);

  const toggleChatVoice = useCallback(() => {
    const next = !chatVoiceRef.current;
    chatVoiceRef.current = next;
    setChatVoice(next);
    if (!next) voice.stopSpeaking();
  }, [voice]);

  // ── Recorrido guiado ──
  const endTour = useCallback(() => {
    tourRun.current += 1;
    tourRef.current = null;
    setTouring(false);
    releaseFacing();
  }, [releaseFacing]);

  /** Lo que hace con el cuerpo mientras explica: un truco, una postura o unos pasos por la pantalla. */
  const tourGesture = useCallback(
    (gesture?: TourGesture) => {
      if (!gesture) return;
      if (gesture === 'stroll') void stroll();
      else if (gesture === 'come') void comeHere();
      else if (gesture === 'sit' || gesture === 'stand') setPosture(gesture === 'sit' ? 'sitting' : 'standing');
      else {
        setPosture('standing');
        playTrick(gesture);
      }
    },
    [comeHere, playTrick, stroll],
  );

  /**
   * Lo que el guion del recorrido puede hacer (ver `TourContext`). Todo se corta en cuanto la parada
   * deja de estar viva (la persona terminó el recorrido o pasó a otra parada).
   */
  const tourContext = useCallback(
    (alive: () => boolean): TourContext => {
      const speak = async (text: string, gesture?: TourGesture) => {
        if (!alive()) return;
        tourGesture(gesture);
        await sayAndWait(text);
      };
      const show: TourContext['show'] = async (target, text, gesture) => {
        if (!alive()) return false;
        const el = findOnScreen(target);
        if (!el) {
          await speak(text, gesture);
          return false;
        }
        // Caminar hasta el elemento ya es moverse: el paseo se omite y los demás gestos se hacen al llegar.
        await Promise.all([pointAt(el, approach).then(() => tourGesture(gesture === 'stroll' ? undefined : gesture)), sayAndWait(text)]);
        return true;
      };
      const press: TourContext['press'] = async (target) => {
        if (!alive()) return false;
        const ok = await pressElement(findOnScreen(target), approach);
        if (ok) await pause(450); // Que la pantalla reaccione antes del paso siguiente.
        return ok;
      };
      return {
        alive,
        wait: (ms) => (alive() ? pause(ms) : Promise.resolve()),
        say: speak,
        show,
        set: async (target, value) => alive() && setValue(findOnScreen(target), value, approach),
        check: async (target) => alive() && checkBox(findOnScreen(target), approach),
        press,
        exists: (target) => isUsable(findOnScreen(target)),
        label: (target) => {
          const el = findOnScreen(target);
          return (el?.getAttribute('aria-label') ?? el?.textContent ?? '').trim();
        },
        snapshot: buildTourSnapshot,
        // Genera de verdad y acompaña la espera: narra el proceso, se mueve y cuenta el avance real.
        generate: async (button, done, narration, timeoutMs) => {
          if (!alive()) return 'error';
          if (!navigator.onLine || Date.now() < aiDownUntil.current) return 'offline';
          if (!(await press(button))) return 'error';
          const started = Date.now();
          let next = 0;
          let lastUpdate = Date.now();
          await pause(1500);
          while (alive()) {
            if (done()) return 'ok';
            const progress = progressNow();
            if (!progress && Date.now() - started > 5000) return done() ? 'ok' : 'error';
            if (Date.now() - started > timeoutMs) return 'timeout';
            const beat = narration[next];
            if (beat) {
              next += 1;
              if (beat.show) await show(beat.show, beat.say, beat.gesture);
              else await speak(beat.say, beat.gesture);
              await pause(2500);
            } else if (progress && Date.now() - lastUpdate > 25_000) {
              lastUpdate = Date.now();
              await speak(`Vamos en ${progress}.`, pickOne(['wag', 'stroll', 'shake']) as TourGesture);
              await pause(3000);
            } else {
              await pause(1500);
            }
          }
          return 'error';
        },
      };
    },
    [approach, sayAndWait, tourGesture],
  );

  /**
   * Una parada: va a la pantalla y ejecuta su guion completo (o solo el repaso, sin volver a
   * generar). Al final pregunta si siguen, sin presionar.
   */
  const runTourStep = useCallback(
    async (index: number, mode: 'run' | 'recap' = 'run') => {
      const step = TOUR_STEPS[index];
      if (!step) return;
      const run = ++tourRun.current;
      const alive = () => run === tourRun.current && tourRef.current !== null;
      tourRef.current = { step: index };
      setTouring(true);
      startTalking();
      voice.stopListening();
      readyAsked.current = false;
      wake();
      setPosture('standing');
      if (toolRef.current !== step.tool) {
        onSelectTool(step.tool);
        await pause(900); // Que la pantalla nueva alcance a dibujarse.
        if (!alive()) return;
      }
      window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' });
      try {
        await step[mode](tourContext(alive));
      } catch (e) {
        // Un tropiezo de la pantalla no detiene el recorrido: se sigue con la pregunta de siempre.
        console.warn(`[ZOE] El recorrido tropezó en ${step.tool}:`, e);
      }
      if (!alive()) return;
      releaseFacing();
      await sayAndWait(readyQuestion(index));
      if (alive()) afterSpeech(voice.canListen);
    },
    [afterSpeech, onSelectTool, releaseFacing, sayAndWait, startTalking, tourContext, voice, wake],
  );

  const startTour = useCallback(() => {
    awaitingRoute.current = false;
    void runTourStep(0);
  }, [runTourStep]);

  /** «Sigamos», «repite», «atrás», «espera» o «terminar», dichos o tocados en el globo. */
  const tourControl = useCallback(
    (reply: TourReply) => {
      const current = tourRef.current;
      if (!current) return;
      if (reply === 'stop') {
        endTour();
        say(TOUR_STOP);
        return;
      }
      startTalking();
      if (reply === 'wait') {
        say(pickOne(TOUR_WAIT));
        return;
      }
      // Repetir o volver atrás repasa la explicación y el resultado sin volver a generar.
      if (reply === 'repeat' || reply === 'back') {
        void runTourStep(reply === 'back' ? Math.max(0, current.step - 1) : current.step, 'recap');
        return;
      }
      if (current.step + 1 >= TOUR_STEPS.length) {
        endTour();
        awaitingRoute.current = true;
        remember(null, TOUR_END);
        say(TOUR_END);
        return;
      }
      void runTourStep(current.step + 1);
    },
    [endTour, remember, runTourStep, say, startTalking],
  );

  /** Un movimiento pedido de viva voz (`speak`) o por la IA con la acción «animar» (sin frase propia). */
  const doMove = useCallback(
    async (move: ZoeMove, speak: boolean) => {
      const line = speak ? pickOne(MOVE_LINES[move]) : '';
      switch (move) {
        case 'sleep':
          endTour();
          endConversation();
          if (line) showCaption(line, 5000);
          void nap();
          return;
        case 'home':
          endTour();
          endConversation();
          if (line) say(line, false);
          void goHome();
          return;
        case 'walk':
          if (line) say(line);
          void stroll();
          return;
        case 'come':
          if (line) say(line);
          await comeHere();
          return;
        case 'move':
          if (line) say(line);
          await stepAside();
          return;
        case 'sit':
        case 'stand':
        case 'lie':
        case 'still':
          wake();
          if (move !== 'still') setPosture(move === 'sit' ? 'sitting' : move === 'stand' ? 'standing' : 'lying');
          if (line) say(line);
          return;
        default: {
          // Los trucos parten de estar de pie: si estaba sentado, primero se levanta.
          wake();
          if (line) say(line);
          if (postureRef.current !== 'standing') {
            setPosture('standing');
            await pause(900);
          }
          playTrick(move);
        }
      }
    },
    [comeHere, endConversation, endTour, goHome, nap, playTrick, say, showCaption, stepAside, stroll, wake],
  );

  const hands = useMemo<ZoeHands>(() => ({ navigate: onSelectTool, approach, animate: (move) => doMove(move, false) }), [approach, doMove, onSelectTool]);

  /** Sin IA: contesta con el banco del documento maestro, sin alarmas y sin cortar la charla. */
  const answerOffline = useCallback(
    (text: string) => {
      const reply = offlineAnswer(text, MASTER_DOCUMENT, { tool: toolRef.current, work: currentWork() });
      const notice = offlineNoticed.current ? '' : `${OFFLINE_NOTICE} `;
      offlineNoticed.current = true;
      remember(text, reply);
      say(`${notice}${reply}`);
    },
    [remember, say],
  );

  const answer = useCallback(
    async (text: string) => {
      setHeard(text);
      // ¿Es la respuesta a «¿me confirmas que presione…?»? Si habla de otra cosa, se olvida la pregunta.
      const pending = pendingActions.current;
      pendingActions.current = null;
      const confirmed = pending ? isConfirmation(text) : null;
      if (pending && confirmed !== null) {
        if (!confirmed) {
          say('Entendido, no toco nada.');
          return;
        }
        say('Listo, ya lo hago.');
        await performActions(pending, hands);
        releaseFacing();
        return;
      }

      // Primero la persona: ante una señal de riesgo, el mensaje de cuidado, con o sin IA.
      const care = crisisReply(text);
      if (care) {
        readyAsked.current = false;
        remember(text, care);
        say(care);
        return;
      }

      // Respeto: insultos, groserías, amenazas o ira. Se responde con calma y firmeza, sin pasar por la IA.
      const respect = respectReply(text, disrespect.current);
      if (respect) {
        readyAsked.current = false;
        if (respect.verdict.level !== 'ira') disrespect.current += 1;
        remember(text, respect.text);
        if (respect.answerAfter) {
          // Con ira y una pregunta: primero se acompaña, y enseguida se contesta lo que pidió.
          await sayAndWait(respect.text);
        } else if (respect.endConversation) {
          disrespect.current = 0;
          void sayAndWait(respect.text).then(() => endConversation());
          return;
        } else {
          say(respect.text);
          return;
        }
      } else if (disrespect.current > 0) {
        if (isApology(text) && text.trim().split(/\s+/).length <= 6) {
          disrespect.current = 0;
          remember(text, APOLOGY_REPLY);
          say(APOLOGY_REPLY);
          return;
        }
        disrespect.current = 0; // Volvió el buen trato: se empieza de nuevo.
      }

      // Ética: no se ayuda a estafar, robar, fabricar armas ni a poner vidas en riesgo; se dice con calma y se ofrece algo que sume.
      const harm = assessHarmfulIntent(text);
      if (harm) {
        readyAsked.current = false;
        remember(text, harm.message);
        say(harm.message);
        return;
      }

      // En el recorrido: «sigamos», «repite», «atrás», «espera», «terminar».
      if (tourRef.current) {
        const reply = parseTourReply(text);
        if (reply) {
          tourControl(reply);
          return;
        }
      }

      // Al terminar el recorrido: «por el estudio» lleva a esa herramienta.
      if (awaitingRoute.current) {
        awaitingRoute.current = false;
        const tool = toolMentioned(text);
        if (tool) {
          onSelectTool(tool);
          say(`¡Buena elección! Vamos a ${TOOL_NAMES[tool]}. ${TOOL_HINTS[tool]}`);
          return;
        }
      }

      // «¿Todo listo para continuar?»: el sí y el no se contestan aquí, sin hacer esperar.
      if (readyAsked.current) {
        const ready = isConfirmation(text);
        if (ready !== null) {
          readyAsked.current = !ready;
          const line = ready ? READY_YES : READY_NO;
          remember(text, line);
          say(line);
          return;
        }
        readyAsked.current = false;
      }

      const command = parseZoeCommand(text);
      if (command?.type === 'tour') {
        startTour();
        return;
      }
      if (command?.type === 'navigate') {
        onSelectTool(command.tool);
        say(`¡Vamos! Esto es ${TOOL_NAMES[command.tool]}. ${TOOL_HINTS[command.tool]}`);
        return;
      }
      if (command?.type === 'theme') {
        if (theme !== command.value) onToggleTheme();
        say(command.value === 'light' ? 'Listo, prendí las luces.' : 'Listo, así brillo mejor.');
        return;
      }
      if (command) {
        void doMove(command.type, true);
        return;
      }

      // Sin internet, o si la IA acaba de fallar, contesta de memoria en vez de hacer esperar.
      if (!navigator.onLine || Date.now() < aiDownUntil.current) {
        answerOffline(text);
        return;
      }

      setBehavior('thinking');
      setCaption(null);
      const filler = window.setTimeout(() => {
        const line = pickOne(FILLERS);
        setCaption(splitBarks(line).rest || line);
        if (!chatOpenRef.current || chatVoiceRef.current) voice.speak(line);
      }, FILLER_AFTER_MS);
      try {
        let reply = await askZoe(text, historyRef.current, toolRef.current);
        window.clearTimeout(filler);
        offlineNoticed.current = false;
        const done: string[] = [];
        for (let round = 1; ; round++) {
          if (!talkingRef.current && !request) return; // La persona cerró mientras pensaba.
          // Lo que borra o descarta algo espera un sí de la persona; lo demás se hace mientras habla.
          const risky = reply.acciones.filter(needsConfirmation);
          const safe = reply.acciones.filter((a) => !needsConfirmation(a));
          const last = !reply.seguir || round >= MAX_AGENT_ROUNDS || risky.length > 0;
          const question = risky.length ? ` ¿Me confirmas que presione ${risky.map((a) => `«${'id' in a ? labelOfControl(a.id) : ''}»`).join(' y ')}?` : '';
          const spoken = `${reply.decir}${question}`.trim() || 'Listo.';
          const [results] = await Promise.all([performActions(safe, hands), sayAndWait(spoken)]);
          done.push(...results.filter((r) => r.ok).map((r) => r.note));
          if (!last) {
            // La tarea sigue en la pantalla nueva: la mira y continúa con el mismo pedido.
            setBehavior('thinking');
            reply = await askZoe(text, historyRef.current, toolRef.current, done);
            continue;
          }
          releaseFacing();
          const failed = results.filter((r) => !r.ok);
          if (failed.length)
            console.warn(
              '[ZOE] Acciones que no se pudieron hacer:',
              failed.map((r) => r.note),
            );
          remember(text, `${spoken}${failed.length ? ` (No pude: ${failed.map((r) => r.note).join('; ')}.)` : ''}`);
          if (risky.length) pendingActions.current = risky;
          if (failed.length) say('Hubo algo que no pude hacer en la pantalla. ¿Me lo repites o lo hacemos de otra forma?');
          else afterSpeech(true);
          return;
        }
      } catch (e) {
        window.clearTimeout(filler);
        // Sin estrés: ZOE no corta la charla ni culpa a nadie; responde con lo que sabe y sigue escuchando.
        if (e instanceof EthicsBlockedError) {
          remember(text, e.message);
          say(e.message);
          return;
        }
        console.warn('[ZOE] La IA no respondió; contesto con lo que sé de memoria.', e);
        aiDownUntil.current = Date.now() + AI_RETRY_MS;
        answerOffline(text);
      }
    },
    [
      afterSpeech,
      answerOffline,
      doMove,
      hands,
      onSelectTool,
      onToggleTheme,
      releaseFacing,
      remember,
      request,
      say,
      sayAndWait,
      startTour,
      theme,
      tourControl,
      voice,
    ],
  );

  /** Lo escrito en el chat sigue el mismo camino que lo dicho: órdenes, recorrido, IA y respuesta de memoria. */
  const sendChat = useCallback(
    (text: string) => {
      logChat('user', text);
      voice.stopSpeaking();
      if (!talkingRef.current) startTalking();
      void answer(text);
    },
    [answer, logChat, startTalking, voice],
  );

  const onListenFail = useCallback(
    (reason: ZoeListenFailure) => {
      setBehavior('idle');
      if (reason === 'ruido') {
        // Mucho ruido: se deja de insistir con el micrófono y se pasa al chat.
        openChat(MIC_PROBLEMS.ruido);
        return;
      }
      if (reason === 'sin-voz' && pendingRef.current) {
        // Se le preguntó si había terminado y guardó silencio: ya terminó.
        const question = pendingRef.current;
        pendingRef.current = '';
        askedDoneRef.current = false;
        void answer(question);
        return;
      }
      if (reason === 'sin-voz') {
        // Dos silencios seguidos: se da por terminada la charla sin insistir.
        silentTries.current += 1;
        if (silentTries.current >= 2) {
          endConversation();
          say(
            tourRef.current
              ? 'Te dejo pensar con calma. Cuando quieras seguir el recorrido, toca «Seguir».'
              : 'Te dejo trabajar. Tócame cuando quieras seguir.',
            false,
          );
        } else if (talkingRef.current) {
          say('¿Sigues ahí? Te escucho.');
        }
      } else {
        // Si el micrófono no sirve, queda el chat.
        openChat(`${MIC_PROBLEMS[reason] ?? MIC_PROBLEMS.error!} Mientras tanto, escríbeme aquí.`);
      }
    },
    [answer, endConversation, openChat, say],
  );

  /**
   * Turno de palabra: si la frase quedó cortada, ZOE pregunta si ya terminó antes de responder;
   * si la persona pide tiempo, espera. Lo dicho en varias partes se junta en una sola pregunta.
   */
  const onHeard = (text: string) => {
    silentTries.current = 0;
    if (askedDoneRef.current && isDoneReply(text)) {
      const question = pendingRef.current;
      pendingRef.current = '';
      askedDoneRef.current = false;
      void answer(question);
      return;
    }
    if (wantsMoreTime(text)) {
      say('Sin afán, tómate tu tiempo. Te escucho.');
      return;
    }
    const full = `${pendingRef.current} ${text}`.trim();
    if (!askedDoneRef.current && seemsUnfinished(full)) {
      pendingRef.current = full;
      askedDoneRef.current = true;
      say('¿Ya terminaste? Si quieres, sigue: te escucho.');
      return;
    }
    pendingRef.current = '';
    askedDoneRef.current = false;
    void answer(full);
  };

  listenRef.current = () => {
    setBehavior('listening');
    setHeard(null);
    setCaption(null);
    voice.listen(onHeard, onListenFail, setHeard, (level) => {
      if (levelRef.current) levelRef.current.style.transform = `scaleX(${Math.min(1, level * 9)})`;
    });
  };

  const startConversation = useCallback(async () => {
    if (!voice.canListen) {
      openChat('Para conversar por voz necesito Chrome o Edge, pero puedes escribirme aquí.');
      return;
    }
    wake();
    setFacing(0);
    setPetCounter((n) => n + 1);
    startTalking();
    // El permiso se pide aquí, dentro del toque, y no cuando ya terminó el saludo.
    const problem = await voice.checkMic();
    if (!talkingRef.current) return;
    if (problem) onListenFail(problem);
    else if (tourRef.current) say(`¿Seguimos con el recorrido? Íbamos en ${TOUR_STEPS[tourRef.current.step].title}. Dime «sigamos» cuando quieras.`);
    else if (historyRef.current.length) listenRef.current();
    else {
      readyAsked.current = true;
      remember(null, GREETING);
      say(GREETING);
    }
  }, [onListenFail, openChat, remember, say, startTalking, voice, wake]);

  /** Tocarlo: empieza a conversar; si escucha, termina. Si está hablando no se le corta: termina la idea y luego escucha. */
  const onTouchZoe = useCallback(() => {
    if (!talkingRef.current) void startConversation();
    else if (voice.listening) endConversation();
    else if (behavior === 'speaking') setHeard('Termino la idea y te escucho.');
    else listenRef.current();
  }, [behavior, endConversation, startConversation, voice.listening]);

  const pet = () => {
    wake();
    setPetCounter((n) => n + 1);
    setBehavior('happy');
    window.setTimeout(() => setBehavior((b) => (b === 'happy' ? 'idle' : b)), 1800);
  };

  // Preguntas sugeridas desde el inicio: se responden en voz alta.
  const lastRequest = useRef<number | null>(null);
  useEffect(() => {
    if (!request || request.id === lastRequest.current) return;
    lastRequest.current = request.id;
    if (request.text) {
      startTalking();
      void answer(request.text);
    } else {
      void startConversation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  // Solo en desarrollo: `window.__zoeDecir('sacúdete')` prueba lo que se le dice, sin micrófono.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as { __zoeDecir?: (text: string) => void };
    w.__zoeDecir = (text) => {
      startTalking();
      void answer(text);
    };
    return () => {
      delete w.__zoeDecir;
    };
  }, [answer, startTalking]);

  // Una pista breve la primera vez que se visita cada herramienta; después, silencio.
  useEffect(() => {
    if (!isOpen || talkingRef.current || seenTools.current.has(currentTool)) return;
    seenTools.current.add(currentTool);
    showCaption(TOOL_HINTS[currentTool], 5000);
  }, [currentTool, isOpen, showCaption]);

  // ── Vida propia: de vez en cuando pasea, cambia de postura o busca dónde dormir ──
  useEffect(() => {
    if (!isOpen || reduceMotion() || window.innerWidth < 768) return;
    let timer: number;
    const schedule = () => {
      timer = window.setTimeout(
        () => {
          if (!busyRef.current && !drag.current && !document.hidden) {
            const roll = Math.random();
            if (roll < 0.35) void nap();
            else if (roll < 0.8) void stroll();
            else setPosture((p) => (p === 'sitting' ? 'standing' : 'sitting'));
          }
          schedule();
        },
        28000 + Math.random() * 32000,
      );
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [isOpen, nap, stroll]);

  // Desplazamiento mientras camina (también al pedírselo con el botón).
  useEffect(() => {
    if (!isWalking) {
      // Junto a un botón sigue mirándolo; si no, mira de frente.
      setFacing(holdFacing.current);
      return;
    }
    if (walkTarget.current === null) {
      const { x, y } = positionRef.current;
      walkTarget.current = clampPosition(x + (x > window.innerWidth / 2 ? -320 : 320), y);
      speedRef.current = WALK_SPEED;
      setTrotting(false);
    }
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const target = walkTarget.current;
      if (target === null) return;
      const dx = target.x - positionRef.current.x;
      const dy = target.y - positionRef.current.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 3) {
        walkTarget.current = null;
        setIsWalking(false);
        const arrived = onArrive.current;
        onArrive.current = null;
        arrived?.();
        return;
      }
      if (Math.abs(dx) > 2) setFacing(dx > 0 ? 1 : -1);
      const stride = Math.min(1, (speedRef.current * dt) / distance);
      setPosition((p) => ({ x: p.x + dx * stride, y: p.y + dy * stride }));
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [isWalking]);

  // ── Arrastre libre: un toque sin mover inicia la conversación ──
  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    wake();
    drag.current = { dx: e.clientX - position.x, dy: e.clientY - position.y, startX: e.clientX, startY: e.clientY, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 5) d.moved = true;
    if (d.moved) setPosition(clampPosition(e.clientX - d.dx, e.clientY - d.dy));
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.moved) {
      try {
        localStorage.setItem(POSITION_KEY, JSON.stringify(positionRef.current));
      } catch {
        /* Solo es una preferencia. */
      }
    } else {
      onTouchZoe();
    }
  };

  useEffect(() => {
    const onResize = () => setPosition((p) => clampPosition(p.x, p.y));
    // Con la firma ya en pantalla, ZOE se ajusta a su ancho real.
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!isOpen && talkingRef.current) endConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Al llamarla desde la casita aparece en la puerta; sale cuando el modelo ya cargó.
  useEffect(() => {
    if (!isOpen) {
      setModelReady(false);
      return;
    }
    if (!comingOut.current) return;
    comingOut.current = false;
    setPosition(atTheDoor());
    setPosture('standing');
    setHomeTrip('leaving');
  }, [isOpen]);

  // Si el navegador no puede dibujar 3D, el modelo nunca avisa: no se la deja esperando.
  useEffect(() => {
    if (homeTrip !== 'leaving' || modelReady) return;
    const timer = window.setTimeout(() => setModelReady(true), 4000);
    return () => window.clearTimeout(timer);
  }, [homeTrip, modelReady]);

  useEffect(() => {
    if (homeTrip !== 'leaving' || !modelReady) return;
    const id = routine.current;
    const alive = () => id === routine.current;
    void (async () => {
      await pause(HOUSE_MS);
      if (!alive()) return;
      const back = returnSpot.current ?? initialPosition();
      await walkTo(back.x, back.y);
      if (!alive()) return;
      setHomeTrip('none');
      setPosture('sitting');
      showCaption('¡Aquí estoy!', 2500);
    })();
  }, [homeTrip, modelReady, showCaption, walkTo]);

  const onModelLoaded = useCallback(() => setModelReady(true), []);

  if (!isOpen) return <ZoeDoghouse occupied onCall={comeOut} />;

  // Al pensar, el globo muestra su «¡Woa, woa!» si ya lo dijo; si no, «Pensando…».
  const status = voice.listening ? 'Te escucho…' : behavior === 'thinking' && !caption ? 'Pensando…' : null;
  const toolbar: Array<{ label: string; icon: React.ReactNode; onClick: () => void; pressed?: boolean; color: string }> = [
    {
      label: talking ? 'Terminar la conversación' : 'Conversar con ZOE',
      icon: <Mic className="w-4 h-4" />,
      onClick: () => (talking ? endConversation() : void startConversation()),
      pressed: talking,
      color: '#27DCFF',
    },
    {
      label: chatOpen ? 'Cerrar el chat con ZOE' : 'Escribirle a ZOE',
      icon: <MessageSquare className="w-4 h-4" />,
      onClick: () => (chatOpen ? closeChat() : openChat()),
      pressed: chatOpen,
      color: '#5EC2DD',
    },
    {
      label: touring ? 'Terminar el recorrido guiado' : 'Recorrido guiado por el Laboratorio',
      icon: <Compass className="w-4 h-4" />,
      onClick: () => (touring ? tourControl('stop') : startTour()),
      pressed: touring,
      color: '#A8C63C',
    },
    {
      label: voice.muted ? 'Activar la voz de ZOE' : 'Silenciar la voz de ZOE',
      icon: voice.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />,
      onClick: voice.toggleMuted,
      pressed: voice.muted,
      color: '#5EC2DD',
    },
    {
      label: posture === 'sitting' ? 'Poner de pie a ZOE' : 'Sentar a ZOE',
      icon: <Dog className="w-4 h-4" />,
      onClick: () => {
        wake();
        setPosture(posture === 'sitting' ? 'standing' : 'sitting');
      },
      color: '#F29F05',
    },
    {
      label: isWalking ? 'Detener la caminata' : 'Poner a caminar a ZOE',
      icon: <Footprints className="w-4 h-4" />,
      onClick: () => (isWalking ? wake() : void stroll()),
      pressed: isWalking,
      color: '#A8C63C',
    },
    {
      label: napping ? 'Despertar a ZOE' : 'Que ZOE busque dónde dormir',
      icon: <Moon className="w-4 h-4" />,
      onClick: () => (napping ? wake() : void nap()),
      pressed: napping,
      color: '#B85EFF',
    },
    {
      label: show360 ? 'Quitar el entorno 360°' : 'Activar el entorno 360°',
      icon: <Globe className="w-4 h-4" />,
      onClick: () => setShow360((v) => !v),
      pressed: show360,
      color: '#27DCFF',
    },
    { label: 'Acariciar a ZOE', icon: <Heart className="w-4 h-4" />, onClick: pet, color: '#F29F05' },
    { label: 'Mandar a ZOE a su casita', icon: <House className="w-4 h-4" />, onClick: () => void goHome(), color: '#F3C26B' },
  ];
  const tripClass = homeTrip === 'entering' ? 'zoe-entering' : homeTrip === 'leaving' ? (modelReady ? 'zoe-leaving' : 'invisible') : '';

  return (
    <>
      {homeTrip !== 'none' && <ZoeDoghouse occupied={false} />}
      {chatOpen && (
        <ZoeChat
          messages={chatLog}
          thinking={behavior === 'thinking'}
          voiceOn={chatVoice}
          canUseMic={voice.canListen}
          onSend={sendChat}
          onToggleVoice={toggleChatVoice}
          onUseMic={chatToMic}
          onClose={closeChat}
        />
      )}
      <div
        className={`zoe-stage fixed z-40 group ${tripClass}`}
        style={{
          left: position.x,
          top: position.y,
          width: STAGE.width + 44,
          height: STAGE.height,
          transformOrigin: `${STAGE.width / 2}px ${STAGE.height * FEET}px`,
        }}
      >
        {/* Subtítulos: lo que ZOE dice, también para quien no puede oírlo. No es un chat. */}
        {(caption || status || heard || touring) && (!chatOpen || touring) && (
          <div
            className={`zoe-caption ${position.x < window.innerWidth / 2 ? 'zoe-caption-left' : ''}`}
            // Frente a la casita el escenario sale un poco de la pantalla: el globo no se corta.
            style={captionInside(position.x)}
            role="status"
            aria-live="polite"
          >
            {talking && (
              <button type="button" className="zoe-caption-close" onClick={endConversation} aria-label="Terminar la conversación">
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
            {heard && (status || behavior === 'speaking') && <p className="text-[11px] italic text-brand-textMuted mb-1">«{heard}»</p>}
            {status ? <p className={voice.listening ? 'zoe-status zoe-status-on' : 'zoe-status'}>{status}</p> : caption && <p>{caption}</p>}
            {voice.listening && (
              <span className="zoe-level-track" aria-hidden="true">
                <span ref={levelRef} className="zoe-level" />
              </span>
            )}
            {touring && (
              // También con botones: sin micrófono, o con ruido, el recorrido se maneja tocando.
              <div className="zoe-tour-controls" role="group" aria-label="Recorrido guiado">
                <span className="zoe-tour-step">
                  Recorrido {(tourRef.current?.step ?? 0) + 1}/{TOUR_STEPS.length}
                </span>
                <button type="button" onClick={() => tourControl('back')} disabled={!tourRef.current?.step}>
                  Atrás
                </button>
                <button type="button" onClick={() => tourControl('repeat')}>
                  Repetir
                </button>
                <button type="button" className="zoe-tour-next" onClick={() => tourControl('next')}>
                  Seguir
                </button>
                <button type="button" onClick={() => tourControl('stop')}>
                  Terminar
                </button>
              </div>
            )}
          </div>
        )}

        {behavior === 'sleeping' && (
          <div className="zoe-zzz" aria-hidden="true">
            <span>z</span>
            <span>z</span>
            <span>z</span>
          </div>
        )}

        <div className="absolute left-0 top-0 pointer-events-none" style={{ width: STAGE.width, height: STAGE.height }}>
          <Suspense fallback={null}>
            <CanvasBoundary>
              <ZoeCanvas3D
                behavior={behavior}
                isWalking={isWalking}
                trotting={trotting}
                facing={facing}
                posture={posture}
                show360Environment={show360}
                petTrigger={petCounter}
                trick={trick}
                onModelInfo={onModelLoaded}
              />
            </CanvasBoundary>
          </Suspense>
        </div>

        {/* Solo la silueta recibe el puntero: las esquinas vacías dejan pasar los clics al contenido. */}
        <button
          type="button"
          className="zoe-hit"
          style={{ left: STAGE.width * 0.22, top: STAGE.height * 0.1, width: STAGE.width * 0.56, height: STAGE.height * 0.82 }}
          aria-label={talking ? 'ZOE te escucha: toca para terminar o interrumpir' : 'Conversar con ZOE por voz'}
          title="Tócame para conversar · Arrástrame para moverme"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onTouchZoe();
            }
          }}
        />

        {homeTrip === 'none' && (
          <div className="zoe-toolbar" role="toolbar" aria-label="Controles de ZOE">
            {toolbar.map((b) => (
              <button
                key={b.label}
                type="button"
                className="zoe-tool"
                style={{ color: b.color }}
                title={b.label}
                aria-label={b.label}
                aria-pressed={b.pressed}
                onClick={b.onClick}
              >
                {b.icon}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
