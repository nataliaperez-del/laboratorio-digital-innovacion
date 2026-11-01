import React, { useState } from 'react';
import { BrainCircuit, Check, Sparkles, CheckCircle2, ChevronRight, Award, HelpCircle } from 'lucide-react';

interface ThemeOption {
  id: string;
  title: string;
  shortTag: string;
  focus: string;
  description: string;
  strengths: string[];
  impactScore: number;
  feasibilityScore: number;
}

export const VocacionTerritorialView: React.FC = () => {
  const [selectedThemeId, setSelectedThemeId] = useState<string>('tema-1');

  const themes: ThemeOption[] = [
    {
      id: 'tema-1',
      title: 'Biotecnología Aplicada y Valorización de Biomasa Agropecuaria',
      shortTag: 'Enfoque Biotecnológico y Bioeconomía',
      focus: 'Aprovechamiento de residuos de cosechas, biofertilizantes y bioplaguicidas para sustituir químicos.',
      description: 'Ancla el Centro de Innovación en la capacidad científica de ECAPMA y la necesidad regional de reducir costos de insumos, restaurar suelos degradados y promover agricultura regenerativa.',
      strengths: [
        'Resuelve la principal brecha de rentabilidad campesina',
        'Alta disponibilidad de biomasa residual en la cuenca',
        'Grupos de investigación UNAD con laboratorios especializados',
      ],
      impactScore: 92,
      feasibilityScore: 88,
    },
    {
      id: 'tema-2',
      title: 'Tecnologías Digitales, IA y Trazabilidad para Cadenas Cortas',
      shortTag: 'Enfoque Agrotech y Comercio Justo',
      focus: 'Plataformas de trazabilidad, monitoreo microclimático IoT y comercialización directa con blockchain.',
      description: 'Conecta la producción campesina directamente con mercados institucionales y consumidores urbanos, eliminando intermediación abusiva y garantizando origen.',
      strengths: [
        'Demanda creciente de alimentos con certificación de origen',
        'Capacidades de la Escuela de Ciencias Básicas, Tecnología e Ingeniería (ECBTI)',
        'Rápida adopción por cooperativas juveniles rurales',
      ],
      impactScore: 89,
      feasibilityScore: 85,
    },
    {
      id: 'tema-3',
      title: 'Comunidades Energéticas y Soluciones Solares Descentralizadas',
      shortTag: 'Enfoque de Transición Energética Justa',
      focus: 'Generación fotovoltaica distribuida para bombeo de agua, refrigeración y centros de acopio rurales.',
      description: 'Supera la vulnerabilidad de la red eléctrica en zonas dispersas mediante microrredes gestionadas cooperativamente por las asociaciones locales.',
      strengths: [
        'Alineación prioritaria con el Plan Nacional de Desarrollo',
        'Reduce costos energéticos en poscosecha y acopio de leche',
        'Aumenta la resiliencia climática ante sequías',
      ],
      impactScore: 86,
      feasibilityScore: 80,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title Row */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <nav className="m text-xs text-brand-textMuted mb-2" aria-label="Migas de pan">
            <span>Inicio</span> <span className="opacity-40">/</span> <span>Herramientas</span> <span className="opacity-40">/</span> <span className="text-white">Vocación Territorial</span>
          </nav>
          <h1 className="h2 text-3xl md:text-4xl text-white font-bold tracking-tight">Decisión Estratégica de Vocación Centro de Innovación</h1>
          <p className="bd text-sm text-brand-textSecondary mt-1">
            Fase 3 · Paso I: Selección deliberada de la vocación productiva y el tema ancla que orientará el Árbol de Innovación.
          </p>
        </div>

        <div className="flex items-center gap-2 g2 px-3.5 py-1.5 rounded-full text-xs text-[#A8C63C]">
          <CheckCircle2 className="w-4 h-4" />
          <span>Fase 2 de Estudio Territorial Conectada</span>
        </div>
      </div>

      {/* Synthesis of Vocation */}
      <div className="g p-6 rounded-2xl border border-white/15 bg-gradient-to-r from-[#0C5E78]/30 via-transparent to-[#2E9CBA]/10">
        <div className="flex items-center gap-2.5 mb-2">
          <BrainCircuit className="w-4 h-4 text-[#5EC2DD]" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-textMuted l">
            Síntesis de Vocación del Territorio Diagnosticado
          </h3>
        </div>
        <p className="text-base text-white sy font-medium leading-relaxed">
          "El territorio presenta una vocación dominante agroproductiva de piso térmico frío con alto potencial de tecnificación, presencia de asociaciones de pequeños agricultores y una demanda crítica de sustitución de agroquímicos por bioinsumos y trazabilidad de origen."
        </p>
      </div>

      {/* 3 Theme Alternative Cards */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-textMuted l mb-3">
          Selecciona 1 de las 3 Alternativas Temáticas para el Centro:
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {themes.map((theme, idx) => {
            const isSelected = theme.id === selectedThemeId;
            return (
              <div
                key={theme.id}
                onClick={() => setSelectedThemeId(theme.id)}
                className={`p-6 rounded-2xl cursor-pointer transition-all flex flex-col justify-between border ${
                  isSelected
                    ? 'g bg-gradient-to-b from-[#2E9CBA]/25 to-[#04222B]/90 border-[#27DCFF] shadow-[0_10px_35px_rgba(39,220,255,0.25)] ring-1 ring-[#27DCFF]'
                    : 'g2 border-white/10 hover:border-white/25 hover:bg-white/5'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 text-[#F3C26B] border border-white/15">
                      Alternativa 0{idx + 1}
                    </span>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-[#27DCFF]">
                        <Check className="w-4 h-4" /> Seleccionado
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-white sy mb-1.5 leading-snug">{theme.title}</h3>
                  <span className="text-xs text-[#5EC2DD] font-medium block mb-3">{theme.shortTag}</span>

                  <p className="text-xs text-brand-textSecondary leading-relaxed mb-4">{theme.description}</p>

                  <div className="space-y-2 mb-4">
                    <span className="text-[10px] text-brand-textMuted l block">Criterios Destacados:</span>
                    {theme.strengths.map((str, sIdx) => (
                      <div key={sIdx} className="flex items-start gap-2 text-xs text-white/90">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#A8C63C] shrink-0 mt-0.5" />
                        <span className="text-[11px] leading-tight">{str}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="g2 p-2 rounded-xl">
                    <span className="text-[9.5px] text-brand-textMuted l block">Impacto</span>
                    <span className="text-white font-bold sy">{theme.impactScore}/100</span>
                  </div>
                  <div className="g2 p-2 rounded-xl">
                    <span className="text-[9.5px] text-brand-textMuted l block">Factibilidad</span>
                    <span className="text-[#A8C63C] font-bold sy">{theme.feasibilityScore}/100</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation & Next Step */}
      <div className="g p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4 border border-white/15">
        <div>
          <span className="text-xs text-brand-textMuted block mb-0.5">Tema activo para el Centro de Innovación:</span>
          <p className="text-sm font-bold text-white sy">
            {themes.find((t) => t.id === selectedThemeId)?.title}
          </p>
        </div>

        <button
          type="button"
          className="metal px-6 py-2.5 text-xs font-bold text-white flex items-center gap-2 cursor-pointer shadow-md"
        >
          <span>Avanzar al Paso II · Árbol de Innovación</span>
          <ChevronRight className="w-4 h-4 text-[#F3C26B]" />
        </button>
      </div>
    </div>
  );
};
