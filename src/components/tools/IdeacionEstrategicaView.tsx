import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BrainCircuit, CheckCircle2, FolderArchive, Lightbulb, Rocket, Sparkles, Target, Trees } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { GenerationCancelledError } from '@/services/ai';
import { generateThemeVocationAndOptions, regenerateVocationSection } from '@/services/ideation';
import { signalAsInput, type RadarSignal } from '@/services/observatorio';
import { parseThemeProposal, type ParsedTheme } from '@/lib/themeProposal';
import { ideacionReport } from '@/lib/labReports';
import { MODULE_LABELS } from '@/lib/moduleLabels';
import { buildDocumentPlan, inlineToPlainText } from '@/lib/documentPlan';
import { parseAlerts } from '@/lib/territorialInsights';
import { VOCATION_PARTS, type InputSource } from '@/prompts/themeAndInnovationPrompts';
import { Disclosure, RichDocument } from '@/components/lab/RichDocument';
import {
  BancoStatus,
  ClearButton,
  EmptyState,
  ErrorNotice,
  FileDrop,
  GenerationProgress,
  ReportActions,
  SectionReview,
  SegmentedControl,
  ToolHeader,
  type ProgressState,
  OfflineNotice,
} from '@/components/lab/common';
import { ObservatorioPicker } from '@/components/lab/ObservatorioPicker';
import type { ToolId } from '@/components/layout/Header';

type InputMode = 'texto' | 'archivo' | 'estudio' | 'observatorio';

/** Titular de la vocación: la frase «El territorio presenta una vocación…» o el primer enunciado. */
function vocationHeadline(markdown: string): string {
  const paragraphs = buildDocumentPlan(markdown)
    .blocks.filter((b) => b.kind === 'paragraph')
    .map((b) => (b.kind === 'paragraph' ? inlineToPlainText(b.inline) : ''));
  const formula = paragraphs.find((p) => /vocaci[oó]n\s+(orientada|de\s+servicio|hacia|en)\b/i.test(p));
  const text = formula ?? paragraphs[0] ?? '';
  const sentence = text.split(/(?<=[.;])\s/)[0] || text;
  return sentence.length > 260 ? `${sentence.slice(0, 259).trimEnd()}…` : sentence;
}

/** Brechas y oportunidades de un tema, según las viñetas que exige el prompt. */
function themeFacets(body: string): { brechas: string; oportunidades: string; resto: string; alertas: string[] } {
  const alertas = parseAlerts(body).map((a) => a.detail);
  const clean = (s: string) =>
    s
      .replace(/==[^=]+==/g, '')
      .replace(/[*_]/g, '')
      .replace(/\s+([.,;])/g, '$1')
      .replace(/\.{2,}/g, '.')
      .trim();
  const grab = (label: RegExp) => clean(body.match(new RegExp(`${label.source}[^:]*:\\**\\s*([^\\n]+)`, 'i'))?.[1] ?? '');
  const resto = body
    .split('\n')
    .filter((l) => !/brechas que atiende|oportunidades que aprovecha/i.test(l))
    .join('\n')
    .trim();
  return { brechas: grab(/brechas que atiende/), oportunidades: grab(/oportunidades que aprovecha/), resto, alertas };
}

