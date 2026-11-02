import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Layers,
  BrainCircuit,
  Trees,
  Rocket,
  Play,
  Sparkles
} from 'lucide-react';
import { ToolId } from '../layout/Header';

interface PortalCatalogProps {
  onSelectTool: (tool: ToolId) => void;
  onOpenZoe: (text?: string) => void;
  onPlayIntro: () => void;
}

export const PortalCatalog: React.FC<PortalCatalogProps> = ({
  onSelectTool,
  onOpenZoe,
}) => {
  // 0: Presentación del LAB, 1: Video Proyección Holográfica de ZOE
  const [slideIndex, setSlideIndex] = useState<0 | 1>(0);
  const [isHovered, setIsHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Transición automática cíclica fluida: 20 segundos para la presentación y 20 segundos para el video
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (!isHovered) {
      if (slideIndex === 0) {
        // En presentación: esperar exactamente 20 segundos y pasar suavemente al video
        timer = setTimeout(() => {
          setSlideIndex(1);
        }, 20000);
      } else {
        // En video: proyectar durante exactamente 20 segundos y retornar suavemente a la presentación
        timer = setTimeout(() => {
          setSlideIndex(0);
        }, 20000);
      }
    }

    return () => clearTimeout(timer);
  }, [slideIndex, isHovered]);

  // Manejo de reproducción de video sincronizada con el slide
  useEffect(() => {
    if (slideIndex === 1 && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {
        // Silenciar autoplay si el navegador lo bloquea con sonido
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play().catch(() => {});
        }
      });
    } else if (slideIndex === 0 && videoRef.current) {
      videoRef.current.pause();
    }
  }, [slideIndex]);

  const tools = [
    {
      id: 'estudio' as ToolId,
      name: 'Estudio Territorial',
      desc: 'Diagnóstico en 12 puntos y fuentes regionales',
      icon: Layers,
      color: '#A8C63C',
    },
    {
      id: 'ideacion' as ToolId,
      name: 'Ideación Estratégica',
      desc: 'Vocación productiva y selección de temas',
      icon: BrainCircuit,
      color: '#F29F05',
    },
    {
      id: 'arbol' as ToolId,
      name: 'Árbol de Innovación',
      desc: 'Circuito 10 globales · 5 Colombia · 3 territorio',
      icon: Trees,
      color: '#5EC2DD',
    },
    {
      id: 'prototipado' as ToolId,
      name: 'Banco de Prototipado',
      desc: 'Planes de solución e hipótesis con IA',
      icon: Rocket,
      color: '#A98FD6',
    },
  ];

  return (
    <div
      className="relative w-full h-full flex-1 flex items-center justify-center overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* =========================================================================
          SLIDE 1: PRESENTACIÓN OFICIAL DEL LABORATORIO
          Cubre toda la sección con bordes holográficos desvanecidos hacia el fondo
          ========================================================================= */}
      <div
        className={`absolute inset-0 w-full h-full flex flex-col justify-center items-center transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          slideIndex === 0
            ? 'opacity-100 translate-x-0 pointer-events-auto z-10'
            : 'opacity-0 -translate-x-full pointer-events-none z-0'
        }`}
      >
        <section
          className="relative w-full h-full flex flex-col justify-between p-6 sm:p-10 md:p-12 overflow-hidden"
          style={{
            // Fondo de vidrio holográfico con bordes que se desvanecen gradualmente en transparencia
            background:
              'radial-gradient(ellipse 95% 90% at 50% 50%, rgba(4, 34, 43, 0.72) 0%, rgba(4, 34, 43, 0.45) 55%, rgba(2, 20, 26, 0.15) 85%, transparent 100%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 98% 95% at 50% 50%, black 75%, transparent 100%)',
            maskImage:
              'radial-gradient(ellipse 98% 95% at 50% 50%, black 75%, transparent 100%)',
          }}
        >
          {/* Halo sutil de luz holográfica central */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] pointer-events-none rounded-full opacity-25"
            style={{
              background: 'radial-gradient(ellipse, rgba(39,220,255,0.35) 0%, rgba(4,34,43,0) 70%)',
            }}
          />

          {/* Líneas tenues de holograma que se desvanecen */}
          <div
            className="absolute inset-0 pointer-events-none opacity-15"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(39,220,255,0.06) 3px, rgba(39,220,255,0.06) 4px)',
            }}
          />

          {/* Bloque Superior y Contenido Principal */}
          <div className="relative z-10 max-w-5xl mx-auto w-full my-auto space-y-4 sm:space-y-5">
            {/* Título Principal */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-tight sy drop-shadow-[0_4px_16px_rgba(39,220,255,0.25)]">
              Laboratorio de Innovación en Línea
            </h1>

            {/* Texto de Bienvenida Mejorado: Nace y vive en el Observatorio pero con identidad propia de prototipado y acción */}
            <p className="text-sm sm:text-base md:text-lg text-[#CFE0E6] leading-relaxed max-w-4xl">
              Entorno interactivo de experimentación y prototipado rápido concebido dentro del Observatorio InnovaHub360. Aquí la inteligencia territorial se convierte en acción: caracterizas desafíos regionales, descubres tendencias en árboles holográficos de innovación y formulas planes de prototipado listos para el territorio, asistido en cada fase por <strong>ZOE</strong>.
            </p>

            {/* Accesos directos a las 4 herramientas del LAB */}
            <div className="pt-2">
              <span className="text-[11px] uppercase tracking-wider text-[#5EC2DD] font-bold block mb-3 m">
                Herramientas Disponibles en el Laboratorio:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {tools.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onSelectTool(t.id)}
                      className="p-4 rounded-2xl bg-white/[0.04] backdrop-blur-md hover:bg-[#27DCFF]/10 transition-all text-left flex flex-col justify-between group cursor-pointer hover:scale-[1.02] shadow-sm hover:shadow-[0_0_20px_rgba(39,220,255,0.25)]"
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center border"
                          style={{
                            backgroundColor: `${t.color}20`,
                            borderColor: `${t.color}55`,
                          }}
                        >
                          <Icon className="w-4.5 h-4.5" style={{ color: t.color }} />
                        </div>
                        <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-[#27DCFF] group-hover:translate-x-1 transition-all" />
                      </div>
                      <div>
                        <span className="text-base font-bold text-white sy group-hover:text-[#5EC2DD] transition-colors block">
                          {t.name}
                        </span>
                        <span className="text-xs text-[#A6C0CA] block mt-1 leading-snug">
                          {t.desc}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Barra Inferior Flotante: Indicadores y Botones de Acción */}
          <div className="relative z-10 max-w-5xl mx-auto w-full pt-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setSlideIndex(0)}
                className="w-3 h-3 rounded-full bg-[#27DCFF] shadow-[0_0_10px_#27DCFF] cursor-pointer transition-transform hover:scale-125"
                title="Presentación del Laboratorio"
              />
              <button
                type="button"
                onClick={() => setSlideIndex(1)}
                className="w-2.5 h-2.5 rounded-full bg-white/30 hover:bg-[#27DCFF] cursor-pointer transition-all hover:scale-125"
                title="Ver Proyección Holográfica de ZOE"
              />
              <span className="text-xs text-[#5EC2DD] m ml-1 font-mono tracking-wide">
                Presentación 01 / 02
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onOpenZoe()}
                className="px-4 py-2.5 rounded-full bg-white/5 backdrop-blur-md text-xs font-semibold text-[#27DCFF] border border-[#27DCFF]/40 hover:bg-[#27DCFF]/15 flex items-center gap-2 cursor-pointer transition-all shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#27DCFF]" />
                <span>Hablar con ZOE</span>
              </button>

              <button
                type="button"
                onClick={() => setSlideIndex(1)}
                className="metal px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold text-white flex items-center gap-2 cursor-pointer shadow-lg hover:scale-105 transition-all"
                title="Ver Video Oficial de ZOE en pantalla completa"
              >
                <Play className="w-4 h-4 text-[#F3C26B] fill-[#F3C26B]" />
                <span>Ver Video de ZOE</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* =========================================================================
          SLIDE 2: VIDEO DE ZOE (Proyección Holográfica Flotante a Pantalla Completa)
          Cubre toda la pantalla con bordes desvanecidos hacia el espacio exterior
          ========================================================================= */}
      <div
        className={`absolute inset-0 w-full h-full flex flex-col justify-center items-center transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          slideIndex === 1
            ? 'opacity-100 translate-x-0 pointer-events-auto z-10'
            : 'opacity-0 translate-x-full pointer-events-none z-0'
        }`}
      >
        <section
          className="relative w-full h-full flex items-center justify-center p-2 sm:p-4 overflow-hidden"
          style={{
            // Desvanecimiento suave en los bordes para eliminar cualquier línea dura o borde tosco
            background:
              'radial-gradient(ellipse 95% 90% at 50% 50%, rgba(4, 34, 43, 0.70) 0%, rgba(2, 20, 26, 0.50) 65%, transparent 100%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 98% 95% at 50% 50%, black 80%, transparent 100%)',
            maskImage:
              'radial-gradient(ellipse 98% 95% at 50% 50%, black 80%, transparent 100%)',
          }}
        >
          {/* Contenedor del Video a pantalla completa dentro de la sección sin barras invasivas */}
          <div className="relative z-20 w-full h-full flex items-center justify-center my-auto overflow-hidden">
            {/* Scanlines holográficas muy sutiles sobre el video */}
            <div
              className="absolute inset-0 pointer-events-none opacity-15 z-30"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(39,220,255,0.05) 3px, rgba(39,220,255,0.05) 4px)',
              }}
            />

            <video
              ref={videoRef}
              src="/assets/zoe/zoe_presentation.mp4"
              controls
              playsInline
              onEnded={() => setSlideIndex(0)}
              className="w-full h-full max-h-[84vh] object-contain drop-shadow-[0_0_30px_rgba(39,220,255,0.25)]"
              title="Proyección Holográfica Oficial de ZOE"
            >
              Tu navegador no soporta reproducción de video.
            </video>
          </div>
        </section>
      </div>

      {/* Flechas flotantes translúcidas a los costados para retroceso y avance */}
      <button
        type="button"
        onClick={() => setSlideIndex((prev) => (prev === 0 ? 1 : 0))}
        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-40 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/40 hover:bg-[#27DCFF]/25 border border-white/10 hover:border-[#27DCFF]/50 backdrop-blur-xl text-white/60 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:scale-110 active:scale-95 group"
        title={slideIndex === 0 ? 'Ver Video de ZOE' : 'Volver a la Presentación'}
        aria-label="Diapositiva anterior"
      >
        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:-translate-x-0.5" />
      </button>

      <button
        type="button"
        onClick={() => setSlideIndex((prev) => (prev === 0 ? 1 : 0))}
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-40 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/40 hover:bg-[#27DCFF]/25 border border-white/10 hover:border-[#27DCFF]/50 backdrop-blur-xl text-white/60 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:scale-110 active:scale-95 group"
        title={slideIndex === 0 ? 'Ver Video de ZOE' : 'Volver a la Presentación'}
        aria-label="Siguiente diapositiva"
      >
        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:translate-x-0.5" />
      </button>
    </div>
  );
};

export default PortalCatalog;
