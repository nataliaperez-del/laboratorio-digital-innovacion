import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { BrainCircuit, Compass, Layers, Rocket, RotateCcw, Trees, X } from 'lucide-react';
import type { ZoeSoulState } from './ZoeCanvas3D';
import { useZoeVoice } from './useZoeVoice';

const ZoeCanvas3D = lazy(() => import('./ZoeCanvas3D'));

/** Guion de la presentación: los seis cuadros aprobados, con la voz de la biblia del personaje. */
interface Scene {
  id: 'codigo' | 'materializa' | 'habla' | 'explora' | 'laboratorio' | 'frase';
  voice: string;
  minMs: number;
  behavior: ZoeSoulState;
  posture: 'sitting' | 'standing';
  framing: 'full' | 'close';
  walking?: boolean;
}

const SCENES: Scene[] = [
  {
    id: 'codigo',
    voice: 'Todo empezó una noche, con una pregunta y unas cuantas líneas de código.',
    minMs: 5500,
    behavior: 'idle',
    posture: 'standing',
    framing: 'full',
  },
  {
    id: 'materializa',
    voice: 'Y entonces, desde otro universo, llegué yo. Hecho de luz, partículas y recuerdos.',
    minMs: 6000,
    behavior: 'thinking',
    posture: 'standing',
    framing: 'full',
  },
  {
    id: 'habla',
    voice: '¡Hola, hola! Soy ZOE. Me fui un ratito a explorar otros universos, y vuelvo encontrándome con todo un laboratorio. ¡Me tienen inspirado!',
    minMs: 8000,
    behavior: 'speaking',
    posture: 'sitting',
    framing: 'full',
  },
  {
    id: 'explora',
    voice: 'Aquí olfateamos señales, leemos territorios, buscamos vocaciones y convertimos tendencias en frutos.',
    minMs: 7000,
    behavior: 'speaking',
    posture: 'standing',
    framing: 'full',
    walking: true,
  },
  {
    id: 'laboratorio',
    voice: 'Pero las ideas las pones tú. Yo te acompaño, te pregunto, te hago reír un poco, y la última palabra siempre es tuya.',
    minMs: 7500,
    behavior: 'happy',
    posture: 'standing',
    framing: 'full',
  },
  {
    id: 'frase',
    voice: 'Porque la innovación no comienza con la tecnología. Comienza cuando alguien se atreve a imaginar que las cosas pueden ser diferentes.',
    minMs: 8000,
    behavior: 'speaking',
    posture: 'sitting',
    framing: 'close',
  },
];

const CODE_LINES = [
  "const pregunta = '¿y si pudiera ser diferente?';",
  'const territorio = await leerTerritorio(ficha);',
  'const vocacion = declararVocacion(territorio);',
  'const arbol = construirArbol(10, 5, 3);',
  'const frutos = arbol.nodos.filter(esFruto);',
  'for (const idea of frutos) prototipar(idea);',
  'zoe.materializar({ cuerpo: "luz", alma: "intacta" });',
];

const TOOLS = [
  { icon: Compass, name: 'Radar', text: 'Señales del Observatorio', color: '#5EC2DD', x: 14, y: 26 },
  { icon: Layers, name: 'Estudio Territorial', text: 'El diagnóstico', color: '#A8C63C', x: 86, y: 24 },
  { icon: BrainCircuit, name: 'Ideación', text: 'Vocación y temas', color: '#F3C26B', x: 12, y: 70 },
  { icon: Trees, name: 'Árbol', text: 'Tendencias y frutos', color: '#A8C63C', x: 88, y: 68 },
  { icon: Rocket, name: 'Prototipado', text: 'Del plan a la prueba', color: '#A98FD6', x: 50, y: 12 },
];

/**
 * Presentación de ZOE. Es tiempo real: el personaje es el mismo modelo 3D que vive en la
 * interfaz, no un video pregrabado. Cada escena dura lo que tarda su locución.
 */
