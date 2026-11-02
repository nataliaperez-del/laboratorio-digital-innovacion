import React from 'react';
import {
  Sparkles,
  ArrowRight,
  Layers,
  BrainCircuit,
  Trees,
  Rocket,
  Play,
  Bot,
  Compass,
  CheckCircle2
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
    <div className="w-full max-w-6xl mx-auto space-y-10 pb-16 animate-in fade-in duration-300">
      {/* =========================================================================
          1. PRESENTACIÓN OFICIAL DEL LABORATORIO DE INNOVACIÓN EN LÍNEA (LAB)
          ========================================================================= */}
      <section className="relative overflow-hidden g rounded-[28px] border border-white/15 p-8 sm:p-12 shadow-2xl">
        {/* Halo decorativo de fondo */}
        <div
          className="absolute -top-32 -right-32 w-96 h-96 pointer-events-none rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(39,220,255,0.18) 0%, rgba(4,34,43,0) 70%)',
          }}
        />

        <div className="relative z-10 space-y-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="chip bg-white/10 border border-white/20 text-[#5EC2DD] m text-[11px] font-semibold px-3 py-1 rounded-full">
              MÓDULO ESTRATÉGICO · OBSERVATORIO INNOVAHUB360
            </span>
            <span className="chip bg-[#A8C63C]/15 border border-[#A8C63C]/40 text-[#A8C63C] text-[11px] font-bold px-3 py-1 rounded-full">
              VIEM · UNAD
            </span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight sy">
              Laboratorio de Innovación en Línea
            </h1>
            <p className="text-lg sm:text-xl font-medium text-[#5EC2DD] sy">
              Del diagnóstico territorial al prototipado rápido, con la Inteligencia Artificial como mediadora.
            </p>
          </div>

          <p className="text-sm sm:text-base text-[#CFE0E6] leading-relaxed max-w-3xl">
            Bienvenido al espacio interactivo del Observatorio InnovaHub360 para transformar desafíos regionales en soluciones estructuradas. Aquí caracterizas territorios, exploras tendencias globales y nacionales en árboles holográficos de innovación y estructuras planes de prototipado listos para implementación, asistido en cada paso por <strong>ZOE</strong>.
          </p>

          {/* Accesos directos a las herramientas modulares del LAB */}
          <div className="pt-2">
            <span className="text-xs uppercase tracking-wider text-brand-textMuted font-bold block mb-3 m">
              Herramientas Disponibles en el Laboratorio:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {tools.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onSelectTool(t.id)}
                    className="p-4 rounded-2xl g2 border border-white/10 hover:border-[#27DCFF]/50 transition-all text-left flex flex-col justify-between group cursor-pointer hover:scale-[1.02] shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center border"
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
        </div>
      </section>

      {/* =========================================================================
          2. VIDEO Y PRESENTACIÓN OFICIAL DE ZOE · ALMA DE INNOVACIÓN
          ========================================================================= */}
      <section className="g2 p-6 sm:p-10 rounded-[28px] border border-[#27DCFF]/30 shadow-2xl relative overflow-hidden zoe-glow space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#27DCFF]/20 border border-[#27DCFF]/50 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(39,220,255,0.4)]">
              <Bot className="w-6 h-6 text-[#27DCFF]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#27DCFF] m">
                  PERSONAJE Y ASISTENTE IA
                </span>
                <span className="text-xs text-white/30">·</span>
                <span className="text-xs text-[#A8C63C] font-semibold">Video Oficial</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white sy">
                Conoce a ZOE · Alma del Laboratorio
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenZoe()}
            className="metal px-5 py-2.5 text-xs font-bold text-white flex items-center gap-2 cursor-pointer shadow hover:scale-105 transition-all self-start sm:self-auto"
          >
            <Sparkles className="w-4 h-4 text-[#27DCFF]" />
            <span>Hablar con ZOE en vivo</span>
          </button>
        </div>

        {/* Reproductor de Video de ZOE */}
        <div className="relative rounded-2xl overflow-hidden border border-[#27DCFF]/30 shadow-[0_12px_40px_rgba(0,0,0,0.6)] bg-black/80 aspect-video flex items-center justify-center">
          <video
            src="/assets/zoe/zoe_presentation.mp4"
            controls
            playsInline
            className="w-full h-full object-contain"
            title="Video de Presentación de ZOE · Laboratorio de Innovación"
          >
            Tu navegador no soporta el formato de video.
          </video>
        </div>

        {/* Ficha sintética de ZOE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs text-[#CFE0E6]">
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <span className="font-bold text-white sy block flex items-center gap-1.5 text-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#27DCFF]" /> Identidad y Concepto
            </span>
            <p className="text-brand-textSecondary leading-relaxed">
              Inspirado en la nobleza y lealtad del Schnauzer, ZOE representa el espíritu guardián de las ideas y la innovación regional.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <span className="font-bold text-white sy block flex items-center gap-1.5 text-sm">
              <BrainCircuit className="w-3.5 h-3.5 text-[#A8C63C]" /> Inteligencia Cuadrúpeda
            </span>
            <p className="text-brand-textSecondary leading-relaxed">
              Vive directamente en la interfaz, se desplaza contigo, responde por voz con Gemini y guía en la formulación de proyectos.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
            <span className="font-bold text-white sy block flex items-center gap-1.5 text-sm">
              <Compass className="w-3.5 h-3.5 text-[#F29F05]" /> Presencia Libre
            </span>
            <p className="text-brand-textSecondary leading-relaxed">
              Arrástralo a cualquier lugar de la pantalla, ponlo a caminar, déjalo quieto en reposo o activa su entorno orbital en 360°.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default PortalCatalog;
