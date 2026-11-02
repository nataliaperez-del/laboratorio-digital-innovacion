import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  ArrowLeft,
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

  // Transición automática cíclica fluida tras unos segundos
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (!isHovered) {
      if (slideIndex === 0) {
        // En presentación: esperar 11 segundos y pasar suavemente al video
        timer = setTimeout(() => {
          setSlideIndex(1);
        }, 11000);
      } else {
        // En video: si no termina por onEnded, volver a la presentación tras 30 segundos
        timer = setTimeout(() => {
          setSlideIndex(0);
        }, 30000);
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

            {/* Texto de Bienvenida */}
            <p className="text-sm sm:text-base md:text-lg text-[#CFE0E6] leading-relaxed max-w-4xl">
              Bienvenido al espacio interactivo del Observatorio InnovaHub360 para transformar desafíos regionales en soluciones estructuradas. Aquí caracterizas territorios, exploras tendencias globales y nacionales en árboles holográficos de innovación y estructuras planes de prototipado listos para implementación, asistido en cada paso por <strong>ZOE</strong>.
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
          SLIDE 2: VIDEO DE ZOE (Proyección Holográfica Flotante en Vidrio Futurista)
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
          className="relative w-full h-full flex flex-col justify-between p-3 sm:p-6 overflow-hidden"
          style={{
            // Desvanecimiento suave en los bordes para eliminar cualquier línea dura o borde tosco
            background:
              'radial-gradient(ellipse 95% 90% at 50% 50%, rgba(4, 34, 43, 0.70) 0%, rgba(2, 20, 26, 0.50) 65%, transparent 100%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 98% 95% at 50% 50%, black 75%, transparent 100%)',
            maskImage:
              'radial-gradient(ellipse 98% 95% at 50% 50%, black 75%, transparent 100%)',
          }}
        >
          {/* Barra Superior Discreta de Navegación del Holograma */}
          <div className="relative z-30 flex items-center justify-between w-full max-w-6xl mx-auto px-2 py-1">
            <button
              type="button"
              onClick={() => setSlideIndex(0)}
              className="px-4 py-2 rounded-full bg-[#04222B]/80 hover:bg-[#0C5E78] border border-[#27DCFF]/40 text-white text-xs font-bold flex items-center gap-2 backdrop-blur-md transition-all cursor-pointer shadow-lg hover:scale-105"
              title="Volver a la presentación del Laboratorio"
            >
              <ArrowLeft className="w-4 h-4 text-[#27DCFF]" />
              <span>Volver a la Presentación</span>
            </button>

            {/* Indicador Tecnológico Flotante */}
            <div className="flex items-center gap-2.5 px-3 py-1 rounded-full bg-[#04222B]/60 backdrop-blur-md border border-[#27DCFF]/20">
              <span className="w-2 h-2 rounded-full bg-[#27DCFF] animate-pulse shadow-[0_0_8px_#27DCFF]" />
              <span className="text-[11px] font-mono text-[#5EC2DD] tracking-wider uppercase">
                Proyección Holográfica // ZOE
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setSlideIndex(0)}
                className="w-2.5 h-2.5 rounded-full bg-white/30 hover:bg-[#27DCFF] cursor-pointer transition-all hover:scale-125"
                title="Slide 1: Presentación"
              />
              <button
                type="button"
                onClick={() => setSlideIndex(1)}
                className="w-3 h-3 rounded-full bg-[#27DCFF] shadow-[0_0_10px_#27DCFF] cursor-pointer transition-transform hover:scale-125"
                title="Slide 2: Video"
              />
              <span className="text-xs text-white/80 font-mono ml-1">02 / 02</span>
            </div>
          </div>

          {/* Contenedor del Video a pantalla completa dentro de la sección sin bordes duros */}
          <div
            className="relative z-20 flex-1 w-full max-w-6xl mx-auto flex items-center justify-center my-auto overflow-hidden rounded-2xl"
            style={{
              WebkitMaskImage:
                'radial-gradient(ellipse 95% 90% at 50% 50%, black 80%, transparent 100%)',
              maskImage:
                'radial-gradient(ellipse 95% 90% at 50% 50%, black 80%, transparent 100%)',
            }}
          >
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
              className="w-full h-full max-h-[75vh] object-contain drop-shadow-[0_0_30px_rgba(39,220,255,0.25)]"
              title="Proyección Holográfica Oficial de ZOE"
            >
              Tu navegador no soporta reproducción de video.
            </video>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PortalCatalog;