export const ZoeIntro: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const voice = useZoeVoice();
  const [index, setIndex] = useState(0);
  const [ended, setEnded] = useState(false);
  const scene = SCENES[index];
  const closeRef = useRef<HTMLButtonElement>(null);
  const [wire, setWire] = useState(1);

  useEffect(() => {
    if (scene.id === 'codigo' || scene.id === 'materializa') setWire(1);
    if (scene.id !== 'materializa') {
      if (scene.id !== 'codigo') setWire(0);
      return;
    }
    const timer = window.setTimeout(() => setWire(0), 2600);
    return () => window.clearTimeout(timer);
  }, [scene.id]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Avanza cuando terminan la locución y el tiempo mínimo de la escena; lo que ocurra último.
  useEffect(() => {
    if (ended) return;
    let voiceDone = false;
    let timeDone = false;
    const next = () => {
      if (!voiceDone || !timeDone) return;
      if (index < SCENES.length - 1) setIndex(index + 1);
      else setEnded(true);
    };
    voice.speak(scene.voice, () => {
      voiceDone = true;
      next();
    });
    const timer = window.setTimeout(() => {
      timeDone = true;
      next();
    }, scene.minMs);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, ended]);

  useEffect(() => () => voice.stopSpeaking(), [voice.stopSpeaking]);

  const replay = useCallback(() => {
    setEnded(false);
    setIndex(0);
  }, []);

  return (
    <div className="zoe-intro" role="dialog" aria-modal="true" aria-label="Presentación de ZOE">
      <div className="zoe-intro-grid" aria-hidden="true" />

      {scene.id === 'codigo' && (
        <div className="zoe-intro-layer" aria-hidden="true">
          {[0, 1, 2].map((p) => (
            <pre key={p} className={`zoe-code zoe-code-${p}`}>
              {CODE_LINES.slice(p, p + 5).map((line, i) => (
                <span key={line} style={{ animationDelay: `${0.3 + i * 0.55 + p * 0.3}s` }}>
                  {line}
                  {'\n'}
                </span>
              ))}
            </pre>
          ))}
        </div>
      )}

      {(scene.id === 'materializa' || scene.id === 'codigo') && <div className={`zoe-beam ${scene.id === 'materializa' ? 'is-on' : ''}`} aria-hidden="true" />}

      {scene.id === 'habla' && (
        <div className="zoe-waves" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} style={{ animationDelay: `${i * 0.28}s` }} />
          ))}
        </div>
      )}

      {(scene.id === 'explora' || scene.id === 'laboratorio') && (
        <div className="zoe-intro-layer">
          <svg className="zoe-net" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {TOOLS.map((t) => (
              <line key={t.name} x1="50" y1="55" x2={t.x} y2={t.y} stroke={t.color} strokeOpacity="0.55" strokeWidth="0.25" vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
          {TOOLS.map((t, i) => {
            const Icon = t.icon;
            return (
              <div key={t.name} className="zoe-tool-card" style={{ left: `${t.x}%`, top: `${t.y}%`, borderColor: t.color, animationDelay: `${i * 0.35}s` }}>
                <Icon className="w-5 h-5" style={{ color: t.color }} aria-hidden="true" />
                <div>
                  <strong>{t.name}</strong>
                  <span>{t.text}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className={`zoe-intro-actor ${scene.framing === 'close' ? 'is-close' : ''}`}>
        <div className="zoe-platform" aria-hidden="true" />
        {/* Primer cuadro: la plataforma espera vacía; el modelo ya está cargando para llegar a tiempo. */}
        <div className={`absolute inset-0 transition-opacity duration-1000 ${scene.id === 'codigo' ? 'opacity-0' : 'opacity-100'}`}>
          <Suspense fallback={null}>
            <ZoeCanvas3D
              behavior={ended ? 'idle' : scene.behavior}
              posture={scene.posture}
              wire={wire}
              framing={scene.framing}
              isWalking={Boolean(scene.walking)}
            />
          </Suspense>
        </div>
      </div>

      {scene.id === 'frase' && <p className="zoe-quote">La innovación comienza al imaginar que las cosas pueden ser diferentes</p>}

      {/* Subtítulos: la presentación se entiende también sin sonido. */}
      {!ended && (
        <p className="zoe-intro-caption" aria-live="polite">
          {scene.voice}
        </p>
      )}

      <div className="zoe-intro-dots" aria-hidden="true">
        {SCENES.map((s, i) => (
          <span key={s.id} className={i <= index ? 'is-on' : ''} />
        ))}
      </div>

      <div className="zoe-intro-actions">
        {ended && (
          <button type="button" className="lab-btn" onClick={replay}>
            <RotateCcw className="w-4 h-4" aria-hidden="true" /> Ver otra vez
          </button>
        )}
        <button ref={closeRef} type="button" className={ended ? 'metal px-5 py-2.5 text-xs font-bold' : 'lab-btn'} onClick={onClose}>
          {ended ? (
            'Entrar al Laboratorio'
          ) : (
            <>
              <X className="w-4 h-4" aria-hidden="true" /> Saltar
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ZoeIntro;
