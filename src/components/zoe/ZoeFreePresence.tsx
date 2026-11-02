import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Mic,
  Volume2,
  VolumeX,
  X,
  Heart,
  Bot,
  Move,
  Footprints,
  Globe,
  Dog
} from 'lucide-react';
import { ZoeCanvas3D, ZoeSoulState } from './ZoeCanvas3D';
import { ToolId } from '../layout/Header';
import { askZoeGemini } from '@/services/zoeAi';

interface ZoeFreePresenceProps {
  currentTool: ToolId;
  onSelectTool: (tool: ToolId) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const ZoeFreePresence: React.FC<ZoeFreePresenceProps> = ({
  currentTool,
  onSelectTool,
  theme,
  onToggleTheme,
  isOpen,
  onToggleOpen,
}) => {
  // Estado inicial: 'sitting' (sentado según la lámina y biblia del personaje)
  const [behavior, setBehavior] = useState<ZoeSoulState>('sitting');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [speechBubbleText, setSpeechBubbleText] = useState<string>(
    '¡Hola! Soy Zoe, tu perrito en el Laboratorio de Innovación. ¡Puedes moverme a donde quieras o hablarme por voz!'
  );
  const [showSpeechBubble, setShowSpeechBubble] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [petCounter, setPetCounter] = useState<number>(0);
  const [isWalking, setIsWalking] = useState<boolean>(false);
  const [posture, setPosture] = useState<'sitting' | 'standing'>('sitting');
  const [show360Environment, setShow360Environment] = useState<boolean>(false);

  const togglePosture = () => {
    // Si estaba caminando, se detiene y se sienta o para
    if (isWalking) {
      setIsWalking(false);
      setPosture('sitting');
      speakText('Me siento en calma a tu lado.');
      return;
    }

    setPosture((prev) => {
      const next = prev === 'sitting' ? 'standing' : 'sitting';
      if (next === 'sitting') {
        speakText('Me siento aquí en reposo, siempre alerta y fiel contigo.');
      } else {
        speakText('Me pongo de pie, listo y atento para innovar.');
      }
      return next;
    });
  };

  const toggle360Environment = () => {
    setShow360Environment((prev) => {
      const next = !prev;
      if (next) {
        speakText('¡Entorno 360 activado! Cúpula holográfica y anillos cuánticos en órbita.');
      } else {
        speakText('Modo libre y transparente activado.');
      }
      return next;
    });
  };

  const toggleWalking = () => {
    setIsWalking((prev) => {
      const next = !prev;
      if (next) {
        speakText('¡Avanzamos juntos por el laboratorio! Marchando a tu lado.');
      } else {
        speakText('Me quedo aquí quieto y atento observando el laboratorio.');
      }
      return next;
    });
  };

  // =========================================================================
  // LIBERTAD DE MOVIMIENTO: POSICIÓN FLOTANTE ARRASTRABLE POR TODA LA PANTALLA
  // Vive libre en la interfaz, sin marcos, y el usuario puede moverlo a cualquier lugar
  // =========================================================================
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined') {
      const maxX = Math.max(10, window.innerWidth - 380);
      const maxY = Math.max(40, window.innerHeight - 380);
      const saved = localStorage.getItem('innovahub_zoe_pos');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            x: Math.max(10, Math.min(parsed.x, maxX)),
            y: Math.max(40, Math.min(parsed.y, maxY)),
          };
        } catch (e) {}
      }
      return {
        x: maxX,
        y: maxY,
      };
    }
    return { x: 900, y: 450 };
  });

  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });
  const hasMovedRef = useRef<boolean>(false);

  const recognitionRef = useRef<any>(null);
  const speechTimeoutRef = useRef<any>(null);

  // Manejo de Arrastre Libre (Mouse y Touch)
  const handlePointerDown = (e: React.PointerEvent) => {
    // Si se hizo clic en un botón interactivo (micrófono o silenciar), no arrastrar
    if ((e.target as HTMLElement).closest('button')) return;

    isDraggingRef.current = true;
    hasMovedRef.current = false;
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: position.x,
      startY: position.y,
    };
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;

      if (Math.hypot(dx, dy) > 4) {
        hasMovedRef.current = true;
        const maxX = Math.max(10, window.innerWidth - 360);
        const maxY = Math.max(10, window.innerHeight - 370);
        const nextX = Math.max(10, Math.min(maxX, dragStartRef.current.startX + dx));
        const nextY = Math.max(10, Math.min(maxY, dragStartRef.current.startY + dy));
        setPosition({ x: nextX, y: nextY });
      }
    };

    const handlePointerUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        if (!hasMovedRef.current) {
          // Fue un clic simple sobre Zoe -> Acariciar
          handlePetZoe();
        } else {
          localStorage.setItem('innovahub_zoe_pos', JSON.stringify(position));
        }
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [position]);

  // =========================================================================
  // SINTETIZADOR DE VOZ: NIÑO MACHO EN ESPAÑOL LATINO NEUTRO (SIN ACENTOS)
  // =========================================================================
  const speakText = (text: string, onEndCallback?: () => void) => {
    setSpeechBubbleText(text);
    setShowSpeechBubble(true);
    setBehavior('speaking');

    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    speechTimeoutRef.current = setTimeout(() => {
      setShowSpeechBubble(false);
      setBehavior('sitting');
    }, Math.max(4500, text.length * 85));

    if (!isMuted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);

      // Timbre dulce de niño macho (Pitch 1.38, alegre y sin tono robot)
      utterance.pitch = 1.38;
      utterance.rate = 1.03;

      const voices = window.speechSynthesis.getVoices();

      // Prioridad a voces latinoamericanas o neutras
      const latinVoice =
        voices.find(
          (v) =>
            (v.lang.startsWith('es-419') ||
              v.lang.startsWith('es-MX') ||
              v.lang.startsWith('es-CO') ||
              v.lang.startsWith('es-US') ||
              v.lang.startsWith('es-AR') ||
              v.lang.startsWith('es-CL')) &&
            (v.name.includes('Raul') ||
              v.name.includes('Jorge') ||
              v.name.includes('Diego') ||
              v.name.includes('Carlos') ||
              v.name.includes('Alonso') ||
              v.name.includes('Male') ||
              v.name.includes('Natural'))
        ) ||
        voices.find(
          (v) =>
            v.lang.startsWith('es-419') ||
            v.lang.startsWith('es-MX') ||
            v.lang.startsWith('es-CO') ||
            v.lang.startsWith('es-US')
        ) ||
        voices.find(
          (v) =>
            v.lang.startsWith('es') &&
            !v.lang.includes('ES') &&
            (v.name.includes('Male') || v.name.includes('Raul') || v.name.includes('Jorge'))
        ) ||
        voices.find((v) => v.lang.startsWith('es') && !v.lang.includes('ES')) ||
        voices.find((v) => v.lang.startsWith('es'));

      if (latinVoice) {
        utterance.voice = latinVoice;
        utterance.lang = latinVoice.lang;
      } else {
        utterance.lang = 'es-419';
      }

      utterance.onend = () => {
        setBehavior('sitting');
        if (onEndCallback) onEndCallback();
      };
      utterance.onerror = () => {
        setBehavior('sitting');
        if (onEndCallback) onEndCallback();
      };

      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => {
        setBehavior('sitting');
        if (onEndCallback) onEndCallback();
      }, Math.max(3000, text.length * 60));
    }
  };

  // =========================================================================
  // RECONOCIMIENTO DE VOZ E INTERACCIÓN CON GEMINI IA
  // =========================================================================
  const toggleVoiceRecognition = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      setBehavior('sitting');
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      speakText('¡Guau! Tu navegador no tiene micrófono, pero puedes acariciarme y estaré siempre contigo.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'es-419';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        setBehavior('listening');
        setSpeechBubbleText('¡Te escucho! Dime qué hacemos en el laboratorio...');
        setShowSpeechBubble(true);
      };

      recognition.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript.trim();
        setIsListening(false);
        setIsThinking(true);
        setBehavior('explaining');
        setSpeechBubbleText(`Pensando en "${transcript}"... ✨`);

        const lower = transcript.toLowerCase();
        let navigated = false;

        // Comandos de voz de navegación rápida
        if (lower.includes('radar') || lower.includes('señales') || lower.includes('vigilancia')) {
          onSelectTool('radar');
          navigated = true;
        } else if (lower.includes('estudio') || lower.includes('territorio') || lower.includes('zonal')) {
          onSelectTool('estudio');
          navigated = true;
        } else if (lower.includes('ideación') || lower.includes('ideacion') || lower.includes('tema')) {
          onSelectTool('ideacion');
          navigated = true;
        } else if (lower.includes('árbol') || lower.includes('arbol') || lower.includes('holográfico')) {
          onSelectTool('arbol');
          navigated = true;
        } else if (lower.includes('prototipo') || lower.includes('prototipado') || lower.includes('solución')) {
          onSelectTool('prototipado');
          navigated = true;
        } else if (lower.includes('inicio') || lower.includes('portada') || lower.includes('casa')) {
          onSelectTool('portal');
          navigated = true;
        } else if (lower.includes('claro') || lower.includes('día') || lower.includes('blanco')) {
          if (theme !== 'light') onToggleTheme();
          navigated = true;
        } else if (lower.includes('oscuro') || lower.includes('noche')) {
          if (theme !== 'dark') onToggleTheme();
          navigated = true;
        } else if (lower.includes('duerme') || lower.includes('siesta') || lower.includes('descansa')) {
          setBehavior('sleeping');
          speakText('¡Zzz! Me acuesto a descansar un ratito...');
          setIsThinking(false);
          return;
        }

        // Consulta a Gemini IA
        try {
          const aiResponse = await askZoeGemini(transcript, currentTool);
          setIsThinking(false);
          speakText(aiResponse);
        } catch (e) {
          setIsThinking(false);
          speakText(
            navigated
              ? '¡Listo! Ya te llevé a la herramienta. ¿Qué analizamos ahora?'
              : '¡Guau! Me encanta explorar esto contigo. ¡Sigamos innovando en el territorio!'
          );
        }
      };

      recognition.onerror = (e: any) => {
        console.warn('[ZOE Voice] Error en reconocimiento:', e);
        setIsListening(false);
        setIsThinking(false);
        setBehavior('sitting');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.warn('[ZOE Voice] Error al inicializar audio:', err);
      setIsListening(false);
      setIsThinking(false);
    }
  };

  // Reacción de Acariciar (Petting) con micro-olfateo noble
  const handlePetZoe = () => {
    setPetCounter((prev) => prev + 1);
    const joyfulResponses = [
      '¡Guau! ¡Qué rico cariño! Siempre estoy aquí contigo en el laboratorio.',
      '¡Me encantan las caricias! Soy tu compañero fiel en este espacio de innovación.',
      '¡Guau, guau! ¡Toda mi atención está lista para lo que necesites!',
      '¡Qué buen amigo eres! ¿Revisamos alguna idea, diagnóstico o proyecto juntos?',
    ];
    const chosen = joyfulResponses[Math.floor(Math.random() * joyfulResponses.length)];
    speakText(chosen);
  };

  // Saludo contextual cuando cambia de herramienta
  useEffect(() => {
    let comment = '';
    if (currentTool === 'radar') {
      comment = '¡Llegamos al Radar de Innovación! Treinta y una señales tecnológicas activas.';
    } else if (currentTool === 'estudio') {
      comment = 'Estudio Territorial en pantalla: doce bloques para caracterizar la región.';
    } else if (currentTool === 'ideacion') {
      comment = '¡Ideación Estratégica! Aquí elegimos el tema ancla que guiará el proyecto.';
    } else if (currentTool === 'arbol') {
      comment = '¡El Árbol de Innovación! Circuito holográfico diez, cinco, tres.';
    } else if (currentTool === 'prototipado') {
      comment = '¡Banco de Prototipado Rápido con IA! Estructuramos planes de solución.';
    } else if (currentTool === 'portal') {
      comment = '¡Bienvenido al Observatorio InnovaHub360! Esta es mi casa: el Laboratorio de Innovación.';
    }

    if (comment) {
      setSpeechBubbleText(comment);
      setShowSpeechBubble(true);
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
      speechTimeoutRef.current = setTimeout(() => {
        setShowSpeechBubble(false);
      }, 5000);
    }
  }, [currentTool]);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={onToggleOpen}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2 rounded-full g border border-[#27DCFF]/40 text-[#27DCFF] hover:scale-105 transition-all shadow-[0_0_20px_rgba(39,220,255,0.3)] cursor-pointer zoe-glow"
        title="Llamar a ZOE"
      >
        <Bot className="w-5 h-5 text-[#27DCFF]" />
        <span className="text-xs font-bold sy tracking-wide">ZOE</span>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#27DCFF] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#27DCFF]"></span>
        </span>
      </button>
    );
  }

  return (
    // =========================================================================
    // ENTORNO FLOTANTE TOTALMENTE LIBRE (SIN MARCO, SIN CAJAS, ARRASTRABLE)
    // El holograma vive directamente en la interfaz y puede moverse libremente
    // =========================================================================
    <div
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      className="fixed z-50 pointer-events-auto select-none touch-none flex flex-col items-center cursor-grab active:cursor-grabbing"
      onPointerDown={handlePointerDown}
    >
      {/* Burbuja Flotante de Diálogo (Aparece sólo cuando habla o escucha, flotando sobre su cabeza sin empujarlo) */}
      {showSpeechBubble && (
        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-[270px] sm:w-[320px] g2 p-3 rounded-2xl border border-[#27DCFF]/30 shadow-[0_0_20px_rgba(39,220,255,0.15)] backdrop-blur-md z-20 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#27DCFF] m flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#27DCFF]" />
              ZOE · Alma de Innovación
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted(!isMuted);
                }}
                className="text-white/60 hover:text-white transition-colors cursor-pointer"
                title={isMuted ? 'Activar voz' : 'Silenciar voz'}
              >
                {isMuted ? (
                  <VolumeX className="w-3 h-3 text-red-400" />
                ) : (
                  <Volume2 className="w-3 h-3 text-[#27DCFF]" />
                )}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSpeechBubble(false);
                }}
                className="text-white/40 hover:text-white transition-colors cursor-pointer"
                title="Cerrar diálogo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <p className="text-xs text-white font-medium leading-relaxed sy">
            {speechBubbleText}
          </p>

          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#0C5E78]/90 border-r border-b border-[#27DCFF]/30 rotate-45" />
        </div>
      )}

      {/* Contenedor de ZOE (Tamaño Más Grande y Majestuoso) + Botones flotando a su lado */}
      <div className="relative flex items-center select-none">
        {/* Holograma 3D de ZOE (Escala ampliada, cuerpo completo sin marcos) */}
        <div className="relative w-[280px] sm:w-[320px] h-[300px] sm:h-[340px] flex items-center justify-center bg-transparent cursor-grab active:cursor-grabbing">
          <ZoeCanvas3D
            behavior={behavior}
            state={behavior}
            isListening={isListening}
            isWalking={isWalking}
            posture={posture}
            show360Environment={show360Environment}
            petTrigger={petCounter}
            onPet={handlePetZoe}
          />

          {/* Indicador sutil de que se puede arrastrar */}
          <div
            className="absolute top-2 right-3 opacity-30 hover:opacity-80 transition-opacity text-[#27DCFF] cursor-grab"
            title="Puedes arrastrar a ZOE por toda la pantalla"
          >
            <Move className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Cinco íconos flotando junto a Zoe a un lado: Sentarse/Pararse, Caminar/Quieto, Entorno 360°, Micrófono y Corazón */}
        <div className="flex flex-col items-center gap-2.5 -ml-2 pointer-events-auto z-10">
          {/* Botón Alternador: Postura Canina (Sentado vs De Pie Estático) */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              togglePosture();
            }}
            className={`p-2.5 rounded-full backdrop-blur-md transition-all cursor-pointer flex items-center justify-center border shadow-lg ${
              !isWalking && posture === 'sitting'
                ? 'bg-[#F29F05] text-[#04222B] border-[#F29F05] shadow-[0_0_15px_rgba(242,159,5,0.7)] scale-110'
                : 'bg-[#04222B]/85 text-[#F29F05] border-[#F29F05]/40 shadow-[0_0_12px_rgba(242,159,5,0.25)] hover:border-[#F29F05] hover:bg-[#0A4A5C] hover:scale-110'
            }`}
            title={
              isWalking
                ? 'ZOE Caminando · Clic para sentarlo en reposo'
                : posture === 'sitting'
                ? 'ZOE Sentado en reposo · Clic para ponerlo De Pie estático'
                : 'ZOE De Pie estático · Clic para Sentarlo en reposo'
            }
          >
            <Dog className="w-4 h-4" />
          </button>

          {/* Botón Alternador: Quieto o Caminando */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleWalking();
            }}
            className={`p-2.5 rounded-full backdrop-blur-md transition-all cursor-pointer flex items-center justify-center border shadow-lg ${
              isWalking
                ? 'bg-[#A8C63C] text-[#04222B] border-[#A8C63C] shadow-[0_0_15px_rgba(168,198,60,0.7)] scale-110'
                : 'bg-[#04222B]/85 text-[#A8C63C] border-[#A8C63C]/40 shadow-[0_0_12px_rgba(168,198,60,0.25)] hover:border-[#A8C63C] hover:bg-[#0A4A5C] hover:scale-110'
            }`}
            title={isWalking ? 'ZOE Caminando (con corrección) · Clic para detenerlo y dejarlo Quieto' : 'ZOE Quieto · Clic para ponerlo a Caminar'}
          >
            <Footprints className="w-4 h-4" />
          </button>

          {/* Botón Alternador Opcional: Entorno 360° Holográfico */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggle360Environment();
            }}
            className={`p-2.5 rounded-full backdrop-blur-md transition-all cursor-pointer flex items-center justify-center border shadow-lg ${
              show360Environment
                ? 'bg-[#27DCFF] text-[#04222B] border-[#27DCFF] shadow-[0_0_15px_rgba(39,220,255,0.8)] scale-110'
                : 'bg-[#04222B]/85 text-[#27DCFF]/80 border-[#27DCFF]/40 shadow-[0_0_12px_rgba(39,220,255,0.2)] hover:border-[#27DCFF] hover:text-[#27DCFF] hover:bg-[#0C5E78] hover:scale-110'
            }`}
            title={show360Environment ? 'Domo 360° Activo · Clic para volver a modo libre transparente' : 'Activar Entorno 360° Opcional (Domo, anillos orbitales y giro)'}
          >
            <Globe className="w-4 h-4" />
          </button>

          {/* Botón Flotante Discreto de Micrófono para Hablar con Gemini */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleVoiceRecognition();
            }}
            className={`p-2.5 rounded-full backdrop-blur-md transition-all cursor-pointer flex items-center justify-center border shadow-lg ${
              isListening
                ? 'bg-[#F29F05] text-[#04222B] border-[#F29F05] shadow-[0_0_15px_rgba(242,159,5,0.7)] animate-bounce scale-110'
                : 'bg-[#04222B]/85 text-[#27DCFF] border-[#27DCFF]/40 shadow-[0_0_12px_rgba(39,220,255,0.25)] hover:border-[#27DCFF] hover:bg-[#0C5E78] hover:scale-110'
            }`}
            title={isListening ? 'Escuchando tu voz...' : 'Hablar con ZOE (Voz latina e IA Gemini)'}
          >
            <Mic className={`w-4 h-4 ${isListening ? 'text-[#04222B]' : 'text-[#27DCFF]'}`} />
          </button>

          {/* Botón Discreto para Acariciar / Activar Olfateo Noble */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePetZoe();
            }}
            className="p-2.5 rounded-full bg-[#04222B]/85 backdrop-blur-md border border-[#F29F05]/40 shadow-[0_0_12px_rgba(242,159,5,0.25)] text-[#F29F05] hover:border-[#F29F05] hover:bg-[#0C5E78] hover:scale-110 transition-all cursor-pointer flex items-center justify-center"
            title="Acariciar a ZOE (Olfateo y ternura)"
          >
            <Heart className="w-4 h-4 text-[#F29F05] fill-[#F29F05]" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ZoeFreePresence;
