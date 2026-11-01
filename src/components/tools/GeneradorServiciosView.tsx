import React, { useState } from 'react';
import { Rocket, Sparkles, Download, Plus, FileText, CheckCircle, ArrowRight, Layers, Trash2 } from 'lucide-react';

interface InnovationService {
  id: string;
  name: string;
  category: 'Vigilancia' | 'Prototipado' | 'Asistencia' | 'Transferencia' | 'Incubación';
  targetAudience: string;
  problemSolved: string;
  deliverables: string[];
  durationWeeks: number;
  unadSchool: string;
}

export const GeneradorServiciosView: React.FC = () => {
  const [services, setServices] = useState<InnovationService[]>([
    {
      id: 'srv-1',
      name: 'Vigilancia Tecnológica y Prospectiva Agroproductiva',
      category: 'Vigilancia',
      targetAudience: 'Asociaciones campesinas, cooperativas agropecuarias y secretarías de desarrollo rural',
      problemSolved: 'Desconocimiento de precios futuros, tendencias fitosanitarias y oportunidades de exportación directa.',
      deliverables: ['Boletín mensual de señales de mercado', 'Matriz de patentes libres aplicables', 'Informe de oportunidades H1/H2'],
      durationWeeks: 4,
      unadSchool: 'ECAPMA & ECACEN',
    },
    {
      id: 'srv-2',
      name: 'Laboratorio de Bioinsumos y Ensayos de Eficacia en Parcela',
      category: 'Prototipado',
      targetAudience: 'Pequeños y medianos productores en transición agroecológica',
      problemSolved: 'Dependencia crítica de fertilizantes químicos importados de alto costo y degradación de suelos.',
      deliverables: ['Protocolo de formulación de biofertilizantes con biomasa local', 'Lote piloto de prueba', 'Certificación de calidad biológica'],
      durationWeeks: 8,
      unadSchool: 'ECAPMA',
    },
    {
      id: 'srv-3',
      name: 'Trazabilidad Comunitaria y Certificación de Origen con Blockchain',
      category: 'Transferencia',
      targetAudience: 'Productores de café especial, cacao y miel de la región',
      problemSolved: 'Intermediación comercial abusiva y pérdida de valor agregado por falta de trazabilidad comprobable.',
      deliverables: ['Despliegue de contratos inteligentes ligeros', 'Códigos QR de origen por lote', 'Capacitación a líderes comunitarios'],
      durationWeeks: 6,
      unadSchool: 'ECBTI',
    },
  ]);

  const [activeServiceId, setActiveServiceId] = useState<string>(services[0].id);
  const [isGeneratingWithAi, setIsGeneratingWithAi] = useState<boolean>(false);
  const [newServiceName, setNewServiceName] = useState<string>('');
  const [newServiceCategory, setNewServiceCategory] = useState<InnovationService['category']>('Prototipado');

  const activeService = services.find((s) => s.id === activeServiceId) || services[0];

  const handleGenerateService = async () => {
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
                  text: `Genera una ficha técnica para un nuevo Servicio de Innovación del Centro de Innovación Productiva (CIP) UNAD.
Categoría: ${newServiceCategory}. Nombre o idea base: "${newServiceName || 'Servicio de Microredes Energéticas Comunitarias'}".
Responde estrictamente en formato JSON válido con los campos:
{
  "name": "Nombre descriptivo y atractivo del servicio",
  "category": "${newServiceCategory}",
  "targetAudience": "Población y organizaciones beneficiarias",
  "problemSolved": "Problema específico territorial que resuelve",
  "deliverables": ["Entregable 1", "Entregable 2", "Entregable 3"],
  "durationWeeks": 6,
  "unadSchool": "ECAPMA o ECBTI o ECACEN"
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

        const createdService: InnovationService = {
          id: `srv-${Date.now()}`,
          name: parsed.name || 'Servicio de Innovación Agroindustrial CIP',
          category: parsed.category || newServiceCategory,
          targetAudience: parsed.targetAudience || 'Comunidades productivas del territorio',
          problemSolved: parsed.problemSolved || 'Optimización de procesos productivos locales',
          deliverables: parsed.deliverables || ['Manual técnico', 'Prototipo validado', 'Informe de impacto'],
          durationWeeks: parsed.durationWeeks || 6,
          unadSchool: parsed.unadSchool || 'ECAPMA',
        };

        setServices((prev) => [createdService, ...prev]);
        setActiveServiceId(createdService.id);
        setNewServiceName('');
      } else {
        throw new Error('Fallback local');
      }
    } catch {
      // Fallback si la API no está conectada aún
      const fallbackService: InnovationService = {
        id: `srv-${Date.now()}`,
        name: newServiceName || 'Fábrica Digital de Prototipos de Bioempaques',
        category: newServiceCategory,
        targetAudience: 'Asociaciones de productores frutícolas y comerciantes locales',
        problemSolved: 'Uso masivo de plásticos contaminantes de un solo uso en embalaje de cosechas.',
        deliverables: [
          'Formulación de biopolímero a partir de almidón de yuca residual',
          'Matriz de termoformado en impresión 3D',
          'Pruebas de biodegradabilidad en compostaje local',
        ],
        durationWeeks: 6,
        unadSchool: 'ECBTI & ECAPMA',
      };
      setServices((prev) => [fallbackService, ...prev]);
      setActiveServiceId(fallbackService.id);
      setNewServiceName('');
    } finally {
      setIsGeneratingWithAi(false);
    }
  };

  const handleDeleteService = (id: string) => {
    if (services.length <= 1) return;
    const remaining = services.filter((s) => s.id !== id);
    setServices(remaining);
    setActiveServiceId(remaining[0].id);
  };

  return (
    <div className="space-y-6">
      {/* Title Row */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <nav className="m text-xs text-brand-textMuted mb-2" aria-label="Migas de pan">
            <span>Inicio</span> <span className="opacity-40">/</span> <span>Herramientas</span> <span className="opacity-40">/</span> <span className="text-white">Generador de Servicios</span>
          </nav>
          <h1 className="h2 text-3xl md:text-4xl text-white font-bold tracking-tight">Generador de Portafolio de Servicios CIP</h1>
          <p className="bd text-sm text-brand-textSecondary mt-1">
            Estructuración de servicios de innovación a partir de los "Frutos" del Árbol de Innovación y las capacidades UNAD.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="metal px-4 py-2 text-xs text-white flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4 text-[#5EC2DD]" />
          <span>Exportar Portafolio Word/PDF</span>
        </button>
      </div>

      {/* Creation & AI Assist Bar */}
      <div className="g2 p-4 rounded-2xl flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#F3C26B]" />
          <span className="text-xs font-semibold text-white uppercase sy tracking-wide">
            Nuevo Servicio con IA:
          </span>
        </div>

        <input
          type="text"
          value={newServiceName}
          onChange={(e) => setNewServiceName(e.target.value)}
          placeholder="Ej: Planta de compostaje acelerado con sensores IoT..."
          className="flex-1 min-w-[240px] bg-white/10 text-xs text-white placeholder-white/40 rounded-xl px-3.5 py-2 outline-none border border-white/15 focus:border-[#27DCFF]"
        />

        <select
          value={newServiceCategory}
          onChange={(e) => setNewServiceCategory(e.target.value as any)}
          className="bg-[#04222B] text-xs text-white border border-white/15 rounded-xl px-3 py-2 outline-none cursor-pointer"
        >
          <option value="Prototipado">Categoría: Prototipado y Validación</option>
          <option value="Vigilancia">Categoría: Vigilancia Tecnológica</option>
          <option value="Asistencia">Categoría: Asistencia Técnica</option>
          <option value="Transferencia">Categoría: Transferencia Tecnológica</option>
          <option value="Incubación">Categoría: Incubación de Negocios</option>
        </select>

        <button
          type="button"
          onClick={handleGenerateService}
          disabled={isGeneratingWithAi}
          className="metal px-4 py-2 text-xs font-semibold text-white flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isGeneratingWithAi ? (
            <Sparkles className="w-4 h-4 animate-spin text-[#27DCFF]" />
          ) : (
            <Plus className="w-4 h-4 text-[#F3C26B]" />
          )}
          <span>{isGeneratingWithAi ? 'Estructurando con Gemini...' : 'Estructurar Ficha'}</span>
        </button>
      </div>

      {/* Service Portfolio Grid + Detailed Service Sheet */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Service Catalog List */}
        <div className="lg:col-span-5 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-textMuted l">
            Servicios Estructurados ({services.length})
          </h3>

          <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
            {services.map((srv) => {
              const isSelected = srv.id === activeServiceId;
              return (
                <div
                  key={srv.id}
                  onClick={() => setActiveServiceId(srv.id)}
                  className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                    isSelected
                      ? 'g bg-gradient-to-r from-[#2E9CBA]/20 to-transparent border-[#27DCFF] shadow-md'
                      : 'g2 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[#2E9CBA]/20 text-[#5EC2DD] border border-[#2E9CBA]/40">
                      {srv.category}
                    </span>
                    <span className="text-[11px] text-brand-textMuted m">{srv.durationWeeks} semanas</span>
                  </div>
                  <h4 className="text-sm font-bold text-white sy mb-1">{srv.name}</h4>
                  <p className="text-xs text-brand-textSecondary line-clamp-2">{srv.problemSolved}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Service Detailed Sheet */}
        <div className="lg:col-span-7 g p-6 flex flex-col gap-5 border border-white/15 bg-gradient-to-br from-[#0A4A5C]/35 to-[#04222B]/90">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#F29F05]/20 text-[#F3C26B] border border-[#F29F05]/40">
                  {activeService.category}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-xs text-brand-textMuted">
                  Escuela: {activeService.unadSchool}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white sy leading-snug">{activeService.name}</h2>
            </div>

            {services.length > 1 && (
              <button
                onClick={() => handleDeleteService(activeService.id)}
                className="p-2 rounded-xl text-white/40 hover:text-red-400 hover:bg-white/10 transition-colors"
                title="Eliminar este servicio del portafolio"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="g2 p-3.5 rounded-xl">
              <span className="text-brand-textMuted l block mb-1">Población Objetivo y Beneficiarios</span>
              <p className="text-white/90 text-sm">{activeService.targetAudience}</p>
            </div>

            <div className="g2 p-3.5 rounded-xl">
              <span className="text-brand-textMuted l block mb-1">Problema Territorial que Resuelve</span>
              <p className="text-white/90 text-sm leading-relaxed">{activeService.problemSolved}</p>
            </div>

            <div>
              <span className="text-brand-textMuted l block mb-2">Entregables Formales del Servicio:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeService.deliverables.map((deliv, i) => (
                  <div key={i} className="flex items-start gap-2 g2 p-2.5 rounded-xl text-white">
                    <CheckCircle className="w-4 h-4 text-[#A8C63C] shrink-0 mt-0.5" />
                    <span>{deliv}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="g2 p-3 rounded-xl">
                <span className="text-brand-textMuted l block mb-0.5">Duración Estimada</span>
                <span className="text-white font-bold text-base sy">{activeService.durationWeeks} semanas de ejecución</span>
              </div>
              <div className="g2 p-3 rounded-xl">
                <span className="text-brand-textMuted l block mb-0.5">Metodología de Transferencia</span>
                <span className="text-[#5EC2DD] font-bold text-base sy">Acompañamiento en Parcela</span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-auto border-t border-white/10 flex items-center justify-between">
            <span className="text-xs text-brand-textMuted m">Apartado 8 · Documento Fundante CIP</span>
            <button
              type="button"
              className="metal px-5 py-2.5 text-xs font-semibold text-white flex items-center gap-2 cursor-pointer"
            >
              <span>Vincular al Documento Fundante</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#F3C26B]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
