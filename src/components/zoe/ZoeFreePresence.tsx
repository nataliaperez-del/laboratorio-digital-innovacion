import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Bot, Dog, Footprints, Globe, Heart, Mic, Moon, Volume2, VolumeX, X } from 'lucide-react';
import type { ZoeSoulState } from './ZoeCanvas3D';
import { splitSentences, useZoeVoice, type ZoeListenFailure } from './useZoeVoice';
import type { ToolId } from '../layout/Header';
import { askZoe } from '@/services/zoeAi';
import { parseZoeCommand, TOOL_HINTS, TOOL_NAMES, type ZoeTurn } from '@/lib/zoeContext';

// El modelo 3D y Three.js pesan: se descargan aparte, sin demorar la herramienta que se abrió.
const ZoeCanvas3D = lazy(() => import('./ZoeCanvas3D'));

/** Tamaño de ZOE en pantalla; en celulares se reduce para dejarle el espacio al contenido. */
const STAGE = typeof window !== 'undefined' && window.innerWidth < 768 ? { width: 170, height: 190 } : { width: 260, height: 290 };
const POSITION_KEY = 'innovahub_zoe_pos_v2';
const WALK_SPEED = 90; // píxeles por segundo; acorde al tamaño, para que las patas no parezcan patinar
/** Si no responde la IA en este tiempo, ZOE dice algo: el silencio es lo que rompe la conversación. */
const FILLER_AFTER_MS = 1500;
const FILLERS = ['A ver…', 'Mmm, déjame olfatear eso.', 'Buena pregunta, dame un segundo.', 'Déjame pensarlo.', 'Interesante…'];
const AFTER_SPEECH_MS = 250;
/** Lo que ZOE explica cuando no puede escuchar; cada causa tiene una solución distinta. */
const MIC_PROBLEMS: Partial<Record<ZoeListenFailure, string>> = {
  'sin-permiso': 'El navegador no me deja usar el micrófono. Dale permiso en el candadito de la barra de direcciones y me vuelves a tocar.',
  'sin-microfono': 'No encuentro un micrófono disponible. Revisa que esté conectado y que otra aplicación no lo esté usando.',
  'mic-mudo': 'No me llega ningún sonido de tu micrófono. Revisa que no esté silenciado y que el navegador use el correcto.',
  'sin-https': 'Para escucharte, esta página debe abrirse con una dirección segura, con h t t p s.',
  'sin-red': 'El servicio de voz del navegador no responde. Necesita internet, y funciona en Chrome o Edge.',
  error: 'No alcancé a escucharte: el reconocimiento de voz falló. Intentemos otra vez en un momento.',
};

const pause = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

/** Busca dónde echarse: el tramo del piso de la página con menos botones y enlaces debajo. */
function findQuietSpot(currentX: number) {
  const y = clampPosition(0, window.innerHeight).y;
  const crowding = (x: number) => {
    let found = 0;
    for (const px of [0.25, 0.5, 0.75]) {
      for (const py of [0.5, 0.9]) {
        const under = document.elementsFromPoint(x + STAGE.width * px, y + STAGE.height * py).find((el) => !el.closest('.zoe-stage'));
        if (under?.closest('button, a, input, select, textarea, [role="button"]')) found += 1;
      }
    }
    return found;
  };
  const spots = Array.from({ length: 8 }, (_, i) => clampPosition(((window.innerWidth - STAGE.width) * i) / 7, y).x).filter((x) => Math.abs(x - currentX) > 120);
  const best = spots.map((x) => ({ x, score: crowding(x) + Math.random() })).sort((a, b) => a.score - b.score)[0];
  return { x: best?.x ?? currentX, y };
}

function clampPosition(x: number, y: number) {
  return {
    x: Math.max(4, Math.min(window.innerWidth - STAGE.width - 48, x)),
    y: Math.max(4, Math.min(window.innerHeight - STAGE.height - 4, y)),
  };
}