const ThemeCard: React.FC<{ theme: ParsedTheme; index: number; selected: boolean; dimmed: boolean; onChoose: () => void }> = ({
  theme,
  index,
  selected,
  dimmed,
  onChoose,
}) => {
  const { brechas, oportunidades, resto, alertas } = useMemo(() => themeFacets(theme.body), [theme.body]);
  return (
    <div className={`lab-card flex flex-col gap-3 ${selected ? 'is-selected' : ''} ${dimmed ? 'opacity-70' : ''}`}>
      <div className="flex items-center justify-between">
        <span className="lab-chip">Opción {index + 1}</span>
        {selected && (
          <span className="text-xs text-[var(--brand-olive)] font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Tema elegido
          </span>
        )}
      </div>
      <h3 className="text-base font-bold text-white sy leading-snug">{theme.title}</h3>
      {brechas && (
        <div>
          <span className="text-[11px] font-semibold text-[#F3C26B] block">Brechas que atiende</span>
          <p className="text-xs text-brand-textSecondary leading-relaxed">{brechas}</p>
        </div>
      )}
      {oportunidades && (
        <div>
          <span className="text-[11px] font-semibold text-[var(--brand-teal-text)] block">Oportunidades que aprovecha</span>
          <p className="text-xs text-brand-textSecondary leading-relaxed">{oportunidades}</p>
        </div>
      )}
      {alertas.map((a, k) => (
        <div key={k} className="lab-callout" role="note">
          <span className="text-xs">Por verificar: {a}</span>
        </div>
      ))}
      {resto && (
        <Disclosure title={<span className="text-xs font-semibold text-brand-textSecondary">Justificación</span>}>
          <RichDocument markdown={resto} />
        </Disclosure>
      )}
      <button type="button" className={`mt-auto ${selected ? 'lab-btn' : 'metal px-4 py-2 text-xs font-bold'}`} onClick={onChoose} aria-pressed={selected}>
        {selected ? 'Elegido' : 'Elegir este tema'}
      </button>
    </div>
  );
};

interface Props {
  onNavigate: (tool: ToolId) => void;
}

