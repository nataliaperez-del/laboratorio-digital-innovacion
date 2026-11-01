import React from 'react';
import {
  Compass,
  Layers,
  BrainCircuit,
  Trees,
  Rocket,
  ArrowRight,
  Sparkles,
  Bot,
  ShieldCheck,
  CheckCircle2,
  Workflow
} from 'lucide-react';
import { ToolId } from '../layout/Header';

interface PortalCatalogProps {
  onSelectTool: (tool: ToolId) => void;
  onOpenZoe: () => void;
}

export const PortalCatalog: React.FC<PortalCatalogProps> = ({ onSelectTool, onOpenZoe }) => {
  const tools = [
    {
      id: 'radar' as ToolId,
      name: 'Radar de Innovación',
      tagline: 'Vigilancia activa y prospectiva tecnológica territorial',
      description: 'Exploración interactiva de 31 señales y macrotendencias en matriz de impacto versus velocidad de adopción en cuatro cuadrantes de acción.',
      icon: Compass,
      color: '#5EC2DD',
      accentColor: '#2E9CBA',
      badge: 'Herramienta 1 · 31 Señales',
    },
    {
      id: 'estudio' as ToolId,
      name: 'Estudio Territorial',
      tagline: 'Diagnóstico zonal y caracterización en 12 bloques',
      description: 'Ingesta y procesamiento de fuentes del territorio, códigos DIVIPOLA y banco de iniciativas para generar un diagnóstico contextual riguroso.',
      icon: Layers,
      color: '#A8C63C',
      accentColor: '#7A9706',
      badge: 'Herramienta 2 · 12 Bloques',
    },
    {
      id: 'ideacion' as ToolId,
      name: 'Ideación Estratégica y Elección del Tema',
      tagline: 'Decisión deliberada de vocación y tema ancla',
      description: 'Consecuente con el diagnóstico territorial o de formulación independiente. Evaluación de alternativas y selección del eje estructurador.',
      icon: BrainCircuit,
      color: '#F3C26B',
      accentColor: '#F29F05',
      badge: 'Herramienta 3 · Decisión Temática',
    },
    {
      id: 'arbol' as ToolId,
      name: 'Árbol de Innovación',
      tagline: 'Estructura holográfica y circuito de valor 10-5-3',
      description: 'Visualización interactiva tipo circuito: suelo (actores), raíces (riesgos), tronco (tema central), ramas (10 globales, 5 nacionales, 3 territoriales) y frutos.',
      icon: Trees,
      color: '#A8C63C',
      accentColor: '#A8C63C',
      badge: 'Herramienta 4 · Circuito Holográfico',
    },
    {
      id: 'prototipado' as ToolId,
      name: 'Prototipado',
      tagline: 'Banco de diseño, especificación y validación rápida',
      description: 'Estructuración de prototipos tecnológicos, servicios de innovación y proyectos territoriales. Funciona a partir de los frutos del árbol o de forma 100% independiente.',
      icon: Rocket,
      color: '#A98FD6',
      accentColor: '#6B4FA0',
      badge: 'Herramienta 5 · Banco de Prototipos',
    },
  ];

  return (
    <div className="w-full space-y-12">
      {/* Hero Welcome Banner */}
      <section className="g p-8 md:p-12 rounded-[28px] relative overflow-hidden border border-white/15 bg-gradient-to-r from-[#0C5E78]/30 via-transparent to-[#2E9CBA]/15">
        <div className="max-w-3xl space-y-4">
          <div className="flex items-center gap-2">
            <span className="chip bg-[#2E9CBA]/20 border border-[#2E9CBA]/40 text-[#5EC2DD]">
              UNAD · Vicerrectoría de Innovación y Emprendimiento (VIEM)
            </span>
            <span className="chip bg-[#F29F05]/20 border border-[#F29F05]/40 text-[#F3C26B] hidden sm:inline-flex">
              En vivo · 2026
            </span>
          </div>

          <h1 className="h2 text-3xl md:text-5xl text-white font-bold tracking-tight leading-tight">
            Laboratorio Digital de Innovación
          </h1>

          <p className="bd text-base md:text-lg text-[#CFE0E6] leading-relaxed max-w-2xl">
            Ecosistema integrado para la vigilancia, diagnóstico territorial, ideación estratégica, modelado holográfico y prototipado rápido de soluciones, con soporte de IA institucional y asistencia de ZOE.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <button
              onClick={() => onSelectTool('radar')}
              className="metal px-6 py-3 text-sm font-bold text-white flex items-center gap-2 cursor-pointer shadow-lg hover:scale-105 transition-all"
            >
              <span>Explorar Radar de Innovación</span>
              <ArrowRight className="w-4 h-4 text-[#F3C26B]" />
            </button>

            <button
              onClick={onOpenZoe}
              className="g2 px-5 py-3 rounded-full text-sm font-semibold text-[#27DCFF] border border-[#27DCFF]/40 hover:bg-[#27DCFF]/15 flex items-center gap-2 cursor-pointer transition-all zoe-glow"
            >
              <Bot className="w-4 h-4" />
              <span>Hablar con ZOE</span>
            </button>
          </div>
        </div>

        {/* Floating Metrics Badge in Hero */}
        <div className="hidden lg:grid grid-cols-2 gap-3 absolute right-10 top-1/2 -translate-y-1/2 w-[340px]">
          <div className="g2 p-4 rounded-2xl text-center">
            <span className="text-3xl font-bold sy text-white">5</span>
            <span className="block text-xs text-brand-textMuted uppercase l mt-1">Herramientas Conectadas</span>
          </div>
          <div className="g2 p-4 rounded-2xl text-center">
            <span className="text-3xl font-bold sy text-[#5EC2DD]">12</span>
            <span className="block text-xs text-brand-textMuted uppercase l mt-1">Bloques Territoriales</span>
          </div>
          <div className="g2 p-4 rounded-2xl text-center">
            <span className="text-3xl font-bold sy text-[#A8C63C]">31</span>
            <span className="block text-xs text-brand-textMuted uppercase l mt-1">Señales del Radar</span>
          </div>
          <div className="g2 p-4 rounded-2xl text-center">
            <span className="text-3xl font-bold sy text-[#F3C26B]">100%</span>
            <span className="block text-xs text-brand-textMuted uppercase l mt-1">Independientes o Juntas</span>
          </div>
        </div>
      </section>

      {/* Main 5 Tools Catalog Grid */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white sy">Catálogo de Herramientas de Innovación</h2>
            <p className="text-xs md:text-sm text-brand-textSecondary mt-0.5">
              Acceso directo a las 5 herramientas. Pueden utilizarse de manera independiente o como una ruta integrada.
            </p>
          </div>
          <span className="text-xs text-brand-textMuted m hidden sm:inline-block">
            Arquitectura Desacoplada · InnovaHub360
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.id}
                onClick={() => onSelectTool(tool.id)}
                className="g p-6 rounded-2xl cursor-pointer hover:border-white/30 hover:scale-[1.01] transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center border transition-all"
                      style={{
                        backgroundColor: `${tool.accentColor}20`,
                        borderColor: `${tool.accentColor}50`,
                      }}
                    >
                      <Icon className="w-5 h-5" style={{ color: tool.color }} />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/10 text-white/80 border border-white/10 m">
                      {tool.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white sy group-hover:text-[#5EC2DD] transition-colors mb-1">
                    {tool.name}
                  </h3>
                  <span className="text-xs font-medium block mb-2" style={{ color: tool.color }}>
                    {tool.tagline}
                  </span>
                  <p className="text-xs text-brand-textSecondary leading-relaxed">
                    {tool.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                  <span className="text-brand-textMuted font-medium">Abrir herramienta</span>
                  <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Integrated Pathway Flow Section */}
      <section className="g p-8 rounded-2xl border border-white/15 space-y-6">
        <div className="flex items-center gap-2">
          <Workflow className="w-5 h-5 text-[#A8C63C]" />
          <h3 className="text-lg font-bold text-white sy">Ruta Metodológica Integrada del Laboratorio</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="g2 p-4 rounded-xl space-y-2">
            <span className="text-xs font-bold text-[#5EC2DD] m">01 · VIGILANCIA</span>
            <h4 className="text-sm font-bold text-white sy">Radar de Innovación</h4>
            <p className="text-xs text-brand-textSecondary">
              Mapeo de 31 señales y macrotendencias con niveles de impacto y adopción.
            </p>
          </div>

          <div className="g2 p-4 rounded-xl space-y-2">
            <span className="text-xs font-bold text-[#A8C63C] m">02 · TERRITORIO</span>
            <h4 className="text-sm font-bold text-white sy">Estudio Territorial</h4>
            <p className="text-xs text-brand-textSecondary">
              Diagnóstico territorial estructurado en 12 bloques y fuentes primarias.
            </p>
          </div>

          <div className="g2 p-4 rounded-xl space-y-2">
            <span className="text-xs font-bold text-[#F3C26B] m">03 · IDEACIÓN</span>
            <h4 className="text-sm font-bold text-white sy">Ideación Estratégica</h4>
            <p className="text-xs text-brand-textSecondary">
              Elección deliberada del tema ancla a partir de los retos y vocaciones zonales.
            </p>
          </div>

          <div className="g2 p-4 rounded-xl space-y-2">
            <span className="text-xs font-bold text-[#A8C63C] m">04 · MODELADO</span>
            <h4 className="text-sm font-bold text-white sy">Árbol de Innovación</h4>
            <p className="text-xs text-brand-textSecondary">
              Estructura holográfica: actores, riesgos, tronco temático y ramas 10-5-3.
            </p>
          </div>

          <div className="g2 p-4 rounded-xl space-y-2">
            <span className="text-xs font-bold text-[#A98FD6] m">05 · SOLUCIONES</span>
            <h4 className="text-sm font-bold text-white sy">Prototipado</h4>
            <p className="text-xs text-brand-textSecondary">
              Especificación técnica, validación rápida y estructuración de proyectos y servicios.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
export default PortalCatalog;