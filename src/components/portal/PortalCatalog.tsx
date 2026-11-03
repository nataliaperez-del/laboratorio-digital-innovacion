import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Layers, BrainCircuit, Trees, Rocket, Sparkles, FolderArchive, Trophy } from 'lucide-react';
import { ToolId } from '../layout/Header';

interface PortalCatalogProps {
  onSelectTool: (tool: ToolId) => void;
  onOpenZoe: (text?: string) => void;
  onPlayIntro: () => void;
  onOpenBadges?: () => void;
}

export const PortalCatalog: React.FC<PortalCatalogProps> = ({ onSelectTool, onOpenZoe, onOpenBadges }) => {
  // 0: Presentación del LAB, 1: Video Proyección Holográfica de ZOE
  const [slideIndex, setSlideIndex] = useState<0 | 1>(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Transición automática estricta cada 20 segundos (sin interrupciones)
  useEffect(() => {
    const timer = setTimeout(() => {
      setSlideIndex((prev) => (prev === 0 ? 1 : 0));
    }, 20000);

    return () => clearTimeout(timer);
  }, [slideIndex]);

  // Manejo de reproducción de video sincronizada con el slide
  useEffect(() => {
    if (slideIndex === 1 && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {
        // Silenciar autoplay si el navegador lo bloquea con sonido
        if (videoRef.current) {
          videoRef.current.muted = true;
          // Si ni silenciado deja reproducir, queda el póster del video: no es un error que mostrar.
          videoRef.current.play().catch(() => undefined);
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
      name: 'Prototipado',
      desc: 'Planes de solución e hipótesis con IA',
      icon: Rocket,
      color: '#E024A5',
    },
    {
      id: 'banco' as ToolId,
      name: 'Banco Unificado',
      desc: 'Repositorio transversal de ejercicios',
      icon: FolderArchive,
      color: '#A78BFA',
    },
  ];

  return (
    <div className="relative w-full h-full flex-1 flex items-center justify-center overflow-hidden">
      {/* =========================================================================
          SLIDE 1: PRESENTACIÓN OFICIAL DEL LABORATORIO
          Cubre toda la sección con bordes holográficos desvanecidos hacia el fondo
          ========================================================================= */}
      <div
        className={`absolute inset-0 w-full h-full flex flex-col justify-center items-center transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          slideIndex === 0 ? 'opacity-100 translate-x-0 pointer-events-auto z-10' : 'opacity-0 -translate-x-full pointer-events-none z-0'
        }`}
      >
        <section
          className="relative w-full h-full flex flex-col justify-between p-6 sm:p-10 md:p-12 overflow-hidden"
          style={{
            // Fondo de vidrio holográfico con bordes que se desvanecen gradualmente en transparencia
            background:
              'radial-gradient(ellipse 95% 90% at 50% 50%, rgba(4, 34, 43, 0.72) 0%, rgba(4, 34, 43, 0.45) 55%, rgba(2, 20, 26, 0.15) 85%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 98% 95% at 50% 50%, black 75%, transparent 100%)',
            maskImage: 'radial-gradient(ellipse 98% 95% at 50% 50%, black 75%, transparent 100%)',
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
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(39,220,255,0.06) 3px, rgba(39,220,255,0.06) 4px)',
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
              Entorno interactivo de experimentación y prototipado rápido concebido dentro del Observatorio InnovaHub360. Aquí la inteligencia territorial se
              convierte en acción: caracterizas desafíos regionales, descubres tendencias en árboles holográficos de innovación y formulas planes de prototipado
              listos para el territorio, asistido en cada fase por <strong>ZOE</strong>.
            </p>

            {/* Accesos directos a las 4 herramientas del LAB */}
            <div className="pt-2">
              <span className="text-[11px] uppercase tracking-wider text-[#5EC2DD] font-bold block mb-3 m">Herramientas Disponibles en el Laboratorio:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
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
                        <span className="text-base font-bold text-white sy group-hover:text-[#5EC2DD] transition-colors block">{t.name}</span>
                        <span className="text-xs text-[#A6C0CA] block mt-1 leading-snug">{t.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Barra Inferior: Insignias de Innovación + Botón para hablar con ZOE */}
          <div className="relative z-10 max-w-5xl mx-auto w-full pt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={onOpenBadges}
              className="px-4 py-2 rounded-full bg-white/5 backdrop-blur-md text-xs font-semibold text-[#FFD700] border border-[#FFD700]/30 hover:bg-[#FFD700]/15 flex items-center gap-2 cursor-pointer transition-all shadow-sm"
              title="Abrir Vitrina de Insignias y Logros"
            >
              <Trophy className="w-3.5 h-3.5 text-[#FFD700]" />
              <span>Insignias de Innovación</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenZoe()}
              className="px-4 py-2.5 rounded-full bg-white/5 backdrop-blur-md text-xs font-semibold text-[#27DCFF] border border-[#27DCFF]/40 hover:bg-[#27DCFF]/15 flex items-center gap-2 cursor-pointer transition-all shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#27DCFF]" />
              <span>Hablar con ZOE</span>
            </button>
          </div>
        </section>
      </div>

      {/* =========================================================================
          SLIDE 2: VIDEO DE ZOE (Proyección Holográfica Flotante a Pantalla Completa)
          Cubre toda la pantalla con bordes desvanecidos hacia el espacio exterior
          ========================================================================= */}
      <div
        className={`absolute inset-0 w-full h-full flex flex-col justify-center items-center transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          slideIndex === 1 ? 'opacity-100 translate-x-0 pointer-events-auto z-10' : 'opacity-0 translate-x-full pointer-events-none z-0'
        }`}
      >
        <section
          className="relative w-full h-full flex items-center justify-center p-2 sm:p-4 overflow-hidden"
          style={{
            // Desvanecimiento suave en los bordes para eliminar cualquier línea dura o borde tosco
            background: 'radial-gradient(ellipse 95% 90% at 50% 50%, rgba(4, 34, 43, 0.70) 0%, rgba(2, 20, 26, 0.50) 65%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 98% 95% at 50% 50%, black 80%, transparent 100%)',
            maskImage: 'radial-gradient(ellipse 98% 95% at 50% 50%, black 80%, transparent 100%)',
          }}
        >
          {/* Contenedor del Video a pantalla completa dentro de la sección sin barras invasivas */}
          <div className="relative z-20 w-full h-full flex items-center justify-center my-auto overflow-hidden">
            {/* Scanlines holográficas muy sutiles sobre el video */}
            <div
              className="absolute inset-0 pointer-events-none opacity-15 z-30"
              style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(39,220,255,0.05) 3px, rgba(39,220,255,0.05) 4px)',
              }}
            />

            <video
              ref={videoRef}
              src="/assets/zoe/zoe_presentation.mp4"
              controls
              playsInline
              onEnded={() => setSlideIndex(0)}
              className="w-full h-full max-h-[85vh] object-contain drop-shadow-[0_0_30px_rgba(39,220,255,0.25)]"
              title="Proyección Holográfica Oficial de ZOE"
            >
              Tu navegador no soporta reproducción de video.
            </video>
          </div>
        </section>
      </div>

      {/* =========================================================================
          CONTROLES DE PAGINACIÓN: ÚNICAMENTE LOS PUNTOS PARA AVANZAR Y RETROCEDER
          Alternan con animación cada 20 segundos o al hacer clic
          ========================================================================= */}
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-black/45 backdrop-blur-md border border-white/10 shadow-[0_4px_16px_rgba(0,0,0,0.5)]">
        <button
          type="button"
          onClick={() => setSlideIndex(0)}
          className={`transition-all rounded-full cursor-pointer ${
            slideIndex === 0 ? 'w-7 h-2.5 bg-[#27DCFF] shadow-[0_0_12px_#27DCFF]' : 'w-2.5 h-2.5 bg-white/30 hover:bg-white/60'
          }`}
          title="Diapositiva 1: Presentación del Laboratorio"
          aria-label="Ir a presentación"
        />
        <button
          type="button"
          onClick={() => setSlideIndex(1)}
          className={`transition-all rounded-full cursor-pointer ${
            slideIndex === 1 ? 'w-7 h-2.5 bg-[#27DCFF] shadow-[0_0_12px_#27DCFF]' : 'w-2.5 h-2.5 bg-white/30 hover:bg-white/60'
          }`}
          title="Diapositiva 2: Video Proyección de ZOE"
          aria-label="Ir a video"
        />
      </div>
    </div>
  );
};