/** Herramienta Ideación: insumo, vocación y tres temas para elegir. */
export const IdeacionEstrategicaView: React.FC<Props> = ({ onNavigate }) => {
  const {
    containerData,
    prompt0Data,
    ideationSource,
    themeProposalMarkdown,
    vocationSections,
    setIdeationResult,
    replaceVocationSection,
    selectedLabThemeIndex,
    setSelectedLabThemeIndex,
    setTreeSeed,
    setPrototypeSeed,
    clearIdeacion,
  } = useStore();
  const inBank = useStore((st) => st.savedIdeations.some((entry) => entry.id === st.bankIds.ideacion));

  const [mode, setMode] = useState<InputMode>(ideationSource?.kind === 'estudio' ? 'estudio' : 'texto');
  const [text, setText] = useState('');
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [signal, setSignal] = useState<RadarSignal | null>(null);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // El Radar deja aquí su señal: la herramienta la recibe como insumo listo para generar.
  useEffect(() => {
    if (ideationSource?.kind === 'observatorio' && !themeProposalMarkdown) {
      setMode('observatorio');
    } else if (ideationSource?.kind === 'estudio' && !themeProposalMarkdown) {
      setMode('estudio');
    }
  }, [ideationSource, themeProposalMarkdown]);

  const busy = progress !== null || busyIndex !== null;
  const hasStudy = Boolean(containerData.trim());

  /** La propuesta ya está en el Banco: se vacía el insumo y el resultado para empezar otra. */
  const clearAll = () => {
    clearIdeacion();
    setMode('texto');
    setText('');
    setFile(null);
    setSignal(null);
    setError(null);
  };

  const source: InputSource | null = useMemo(() => {
    if (mode === 'texto') return text.trim() ? { kind: 'texto', label: text.trim().slice(0, 80), text: text.trim() } : null;
    if (mode === 'archivo') return file ? { kind: 'archivo', label: file.name, text: file.text } : null;
    if (mode === 'estudio') return hasStudy ? { kind: 'estudio', label: `Estudio Territorial de ${prompt0Data.municipality}`, text: containerData } : null;
    if (signal) return { kind: 'observatorio', label: signal.nombre, text: signalAsInput(signal) };
    return ideationSource?.kind === 'observatorio' ? ideationSource : null;
  }, [mode, text, file, hasStudy, containerData, prompt0Data.municipality, signal, ideationSource]);

  const proposal = useMemo(() => parseThemeProposal(themeProposalMarkdown), [themeProposalMarkdown]);
  const hasResult = Boolean(themeProposalMarkdown.trim());

  /** Secciones posteriores a las opciones: alineación, fuentes y alertas. */
  const closing = useMemo(() => {
    const match = themeProposalMarkdown.match(/^##\s+Verificaci[oó]n de alineaci[oó]n[\s\S]*$/im);
    return match?.[0] ?? '';
  }, [themeProposalMarkdown]);

  const generate = async () => {
    if (busy || !source) return;
    if (hasResult && !window.confirm('Esto reemplaza la vocación y los temas actuales. ¿Continuar?')) return;
    setError(null);
    setProgress({ current: 1, total: VOCATION_PARTS.length, title: 'Preparando' });
    try {
      const result = await generateThemeVocationAndOptions(source, (p) => setProgress({ current: p.currentPart, total: p.totalParts, title: p.partTitle }));
      if (!result.markdown.trim()) throw new Error(result.sections.find((s) => s.issue)?.issue || 'La IA no generó contenido.');
      setIdeationResult(source, result.markdown, result.sections);
    } catch (e) {
      if (!(e instanceof GenerationCancelledError)) setError(e instanceof Error ? e.message : 'Error al generar la ideación.');
    } finally {
      setProgress(null);
    }
  };

  const regenerate = async (index: number) => {
    if (busy || !ideationSource) return;
    setBusyIndex(index);
    setError(null);
    try {
      const result = await regenerateVocationSection(ideationSource, index, vocationSections);
      replaceVocationSection(index, result);
      if (result.status === 'failed') setError(`La parte «${result.title}» volvió a fallar: ${result.issue || 'sin detalle'}`);
    } catch (e) {
      if (!(e instanceof GenerationCancelledError)) setError(e instanceof Error ? e.message : 'Error al rehacer la parte.');
    } finally {
      setBusyIndex(null);
    }
  };

  const chosen = proposal && selectedLabThemeIndex !== null ? proposal.themes[selectedLabThemeIndex] : null;

  const toTree = () => {
    if (!chosen) return;
    setTreeSeed({ theme: chosen.title, explanation: chosen.body });
    onNavigate('arbol');
  };
  const toPrototype = () => {
    if (!chosen) return;
    setPrototypeSeed({ origin: { kind: 'ideacion', label: 'Tema elegido en Ideación' }, topic: chosen.title, context: chosen.body });
    onNavigate('prototipado');
  };

  return (
    <div className="w-full space-y-6">
      <ToolHeader
        title={MODULE_LABELS.ideacion.title}
        subtitle={MODULE_LABELS.ideacion.subtitle}
        titleColor="#F29F05"
        description="Construye la vocación y tres alternativas de tema con el mismo proceso de la vocación territorial: identifica dinámicas, cruza brechas y oportunidades, y deja la decisión al equipo. Parte de un tema, un archivo, una señal del Observatorio o el Estudio Territorial."
      >
        {hasResult && inBank && <BancoStatus color="#F29F05" onOpen={() => onNavigate('banco')} />}
        {hasResult && (
          <ReportActions disabled={busy} getReport={() => ideacionReport(prompt0Data, themeProposalMarkdown, ideationSource?.label || 'Ideación')} />
        )}
        {hasResult && <ClearButton disabled={busy} onClear={clearAll} />}
      </ToolHeader>

      <ErrorNotice message={error} onClose={() => setError(null)} />
      <OfflineNotice onOpenBank={() => onNavigate('banco')}>Puedes elegir uno de los tres temas de una ideación guardada y llevarlo al Árbol o a Prototipado.</OfflineNotice>

      <section className="lab-panel space-y-4" aria-label="Insumo de la ideación">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-[#F29F05] sy flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-[#F29F05]" aria-hidden="true" /> ¿De qué partimos?
          </h2>
          <SegmentedControl<InputMode>
            label="Tipo de insumo"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'texto', label: 'Un tema' },
              { value: 'archivo', label: 'Un archivo' },
              { value: 'observatorio', label: 'Señal del Observatorio' },
              { value: 'estudio', label: 'Estudio Territorial', disabled: !hasStudy },
            ]}
          />
        </div>

        {mode === 'texto' && (
          <textarea
            className="lab-input"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Una palabra, un reto o varios párrafos. Ej: aprovechamiento de residuos de café en pequeños productores"
            aria-label="Tema o reto"
          />
        )}
        {mode === 'archivo' && <FileDrop fileName={file?.name ?? null} onLoaded={(name, content) => setFile({ name, text: content })} onError={setError} />}
        {mode === 'observatorio' && (
          <>
            <ObservatorioPicker selectedId={signal?.id ?? null} onPick={setSignal} />
            {!signal && ideationSource?.kind === 'observatorio' && (
              <p className="text-xs text-[var(--brand-olive)]">Señal recibida del Radar: {ideationSource.label}</p>
            )}
          </>
        )}
        {mode === 'estudio' && (
          <p className="text-sm text-brand-textSecondary">
            Se usará el Estudio Territorial de <strong className="text-white">{prompt0Data.municipality}</strong>, con su matriz FODA como insumo principal.
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-brand-textMuted max-w-xl">
            {mode === 'estudio'
              ? 'La IA trabaja solo con lo que consta en el estudio y arrastra sus alertas.'
              : 'Sin diagnóstico previo, la IA complementa con fuentes públicas citadas y marca lo que deba verificarse.'}
          </p>
          <button
            type="button"
            className="metal px-6 py-2.5 text-xs font-bold flex items-center gap-2 disabled:opacity-40"
            disabled={busy || !source}
            onClick={() => void generate()}
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" /> {hasResult ? 'Generar de nuevo' : 'Generar vocación y 3 temas'}
          </button>
        </div>
      </section>

      <GenerationProgress progress={progress} label="Parte" />

      {hasResult ? (
        <>
          <SectionReview
            title="Revisión automática"
            sections={vocationSections}
            busyIndex={busyIndex}
            disabled={busy}
            onRegenerate={(i) => void regenerate(i)}
          />

          {proposal ? (
            <>
              <section className="lab-panel lab-hero" aria-label="Vocación">
                <span className="lab-hero-icon">
                  <Lightbulb className="w-5 h-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1 space-y-2">
                  <span className="text-[11px] font-semibold text-[var(--brand-teal-text)]">Vocación · {ideationSource?.label}</span>
                  <p className="text-lg font-bold text-white sy leading-snug">{vocationHeadline(proposal.vocationMarkdown)}</p>
                  <Disclosure title={<span className="text-xs font-semibold text-brand-textSecondary">Ver análisis y justificación completa</span>}>
                    <RichDocument markdown={proposal.vocationMarkdown} dropTitle />
                  </Disclosure>
                </div>
              </section>

              <section className="space-y-3" aria-label="Alternativas de tema">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-white sy flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#F3C26B]" aria-hidden="true" /> Decisión del equipo: elige un tema
                  </h2>
                  {!chosen && <span className="text-xs text-[#F3C26B]">Aún no hay un tema elegido.</span>}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
                  {proposal.themes.slice(0, 3).map((theme, i) => (
                    <ThemeCard
                      key={i}
                      theme={theme}
                      index={i}
                      selected={selectedLabThemeIndex === i}
                      dimmed={selectedLabThemeIndex !== null && selectedLabThemeIndex !== i}
                      onChoose={() => setSelectedLabThemeIndex(i)}
                    />
                  ))}
                </div>
              </section>

              {closing && (
                <Disclosure title={<span className="text-sm font-semibold text-white sy">Alineación institucional, fuentes y alertas</span>}>
                  <RichDocument markdown={closing} />
                </Disclosure>
              )}

              {chosen && (
                <div className="lab-panel flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-brand-textSecondary min-w-0">
                    Tema elegido: <strong className="text-white">{chosen.title}</strong>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="metal px-4 py-2 text-xs font-bold flex items-center gap-2" onClick={toTree}>
                      <Trees className="w-4 h-4" aria-hidden="true" /> Construir su Árbol <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    <button type="button" className="lab-btn" onClick={toPrototype}>
                      <Rocket className="w-4 h-4" aria-hidden="true" /> Prototiparlo
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="lab-panel space-y-3">
              <p className="text-sm text-[#F3C26B]">
                La respuesta no trae las tres opciones en el formato esperado; así se ve completa. Usa «Rehacer» en la parte de temas.
              </p>
              <RichDocument markdown={themeProposalMarkdown} />
            </div>
          )}
        </>
      ) : (
        !progress && (
          <EmptyState title="Aún no hay ideas">
            Elige de qué partir y genera. Verás la vocación declarada y tres temas con las brechas y oportunidades de cada uno, listos para decidir.
          </EmptyState>
        )
      )}
    </div>
  );
};
