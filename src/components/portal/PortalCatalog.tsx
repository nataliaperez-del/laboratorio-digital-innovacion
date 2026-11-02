import React, { useState } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Layers,
  BrainCircuit,
  Trees,
  Rocket,
  Play,
  Sparkles,
  Bot
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
  const [activeSlide, setActiveSlide] = useState<'presentation' | 'video'>('presentation');

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
    <div className="w-full max-w-6xl mx-auto h-full flex flex-col justify-center items-center">
      {/* =========================================================================
          SLIDE 1: PRESENTACIÓN OFICIAL DEL LABORATORIO DE INNOVACIÓN EN LÍNEA
          ========================================================================= */}
      {activeSlide === 'presentation' && (
        <section className="w-full relative overflow-hidden g rounded-[28px] border border-white/15 p-6 sm:p-10 shadow-2xl flex flex-col justify-between animate-in fade-in duration-300">
          {/* Halo decorativo de fondo */}
          <div
            className="absolute -top-32 -right-32 w-96 h-96 pointer-events-none rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(39,220,255,0.18) 0%, rgba(4,34,43,0) 70%)',
            }}
          />

          <div className="relative z-10 space-y-4">
            {/* Título Principal Directo (Sin textos encima) */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight sy">
              Laboratorio de Innovación en Línea
            </h1>

            {/* Texto de Bienvenida */}
            <p className="text-sm sm:text-base text-[#CFE0E6] leading-relaxed max-w-3xl">
              Bienvenido al espacio interactivo del Observatorio InnovaHub360 para transformar desafíos regionales en soluciones estructuradas. Aquí caracterizas territorios, exploras tendencias globales y nacionales en árboles holográficos de innovación y estructuras planes de prototipado listos para implementación, asistido en cada paso por <strong>ZOE</strong>.
            </p>

            {/* Accesos directos a las 4 herramientas del LAB */}
            <div className="pt-2">
              <span className="text-[11px] uppercase tracking-wider text-brand-textMuted font-bold block mb-2.5 m">
                Herramientas Disponibles en el Laboratorio:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {tools.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onSelectTool(t.id)}
                      className="p-3.5 rounded-2xl g2 border border-white/10 hover:border-[#27DCFF]/50 transition-all text-left flex flex-col justify-between group cursor-pointer hover:scale-[1.02] shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center border"
                          style={{
                            backgroundColor: `${t.color}20`,
                            borderColor: `${t.color}55`,
                          }}
                        >
                          <Icon className="w-4 h-4" style={{ color: t.color }} />
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-white/40 group-hover:text-[#27DCFF] group-hover:translate-x-1 transition-all" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-white sy group-hover:text-[#5EC2DD] transition-colors block">
                          {t.name}
                        </span>
                        <span className="text-[11px] text-brand-textSecondary block mt-0.5 leading-snug">
                          {t.desc}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Barra Inferior del Banner Interactivo: Transición al Video de ZOE */}
            <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#27DCFF] inline-block shadow-[0_0_8px_#27DCFF]" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/20 inline-block" />
                <span className="text-xs text-brand-textMuted m ml-1">Presentación 01 / 02</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onOpenZoe()}
                  className="px-4 py-2.5 rounded-full g2 text-xs font-semibold text-[#27DCFF] border border-[#27DCFF]/40 hover:bg-[#27DCFF]/15 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#27DCFF]" />
                  <span>Hablar con ZOE</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSlide('video')}
                  className="metal px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold text-white flex items-center gap-2 cursor-pointer shadow-lg hover:scale-105 transition-all"
                  title="Ver Video Oficial de ZOE a pantalla completa"
                >
                  <Play className="w-4 h-4 text-[#F3C26B] fill-[#F3C26B]" />
                  <span>Ver Video Oficial de ZOE</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          SLIDE 2: VIDEO DE ZOE A TAMAÑO DE LA PANTALLA
          ========================================================================= */}
      {activeSlide === 'video' && (
        <section className="w-full h-full max-h-[72vh] relative rounded-3xl overflow-hidden border border-[#27DCFF]/40 shadow-[0_0_60px_rgba(39,220,255,0.3)] bg-black/95 flex flex-col justify-center items-center group animate-in fade-in zoom-in-95 duration-300">
          {/* Botón flotante para regresar al Banner del LAB */}
          <button
            type="button"
            onClick={() => setActiveSlide('presentation')}
            className="absolute top-4 left-4 z-30 px-4 py-2 rounded-full bg-[#04222B]/90 border border-[#27DCFF]/50 text-white text-xs font-bold flex items-center gap-2 hover:bg-[#0C5E78] transition-all cursor-pointer backdrop-blur-md shadow-xl"
            title="Volver a la presentación del Laboratorio"
          >
            <ArrowLeft className="w-4 h-4 text-[#27DCFF]" />
            <span>Volver a la Presentación</span>
          </button>

          {/* Indicador de diapositiva superior derecho */}
          <div className="absolute top-4 right-4 z-30 flex items-center gap-2 bg-black/70 px-3.5 py-1.5 rounded-full border border-white/15 backdrop-blur-md">
            <span className="w-2.5 h-2.5 rounded-full bg-white/20 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27DCFF] inline-block shadow-[0_0_8px_#27DCFF]" />
            <span className="text-xs text-white/80 m ml-1">Video de ZOE · 02 / 02</span>
          </div>

          {/* Video a tamaño de pantalla completa en el contenedor */}
          <video
            src="/assets/zoe/zoe_presentation.mp4"
            controls
            autoPlay
            playsInline
            className="w-full h-full object-contain"
            title="Video Oficial de Presentación de ZOE"
          >
            Tu navegador no soporta reproducción de video.
          </video>
        </section>
      )}
    </div>
  );
};

export default PortalCatalog;
