import React, { useState, useEffect } from 'react';
import {
  Rocket,
  Sparkles,
  Download,
  Plus,
  FileText,
  CheckCircle,
  ArrowRight,
  Layers,
  Trash2,
  Trees,
  CheckCircle2,
  Copy,
  Printer,
  Edit3,
  ExternalLink
} from 'lucide-react';
import { useStore } from '@/store/useStore';

export interface PrototypeItem {
  id: string;
  sourceCode?: string;
  name: string;
  category: 'Prototipo Tecnológico' | 'Servicio de Innovación' | 'Proyecto Territorial' | 'Vigilancia Zonal' | 'Transferencia';
  targetAudience: string;
  problemSolved: string;
  solution: string;
  deliverables: string[];
  durationWeeks: number;
  unadSchool: string;
  validationMetrics: string[];
}

export const PrototipadoView: React.FC = () => {
  const selectedTreeFruits = useStore((state) => state.selectedTreeFruits);
  const selectedStrategicTheme = useStore((state) => state.selectedStrategicTheme);

  // Initial list combining default prototypes or seeded fruits
  const [prototypes, setPrototypes] = useState<PrototypeItem[]>([
    {
      id: 'proto-1',
      sourceCode: 'FR-01',
      name: 'Servicio de Vigilancia Tecnológica Zonal y Bioinsumos',
      category: 'Servicio de Innovación',
      targetAudience: 'Asociaciones campesinas, cooperativas agropecuarias y secretarías de desarrollo rural',
      problemSolved: 'Dependencia crítica de insumos químicos importados de alto costo y degradación de suelos en la región.',
      solution: 'Laboratorio móvil y pruebas rápidas de caracterización de biomasa para formular biofertilizantes con microorganismos nativos.',
      deliverables: [
        'Boletín mensual de señales tecnológicas y patentes libres',
        'Protocolo de formulación de bioinsumos en finca',
        'Lote piloto de prueba con evaluación docente y campesina',
      ],
      durationWeeks: 6,
      unadSchool: 'ECAPMA & ECACEN',
      validationMetrics: [
        'Reducción verificable del 30% en costos de fertilización',
        'Aprobación y adopción por 80 productores locales',
      ],
    },
    {
      id: 'proto-2',
      sourceCode: 'FR-02',
      name: 'Biorreactor Comunitario Modular de Bajo Costo',
      category: 'Prototipo Tecnológico',
      targetAudience: 'Pequeños productores rurales y centros de acopio zonales',
      problemSolved: 'Falta de equipamiento asequible para estandarizar la reproducción de cepas benéficas.',
      solution: 'Dispositivo físico modular con control microclimático IoT ligero de bajo consumo energético.',
      deliverables: [
        'Planos y esquemas de hardware abierto del reactor',
        'Firmware de monitoreo microclimático offline',
        'Guía técnica de ensamblaje con materiales regionales',
      ],
      durationWeeks: 8,
      unadSchool: 'ECBTI & ECAPMA',
      validationMetrics: [
        'Producción continua de 500L semanales de biofertilizante',
        'Cero fallas operativas en pruebas de 30 días continuos',
      ],
    },
  ]);

  // Synchronize if fruits were passed from Árbol de Innovación
  useEffect(() => {
    if (selectedTreeFruits && selectedTreeFruits.length > 0) {
      const mapped = selectedTreeFruits.map((f) => ({
        id: f.id,
        sourceCode: f.code,
        name: f.name,
        category:
          f.type === 'proyecto'
            ? ('Proyecto Territorial' as const)
            : f.type === 'servicio'
            ? ('Servicio de Innovación' as const)
            : ('Prototipo Tecnológico' as const),
        targetAudience: 'Comunidades productivas y entidades aliadas del territorio',
        problemSolved: 'Brecha identificada en el árbol de innovación a partir de las tendencias territoriales.',
        solution: f.solution || 'Solución innovadora diseñada en el laboratorio.',
        deliverables: ['Prototipo funcional / Documento de especificación', 'Guía de validación en campo', 'Plan de transferencia'],
        durationWeeks: 6,
        unadSchool: 'Escuelas UNAD articuladas',
        validationMetrics: [f.impact || 'Impacto cuantificable en el territorio'],
      }));

      // Add unique by id/code
      setPrototypes((prev) => {
        const existingCodes = new Set(prev.map((p) => p.sourceCode));
        const newOnes = mapped.filter((m) => !existingCodes.has(m.sourceCode));
        return newOnes.length > 0 ? [...newOnes, ...prev] : prev;
      });
    }
  }, [selectedTreeFruits]);

  const [activeProtoId, setActiveProtoId] = useState<string>(prototypes[0]?.id || 'proto-1');
  const [isGeneratingWithAi, setIsGeneratingWithAi] = useState<boolean>(false);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [newProtoName, setNewProtoName] = useState<string>('');
  const [newProtoCategory, setNewProtoCategory] = useState<PrototypeItem['category']>('Prototipo Tecnológico');
  const [newProtoProblem, setNewProtoProblem] = useState<string>('');
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);

  const activeProto = prototypes.find((p) => p.id === activeProtoId) || prototypes[0];

  const handleCreateIndependentPrototype = () => {
    if (!newProtoName.trim()) return;
    const created: PrototypeItem = {
      id: `proto-${Date.now()}`,
      name: newProtoName.trim(),
      category: newProtoCategory,
      targetAudience: 'Población, organizaciones y aliados territoriales',
      problemSolved: newProtoProblem.trim() || 'Necesidad territorial definida de forma independiente.',
      solution: 'Solución estructurada en el laboratorio con enfoque metodológico abierto.',
      deliverables: ['Especificación técnica de la solución', 'Prototipo de validación rápida', 'Informe de impacto'],
      durationWeeks: 6,
      unadSchool: 'Escuela UNAD afín',
      validationMetrics: ['Satisfacción de usuarios > 85%', 'Prueba de concepto exitosa'],
    };

    setPrototypes([created, ...prototypes]);
    setActiveProtoId(created.id);
    setIsCreatingNew(false);
    setNewProtoName('');
    setNewProtoProblem('');
  };

  const handleGenerateWithAi = async () => {
    if (isGeneratingWithAi) return;
    setIsGeneratingWithAi(true);

    try {
      const response = await fetch('/api/unad-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Actúa como arquitecto de innovación del Laboratorio Digital InnovaHub360 UNAD.
Genera una ficha técnica para un prototipo o servicio de innovación alineado al tema: "${selectedStrategicTheme || 'Biotecnología y Digitalización'}".
Nombre base o idea: "${newProtoName || activeProto?.name || 'Solución de Innovación Territorial'}".
Categoría: "${newProtoCategory}".
Responde estrictamente en formato JSON válido con la estructura:
{
  "name": "Nombre descriptivo y atractivo",
  "category": "${newProtoCategory}",
  "targetAudience": "Beneficiarios específicos",
  "problemSolved": "Problema territorial concreto",
  "solution": "Detalle técnico de la solución",
  "deliverables": ["Entregable 1", "Entregable 2", "Entregable 3"],
  "durationWeeks": 6,
  "unadSchool": "ECAPMA o ECBTI o ECACEN",
  "validationMetrics": ["Métrica 1 de éxito", "Métrica 2 de impacto"]
}`,
                },
              ],
            },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleanJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);

        const created: PrototypeItem = {
          id: `proto-ai-${Date.now()}`,
          name: parsed.name || 'Prototipo de Innovación Avanzado',
          category: parsed.category || newProtoCategory,
          targetAudience: parsed.targetAudience || 'Comunidades del territorio',
          problemSolved: parsed.problemSolved || 'Brecha territorial priorizada.',
          solution: parsed.solution || 'Solución co-creada con asistencia de IA institucional.',
          deliverables: parsed.deliverables || ['Prototipo alfa', 'Guía de usuario'],
          durationWeeks: parsed.durationWeeks || 6,
          unadSchool: parsed.unadSchool || 'ECBTI',
          validationMetrics: parsed.validationMetrics || ['Validación territorial satisfactoria'],
        };

        setPrototypes([created, ...prototypes]);
        setActiveProtoId(created.id);
        setIsCreatingNew(false);
      }
    } catch (e) {
      console.warn('Fallback a prototipo predefinido por simulación offline');
      handleCreateIndependentPrototype();
    } finally {
      setIsGeneratingWithAi(false);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(prototypes, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `prototipos_innovahub_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleCopyMarkdown = () => {
    if (!activeProto) return;
    const md = `# Ficha Técnica de Prototipo: ${activeProto.name}
**Categoría:** ${activeProto.category}
**Escuela UNAD:** ${activeProto.unadSchool}
**Duración Estimada:** ${activeProto.durationWeeks} semanas
**Origen en Árbol:** ${activeProto.sourceCode || 'Diseño Independiente'}

## 1. Problema Territorial que Resuelve
${activeProto.problemSolved}

## 2. Población Objetivo y Beneficiarios
${activeProto.targetAudience}

## 3. Descripción de la Solución
${activeProto.solution}

## 4. Entregables y Componentes
${activeProto.deliverables.map((d) => `- ${d}`).join('\n')}

## 5. Métricas de Validación
${activeProto.validationMetrics.map((m) => `- ${m}`).join('\n')}
`;
    navigator.clipboard.writeText(md);
    setCopiedNotice('Ficha técnica copiada al portapapeles en formato Markdown.');
    setTimeout(() => setCopiedNotice(null), 3000);
  };

  return (
    <div className="w-full space-y-6">
      {/* Title Row */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <nav className="m text-xs text-brand-textMuted mb-2" aria-label="Migas de pan">
            <span>Inicio</span> <span className="opacity-40">/</span> <span>Herramientas</span> <span className="opacity-40">/</span>{' '}
            <span className="text-white">Prototipado</span>
          </nav>
          <h1 className="h2 text-3xl md:text-4xl text-white font-bold tracking-tight">Prototipado</h1>
          <p className="bd text-sm text-brand-textSecondary mt-1 max-w-3xl">
            Herramienta 5 · Banco de diseño, estructuración y validación rápida de prototipos tecnológicos, servicios de innovación y proyectos territoriales. Funciona de manera 100% independiente o sembrada desde los Frutos del Árbol de Innovación.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsCreatingNew(true)}
            className="metal px-4 py-2 text-xs font-semibold text-white flex items-center gap-2 cursor-pointer shadow-md hover:shadow-cyan-500/20"
          >
            <Plus className="w-3.5 h-3.5 text-[#5EC2DD]" />
            <span>Crear Prototipo Independiente</span>
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            className="g2 px-3.5 py-2 text-xs font-semibold text-brand-textSecondary hover:text-white flex items-center gap-1.5 rounded-full"
            title="Descargar especificación completa en formato JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar JSON</span>
          </button>
        </div>
      </div>

      {copiedNotice && (
        <div className="p-3 rounded-xl bg-[#A8C63C]/20 border border-[#A8C63C]/40 text-xs text-[#A8C63C] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{copiedNotice}</span>
        </div>
      )}

      {/* Creation Modal / Form */}
      {isCreatingNew && (
        <div className="g p-6 rounded-2xl border border-[#5EC2DD]/40 bg-black/40 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#5EC2DD]" />
              <h3 className="text-sm font-bold text-white sy">Nuevo Prototipo o Servicio de Innovación</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsCreatingNew(false)}
              className="text-xs text-brand-textMuted hover:text-white"
            >
              Cerrar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-brand-textMuted uppercase block mb-1">
                Nombre de la Solución:
              </label>
              <input
                type="text"
                value={newProtoName}
                onChange={(e) => setNewProtoName(e.target.value)}
                placeholder="Ej. Plataforma de Monitoreo Microclimático..."
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/20 text-white text-xs focus:outline-none focus:border-[#5EC2DD]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-brand-textMuted uppercase block mb-1">Categoría:</label>
              <select
                value={newProtoCategory}
                onChange={(e) => setNewProtoCategory(e.target.value as PrototypeItem['category'])}
                className="w-full px-3 py-2 rounded-xl bg-black/70 border border-white/20 text-white text-xs focus:outline-none focus:border-[#5EC2DD]"
              >
                <option value="Prototipo Tecnológico">Prototipo Tecnológico</option>
                <option value="Servicio de Innovación">Servicio de Innovación</option>
                <option value="Proyecto Territorial">Proyecto Territorial</option>
                <option value="Vigilancia Zonal">Vigilancia Zonal</option>
                <option value="Transferencia">Transferencia Tecnológica</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-brand-textMuted uppercase block mb-1">
              Problema Territorial que Resuelve:
            </label>
            <textarea
              value={newProtoProblem}
              onChange={(e) => setNewProtoProblem(e.target.value)}
              placeholder="Describe el reto territorial o la oportunidad a abordar..."
              className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/20 text-white text-xs focus:outline-none focus:border-[#5EC2DD]"
              rows={2}
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleGenerateWithAi}
              disabled={isGeneratingWithAi}
              className="g2 px-4 py-2 text-xs font-semibold text-[#5EC2DD] hover:text-white flex items-center gap-1.5 border border-[#5EC2DD]/30 rounded-full cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#5EC2DD]" />
              <span>{isGeneratingWithAi ? 'Generando con Gemini...' : 'Completar con Gemini IA'}</span>
            </button>

            <button
              type="button"
              onClick={handleCreateIndependentPrototype}
              disabled={!newProtoName.trim()}
              className="metal px-5 py-2 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Guardar Prototipo</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Two-Column Layout: Prototypes List + Detailed Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
        {/* Left Side: Prototypes Catalog List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-brand-textMuted uppercase tracking-wider m">
              Catálogo de Prototipos ({prototypes.length})
            </span>
            <span className="text-[10px] text-[#A8C63C]">Modo Banco Activo</span>
          </div>

          <div className="space-y-2.5">
            {prototypes.map((proto) => {
              const isSelected = activeProtoId === proto.id;
              return (
                <div
                  key={proto.id}
                  onClick={() => setActiveProtoId(proto.id)}
                  className={`g p-4 rounded-xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'border-[#5EC2DD] bg-white/10 shadow-[0_0_20px_rgba(46,156,186,0.3)]'
                      : 'border-white/10 hover:border-white/25 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-bold text-[#5EC2DD] uppercase tracking-wider m">
                      {proto.category}
                    </span>
                    {proto.sourceCode && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F29F05]/20 text-[#F3C26B] font-mono border border-[#F29F05]/30">
                        {proto.sourceCode}
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-white sy leading-snug mb-1">{proto.name}</h4>

                  <p className="text-xs text-brand-textSecondary line-clamp-2 leading-relaxed">
                    {proto.problemSolved}
                  </p>

                  <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-brand-textMuted">
                    <span>{proto.unadSchool}</span>
                    <span className="font-mono text-[#A8C63C]">{proto.durationWeeks} sem.</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Detailed Prototype Canvas & Workbench */}
        {activeProto ? (
          <div className="g p-6 md:p-8 rounded-2xl border border-white/15 space-y-6">
            {/* Header of Active Prototype */}
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-1 rounded text-xs font-bold bg-[#5EC2DD]/20 text-[#5EC2DD] uppercase border border-[#5EC2DD]/30">
                    {activeProto.category}
                  </span>
                  {activeProto.sourceCode && (
                    <span className="px-2.5 py-1 rounded text-xs font-bold bg-[#F29F05]/20 text-[#F3C26B] border border-[#F29F05]/30">
                      Fruto {activeProto.sourceCode} del Árbol
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded text-xs text-brand-textMuted bg-white/5">
                    Duración: {activeProto.durationWeeks} semanas
                  </span>
                </div>

                <h2 className="text-2xl font-bold text-white sy">{activeProto.name}</h2>
                <p className="text-xs text-brand-textSecondary mt-1">
                  Articulado por: <span className="text-white font-medium">{activeProto.unadSchool}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyMarkdown}
                  className="g2 px-3.5 py-2 text-xs text-[#5EC2DD] hover:text-white flex items-center gap-1.5 rounded-full"
                  title="Copiar especificación en Markdown"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Ficha</span>
                </button>
              </div>
            </div>

            {/* Problem & Target Audience */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-1.5">
                <span className="text-[10px] font-bold text-brand-textMuted uppercase tracking-wider block">
                  1. Problema Territorial que Resuelve:
                </span>
                <p className="text-xs text-brand-textSecondary leading-relaxed">{activeProto.problemSolved}</p>
              </div>

              <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-1.5">
                <span className="text-[10px] font-bold text-brand-textMuted uppercase tracking-wider block">
                  2. Beneficiarios y Actores Directos:
                </span>
                <p className="text-xs text-brand-textSecondary leading-relaxed">{activeProto.targetAudience}</p>
              </div>
            </div>

            {/* Technical Solution Description */}
            <div className="p-5 rounded-xl bg-gradient-to-r from-[#0C5E78]/25 to-transparent border border-[#5EC2DD]/30 space-y-2">
              <span className="text-xs font-bold text-[#5EC2DD] uppercase tracking-wider block">
                3. Arquitectura y Solución Técnica del Prototipo:
              </span>
              <p className="text-sm text-white sy leading-relaxed">{activeProto.solution}</p>
            </div>

            {/* Deliverables Grid */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                4. Entregables y Componentes de la Solución:
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {activeProto.deliverables.map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#A8C63C]/20 text-[#A8C63C] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-xs text-brand-textSecondary leading-snug">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Validation Metrics */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                5. Métricas de Validación en Campo:
              </span>
              <div className="p-4 rounded-xl bg-black/30 border border-white/10 space-y-2">
                {activeProto.validationMetrics.map((met, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-brand-textSecondary">
                    <CheckCircle className="w-4 h-4 text-[#A8C63C] shrink-0" />
                    <span>{met}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
export default PrototipadoView;