function initialPosition() {
  try {
    const saved = JSON.parse(localStorage.getItem(POSITION_KEY) ?? 'null');
    if (typeof saved?.x === 'number') return clampPosition(saved.x, saved.y);
  } catch {
    /* Posición guardada ilegible: se usa la de siempre. */
  }
  return clampPosition(window.innerWidth, window.innerHeight);
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

export const ZoeFreePresence: React.FC<Props> = ({ currentTool, onSelectTool, theme, onToggleTheme, isOpen, onToggleOpen, request }) => {
  const voice = useZoeVoice();
  const [behavior, setBehavior] = useState<ZoeSoulState>('idle');
  const [isWalking, setIsWalking] = useState(false);
  const [facing, setFacing] = useState<-1 | 0 | 1>(0);
  const [posture, setPosture] = useState<'sitting' | 'standing' | 'lying'>('sitting');
  const [napping, setNapping] = useState(false);
  const [show360, setShow360] = useState(false);
  const [petCounter, setPetCounter] = useState(0);

  /** Modo conversación: al terminar de hablar, ZOE vuelve a escuchar solo. */
  const [talking, setTalking] = useState(false);
  const talkingRef = useRef(false);
  talkingRef.current = talking;
  const historyRef = useRef<ZoeTurn[]>([]);
  const [caption, setCaption] = useState<string | null>(null);
  const [heard, setHeard] = useState<string | null>(null);
  const silentTries = useRef(0);
  const captionTimer = useRef<number | undefined>(undefined);

  const [position, setPosition] = useState(initialPosition);
  const positionRef = useRef(position);
  positionRef.current = position;
  const drag = useRef<{ dx: number; dy: number; startX: number; startY: number; moved: boolean } | null>(null);
  const seenTools = useRef(new Set<ToolId>());
  const walkTarget = useRef<{ x: number; y: number } | null>(null);
  const onArrive = useRef<(() => void) | null>(null);
  const routine = useRef(0);
  const levelRef = useRef<HTMLSpanElement>(null);
  const busyRef = useRef(false);
  busyRef.current = talking || napping || behavior !== 'idle';
  const toolRef = useRef(currentTool);
  toolRef.current = currentTool;

  // ── Rutinas: secuencias de caminar y descansar que cualquier toque interrumpe ──
  const walkTo = useCallback((x: number, y: number) => {
    return new Promise<void>((resolve) => {
      walkTarget.current = clampPosition(x, y);
      onArrive.current = resolve;
      setIsWalking(true);
    });
  }, []);

  const stopRoutine = useCallback(() => {
    routine.current += 1;
    walkTarget.current = null;
    setIsWalking(false);
    setNapping(false);
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

  const showCaption = useCallback((text: string, ms?: number) => {
    window.clearTimeout(captionTimer.current);
    setCaption(text);
    if (ms) captionTimer.current = window.setTimeout(() => setCaption(null), ms);
  }, []);

  // ── La conversación: escuchar → pensar → hablar → volver a escuchar ──
  const listenRef = useRef<() => void>(() => undefined);

  /** Dice algo y, si la conversación sigue abierta, vuelve a escuchar. */
  const say = useCallback(
    (text: string, keepListening = true) => {
      setBehavior('speaking');
      setHeard(null);
      setCaption(splitSentences(text)[0] ?? text);
      voice.speak(
        text,
        () => {
          setBehavior('idle');
          if (keepListening && talkingRef.current) {
            // Un respiro antes de abrir el micrófono: que no se oiga a sí mismo.
            window.setTimeout(() => {
              if (talkingRef.current) listenRef.current();
            }, AFTER_SPEECH_MS);
          } else window.setTimeout(() => setCaption(null), 2500);
        },
        setCaption,
      );
    },
    [voice],
  );

  const endConversation = useCallback(() => {
    setTalking(false);
    talkingRef.current = false;
    voice.stopListening();
    voice.stopSpeaking();
    setBehavior('idle');
    setHeard(null);
  }, [voice]);

  const answer = useCallback(
    async (text: string) => {
      setHeard(text);
      const command = parseZoeCommand(text);
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
      if (command?.type === 'sleep') {
        endConversation();
        showCaption('Busco un rinconcito y me echo un rato. Tócame cuando quieras.', 5000);
        void nap();
        return;
      }
      if (command?.type === 'sit' || command?.type === 'stand') {
        wake();
        setPosture(command.type === 'sit' ? 'sitting' : 'standing');
        say(command.type === 'sit' ? 'Sentado, como todo un profesional.' : '¡Arriba! Listo para lo que venga.');
        return;
      }
      if (command?.type === 'walk') {
        say('¡Vamos a estirar las patas!');
        void stroll();
        return;
      }

      setBehavior('thinking');
      setCaption(null);
      const filler = window.setTimeout(() => {
        const line = FILLERS[Math.floor(Math.random() * FILLERS.length)];
        setCaption(line);
        voice.speak(line);
      }, FILLER_AFTER_MS);
      try {
        const reply = await askZoe(text, historyRef.current, toolRef.current);
        window.clearTimeout(filler);
        if (!talkingRef.current && !request) return; // La persona cerró mientras pensaba.
        historyRef.current = [...historyRef.current, { role: 'user' as const, text }, { role: 'zoe' as const, text: reply }].slice(-12);
        say(reply);
      } catch (e) {
        window.clearTimeout(filler);
        console.warn('[ZOE] La IA no respondió:', e);
        endConversation();
        say('Se me cayó la conexión con la IA y no quiero inventarte una respuesta. Revisa el botón I A de la cabecera y me vuelves a llamar.', false);
      }
    },
    [endConversation, nap, onSelectTool, onToggleTheme, request, say, showCaption, stroll, theme, voice, wake],
  );

  const onListenFail = useCallback(
    (reason: ZoeListenFailure) => {
      setBehavior('idle');
      if (reason === 'sin-voz') {
        // Dos silencios seguidos: se da por terminada la charla sin insistir.
        silentTries.current += 1;
        if (silentTries.current >= 2) {
          endConversation();
          say('Te dejo trabajar. Tócame cuando quieras seguir.', false);
        } else if (talkingRef.current) {
          say('¿Sigues ahí? Te escucho.');
        }
      } else {
        endConversation();
        say(MIC_PROBLEMS[reason] ?? MIC_PROBLEMS.error!, false);
      }
    },
    [endConversation, say],
  );

  listenRef.current = () => {
    setBehavior('listening');
    setHeard(null);
    setCaption(null);
    voice.listen(
      (text) => {
        silentTries.current = 0;
        void answer(text);
      },
      onListenFail,
      setHeard,
      (level) => {
        if (levelRef.current) levelRef.current.style.transform = `scaleX(${Math.min(1, level * 9)})`;
      },
    );
  };

  const startConversation = useCallback(async () => {
    if (!voice.canListen) {
      say('Para conversar por voz necesito Chrome o Edge: este navegador no me deja escuchar.', false);
      return;
    }
    wake();
    setFacing(0);
    setPetCounter((n) => n + 1);
    silentTries.current = 0;
    setTalking(true);
    talkingRef.current = true;
    // El permiso se pide aquí, dentro del toque, y no cuando ya terminó el saludo.
    const problem = await voice.checkMic();
    if (!talkingRef.current) return;
    if (problem) onListenFail(problem);
    else if (historyRef.current.length) listenRef.current();
    else say('¡Hola, hola! Cuéntame, ¿qué tenemos entre manos?');
  }, [onListenFail, say, voice, wake]);

  /** Tocarlo: empieza a conversar; si está hablando, lo interrumpe y escucha; si escucha, termina. */
  const onTouchZoe = useCallback(() => {
    if (!talkingRef.current) void startConversation();
    else if (voice.listening) endConversation();
    else listenRef.current();
  }, [endConversation, startConversation, voice.listening]);

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
      setTalking(true);
      talkingRef.current = true;
      void answer(request.text);
    } else {
      void startConversation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  // Una pista breve la primera vez que se visita cada herramienta; después, silencio.
  useEffect(() => {
    if (!isOpen || talkingRef.current || seenTools.current.has(currentTool)) return;
    seenTools.current.add(currentTool);
    showCaption(TOOL_HINTS[currentTool], 5000);
  }, [currentTool, isOpen, showCaption]);

  // ── Vida propia: de vez en cuando pasea, cambia de postura o busca dónde dormir ──
  useEffect(() => {
    if (!isOpen || window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.innerWidth < 768) return;
    let timer: number;
    const schedule = () => {
      timer = window.setTimeout(() => {
        if (!busyRef.current && !drag.current && !document.hidden) {
          const roll = Math.random();
          if (roll < 0.35) void nap();
          else if (roll < 0.8) void stroll();
          else setPosture((p) => (p === 'sitting' ? 'standing' : 'sitting'));
        }
        schedule();
      }, 28000 + Math.random() * 32000);
    };
    schedule();
    return () => window.clearTimeout(timer);
  }, [isOpen, nap, stroll]);

  // Desplazamiento mientras camina (también al pedírselo con el botón).
  useEffect(() => {
    if (!isWalking) {
      setFacing(0);
      return;
    }
    if (walkTarget.current === null) {
      const { x, y } = positionRef.current;
      walkTarget.current = clampPosition(x + (x > window.innerWidth / 2 ? -320 : 320), y);
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
      const stride = (WALK_SPEED * dt) / distance;
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
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!isOpen && talkingRef.current) endConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) {
    return (
      <button type="button" onClick={onToggleOpen} className="fixed bottom-4 right-4 z-50 lab-btn zoe-glow" title="Llamar a ZOE">
        <Bot className="w-4 h-4 text-[#27DCFF]" aria-hidden="true" /> ZOE
      </button>
    );
  }

  const status = voice.listening ? 'Te escucho…' : behavior === 'thinking' ? 'Pensando…' : null;
  const toolbar: Array<{ label: string; icon: React.ReactNode; onClick: () => void; pressed?: boolean; color: string }> = [
    { label: talking ? 'Terminar la conversación' : 'Conversar con ZOE', icon: <Mic className="w-4 h-4" />, onClick: () => (talking ? endConversation() : void startConversation()), pressed: talking, color: '#27DCFF' },
    { label: voice.muted ? 'Activar la voz de ZOE' : 'Silenciar la voz de ZOE', icon: voice.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />, onClick: voice.toggleMuted, pressed: voice.muted, color: '#5EC2DD' },
    { label: posture === 'sitting' ? 'Poner de pie a ZOE' : 'Sentar a ZOE', icon: <Dog className="w-4 h-4" />, onClick: () => { wake(); setPosture(posture === 'sitting' ? 'standing' : 'sitting'); }, color: '#F29F05' },
    { label: isWalking ? 'Detener la caminata' : 'Poner a caminar a ZOE', icon: <Footprints className="w-4 h-4" />, onClick: () => (isWalking ? wake() : void stroll()), pressed: isWalking, color: '#A8C63C' },
    { label: napping ? 'Despertar a ZOE' : 'Que ZOE busque dónde dormir', icon: <Moon className="w-4 h-4" />, onClick: () => (napping ? wake() : void nap()), pressed: napping, color: '#B85EFF' },
    { label: show360 ? 'Quitar el entorno 360°' : 'Activar el entorno 360°', icon: <Globe className="w-4 h-4" />, onClick: () => setShow360((v) => !v), pressed: show360, color: '#27DCFF' },
    { label: 'Acariciar a ZOE', icon: <Heart className="w-4 h-4" />, onClick: pet, color: '#F29F05' },
  ];

  return (
    <div className="zoe-stage fixed z-40 group" style={{ left: position.x, top: position.y, width: STAGE.width + 44, height: STAGE.height }}>
      {/* Subtítulos: lo que ZOE dice, también para quien no puede oírlo. No es un chat. */}
      {(caption || status || heard) && (
        <div className={`zoe-caption ${position.x < window.innerWidth / 2 ? 'zoe-caption-left' : ''}`} role="status" aria-live="polite">
          {talking && (
            <button type="button" className="zoe-caption-close" onClick={endConversation} aria-label="Terminar la conversación">
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
          {heard && status && <p className="text-[11px] italic text-brand-textMuted mb-1">«{heard}»</p>}
          {status ? <p className={voice.listening ? 'zoe-status zoe-status-on' : 'zoe-status'}>{status}</p> : <p>{caption}</p>}
          {voice.listening && (
            <span className="zoe-level-track" aria-hidden="true">
              <span ref={levelRef} className="zoe-level" />
            </span>
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
            <ZoeCanvas3D behavior={behavior} isWalking={isWalking} facing={facing} posture={posture} show360Environment={show360} petTrigger={petCounter} />
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

      <div className="zoe-toolbar" role="toolbar" aria-label="Controles de ZOE">
        {toolbar.map((b) => (
          <button key={b.label} type="button" className="zoe-tool" style={{ color: b.color }} title={b.label} aria-label={b.label} aria-pressed={b.pressed} onClick={b.onClick}>
            {b.icon}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ZoeFreePresence;
