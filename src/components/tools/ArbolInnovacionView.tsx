import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, ChevronRight, FolderArchive, Rocket, Sparkles, Trees } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { GenerationCancelledError } from '@/services/ai';
import { generateInnovationTree, regenerateInnovationTreeSection } from '@/services/innovationTree';
import { signalAsInput } from '@/services/observatorio';
import { FRUIT_LABEL, LEVEL_LABEL, routeOf, type FruitType, type TreeGraph, type TreeLevel, type TreeNode } from '@/lib/innovationTreeGraph';
import { renderTreeSvg } from '@/lib/innovationTreeSvg';
import { arbolReport } from '@/lib/labReports';
import { MODULE_LABELS } from '@/lib/moduleLabels';
import { INNOVATION_TREE_PARTS } from '@/prompts/themeAndInnovationPrompts';
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

const EVIDENCE_TEXT: Record<TreeNode['evidencia'], string> = {
  N1: 'N1 · viene del Observatorio',
  N2: 'N2 · con fuente citada',
  N3: 'N3 · hipótesis por verificar',
};

const LEGEND: Array<{ level: TreeLevel; text: string }> = [
  { level: 'suelo', text: 'Las fuentes que sustentan el análisis.' },
  { level: 'raiz', text: 'Los problemas y brechas que justifican innovar.' },
  { level: 'tronco', text: 'El tema central que articula todo.' },
  { level: 'global', text: 'Hasta 10 tendencias mundiales.' },
  { level: 'nacional', text: 'Las 5 con mayor impacto en Colombia.' },
  { level: 'territorial', text: 'Las 3 con mayor impacto en el territorio.' },
  { level: 'hoja', text: 'Oportunidades que abren esas tendencias.' },
  { level: 'fruto', text: 'Proyectos, servicios y prototipos posibles.' },
];

type FruitFilter = 'todos' | FruitType;

/** Lienzo del árbol: el SVG se genera como texto (datos escapados) y se anima por delegación de eventos. */
const TreeCanvas: React.FC<{ graph: TreeGraph; selected: string | null; filter: FruitFilter; onSelect: (codigo: string | null) => void }> = ({
  graph,
  selected,
  filter,
  onSelect,
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const svgText = useMemo(() => renderTreeSvg(graph, { titles: true }), [graph]);

  useEffect(() => {
    const svg = hostRef.current?.querySelector('svg');
    if (!svg) return;
    const route = selected ? routeOf(graph, selected) : null;
    svg.classList.toggle('enfoque', Boolean(route));
    svg.querySelectorAll<SVGGElement>('.nodo').forEach((node) => {
      const code = node.dataset.codigo ?? '';
      node.classList.toggle('sel', code === selected);
      node.classList.toggle('ruta', Boolean(route?.has(code)));
    });
    svg.querySelectorAll<SVGPathElement>('.arista').forEach((edge) => {
      edge.classList.toggle('activa', Boolean(route?.has(edge.dataset.hijo ?? '') && route?.has(edge.dataset.padre ?? '')));
    });
  }, [graph, selected, svgText]);

  useEffect(() => {
    const svg = hostRef.current?.querySelector('svg');
    if (!svg) return;
    const hidden = new Set<string>();
    svg.querySelectorAll<SVGGElement>('.nodo[data-nivel="fruto"]').forEach((node) => {
      const hide = filter !== 'todos' && node.dataset.tipo !== filter;
      node.classList.toggle('oculto', hide);
      if (hide) hidden.add(node.dataset.codigo ?? '');
    });
    svg.querySelectorAll<SVGPathElement>('.arista').forEach((edge) => edge.classList.toggle('oculto', hidden.has(edge.dataset.hijo ?? '')));
  }, [filter, svgText]);

  const pick = (target: EventTarget) => {
    const node = (target as Element).closest?.('.nodo') as SVGGElement | null;
    if (node?.dataset.codigo) onSelect(node.dataset.codigo);
  };

  return (
    <div
      ref={hostRef}
      className="lab-tree-canvas"
      onClick={(e) => pick(e.target)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          pick(e.target);
        }
        if (e.key === 'Escape') onSelect(null);
      }}
      // El texto ya viene escapado por renderTreeSvg.
      dangerouslySetInnerHTML={{ __html: svgText }}
    />
  );
};

const NodeLinks: React.FC<{ label: string; codes: string[]; graph: TreeGraph; onSelect: (c: string) => void }> = ({ label, codes, graph, onSelect }) =>
  codes.length ? (
    <div>
      <span className="text-[11px] font-semibold text-brand-textMuted block mb-1">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {codes.map((c) => (
          <button key={c} type="button" className="lab-chip lab-chip-btn" title={graph.nodos.find((n) => n.codigo === c)?.nombre} onClick={() => onSelect(c)}>
            {c}
          </button>
        ))}
      </div>
    </div>
  ) : null;

const NodePanel: React.FC<{ node: TreeNode | null; graph: TreeGraph; onSelect: (c: string) => void; onPrototype: (n: TreeNode) => void }> = ({
  node,
  graph,
  onSelect,
  onPrototype,
}) => {
  if (!node) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white sy flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[var(--brand-teal-text)]" aria-hidden="true" /> Cómo leer el árbol
        </h3>
        <p className="text-xs text-brand-textMuted">Toca un nodo para ver su detalle y la ruta completa, de la tendencia al fruto. Esc quita el resaltado.</p>
        <ul className="space-y-1.5">
          {LEGEND.map((l) => (
            <li key={l.level} className="text-xs text-brand-textSecondary">
              <strong className="text-white">{LEVEL_LABEL[l.level].split(' · ')[0]}.</strong> {l.text}
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-brand-textMuted">Formas de los frutos: círculo, proyecto; cuadro, servicio; rombo, prototipo.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <span className="text-[11px] font-semibold text-[var(--brand-teal-text)]">{LEVEL_LABEL[node.nivel]}</span>
      <h3 className="text-lg font-bold text-white sy leading-snug">{node.nombre}</h3>
      <div className="flex flex-wrap gap-1.5">
        <span className="lab-chip m">{node.codigo}</span>
        <span className="lab-chip">{EVIDENCE_TEXT[node.evidencia]}</span>
        {node.tipo_fruto && <span className="lab-chip">{FRUIT_LABEL[node.tipo_fruto]}</span>}
      </div>
      {node.descripcion && <p className="text-sm text-brand-textSecondary leading-relaxed">{node.descripcion}</p>}
      {node.solucion && (
        <div>
          <span className="text-[11px] font-semibold text-[var(--brand-olive)] block">Solución posible</span>
          <p className="text-sm text-brand-textSecondary">{node.solucion}</p>
        </div>
      )}
      {node.impacto_esperado && (
        <div>
          <span className="text-[11px] font-semibold text-[#F3C26B] block">Impacto esperado</span>
          <p className="text-sm text-brand-textSecondary">{node.impacto_esperado}</p>
        </div>
      )}
      {node.fuentes.length > 0 && (
        <div>
          <span className="text-[11px] font-semibold text-brand-textMuted block mb-1">Fuentes</span>
          <ul className="text-xs text-brand-textSecondary space-y-1 list-disc pl-4 break-words">
            {node.fuentes.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}
      {node.alertas.length > 0 && (
        <div className="lab-callout" role="note">
          <span>{node.alertas.join(' · ')}</span>
        </div>
      )}
      <NodeLinks label="Deriva de" codes={node.deriva_de} graph={graph} onSelect={onSelect} />
      <NodeLinks label="De aquí derivan" codes={node.derivan} graph={graph} onSelect={onSelect} />
      {(node.nivel === 'fruto' || node.nivel === 'hoja') && (
        <button type="button" className="metal w-full px-4 py-2.5 text-xs font-bold flex items-center justify-center gap-2" onClick={() => onPrototype(node)}>
          <Rocket className="w-4 h-4" aria-hidden="true" /> Armar plan de prototipado <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

/** Vista de tabla, como en el módulo de Boletines: la misma información, filtrable. */
const TreeTable: React.FC<{ graph: TreeGraph; filter: FruitFilter; onOpen: (c: string) => void }> = ({ graph, filter, onOpen }) => (
  <div className="lab-table-wrap">
    <table className="lab-table">
      <caption className="sr-only">Nodos del árbol de innovación</caption>
      <thead>
        <tr>
          <th scope="col">Código</th>
          <th scope="col">Nivel</th>
          <th scope="col">Nombre</th>
          <th scope="col">Tipo</th>
          <th scope="col">Evidencia</th>
          <th scope="col">Deriva de</th>
          <th scope="col">
            <span className="sr-only">Abrir</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {graph.nodos
          .filter((n) => n.nivel !== 'fruto' || filter === 'todos' || n.tipo_fruto === filter)
          .map((n) => (
            <tr key={n.codigo}>
              <td className="m font-bold">{n.codigo}</td>
              <td>{LEVEL_LABEL[n.nivel].split(' · ')[0]}</td>
              <td>{n.nombre}</td>
              <td>{n.tipo_fruto ? FRUIT_LABEL[n.tipo_fruto] : '—'}</td>
              <td>{n.evidencia}</td>
              <td className="m">{n.deriva_de.join(', ') || '—'}</td>
              <td>
                <button type="button" className="lab-btn lab-btn-sm" onClick={() => onOpen(n.codigo)} aria-label={`Ver ${n.codigo} en el árbol`}>
                  <ChevronRight className="w-3 h-3" aria-hidden="true" />
                </button>
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  </div>
);

type ThemeMode = 'texto' | 'archivo' | 'observatorio';

interface Props {
  onNavigate: (tool: ToolId) => void;
}

/** Herramienta Árbol de Innovación: tema, árbol interactivo y documento. */
export const ArbolInnovacionView: React.FC<Props> = ({ onNavigate }) => {
  const {
    prompt0Data,
    containerData,
    treeSeed,
    setTreeSeed,
    treeRequest,
    innovationTreeMarkdown,
    innovationTreeSections,
    treeGraph,
    setTreeResult,
    setPrototypeSeed,
    clearArbol,
  } = useStore();
  const inBank = useStore((st) => st.savedTrees.some((entry) => entry.id === st.bankIds.arbol));

  const [themeMode, setThemeMode] = useState<ThemeMode>('texto');
  const [theme, setTheme] = useState(treeRequest?.themeName ?? '');
  const [explanation, setExplanation] = useState(treeRequest?.themeExplanation ?? '');
  const [fileName, setFileName] = useState<string | null>(null);
  const [signalId, setSignalId] = useState<number | null>(null);
  const [useStudy, setUseStudy] = useState(treeRequest?.useTerritorialStudy ?? false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'arbol' | 'tabla'>('arbol');
  const [filter, setFilter] = useState<FruitFilter>('todos');
  const [selected, setSelected] = useState<string | null>(null);

  // Tema que llega de otra herramienta (Ideación o el Radar).
  useEffect(() => {
    if (!treeSeed) return;
    setTheme(treeSeed.theme);
    setExplanation(treeSeed.explanation);
    setThemeMode('texto');
    setTreeSeed(null);
  }, [treeSeed, setTreeSeed]);

  const busy = progress !== null || busyIndex !== null;
  const hasStudy = Boolean(containerData.trim());

  /** El árbol ya está en el Banco: se vacía el tema y el resultado para empezar otro. */
  const clearAll = () => {
    clearArbol();
    setThemeMode('texto');
    setTheme('');
    setExplanation('');
    setFileName(null);
    setSignalId(null);
    setUseStudy(false);
    setSelected(null);
    setFilter('todos');
    setError(null);
  };
  const selectedNode = treeGraph?.nodos.find((n) => n.codigo === selected) ?? null;

  const stats = useMemo(() => {
    const count = (level: TreeLevel) => treeGraph?.nodos.filter((n) => n.nivel === level).length ?? 0;
    return { global: count('global'), nacional: count('nacional'), territorial: count('territorial'), frutos: count('fruto') };
  }, [treeGraph]);

  const generate = async () => {
    if (busy || !theme.trim()) return;
    if (treeGraph && !window.confirm('Esto reemplaza el árbol actual. ¿Continuar?')) return;
    const request = { themeName: theme.trim(), themeExplanation: explanation, useTerritorialStudy: useStudy && hasStudy };
    setError(null);
    setSelected(null);
    setProgress({ current: 1, total: INNOVATION_TREE_PARTS.length + 1, title: 'Preparando' });
    try {
      const result = await generateInnovationTree(request, (p) => setProgress({ current: p.currentPart, total: p.totalParts, title: p.partTitle }));
      setTreeResult(request, result.markdown, result.sections, result.graph);
    } catch (e) {
      if (!(e instanceof GenerationCancelledError)) setError(e instanceof Error ? e.message : 'Error al construir el árbol.');
    } finally {
      setProgress(null);
    }
  };

  const regenerate = async (index: number) => {
    if (busy || !treeRequest) return;
    setBusyIndex(index);
    setError(null);
    try {
      const result = await regenerateInnovationTreeSection(treeRequest, index, innovationTreeSections);
      setTreeResult(treeRequest, result.markdown, result.sections, result.graph);
    } catch (e) {
      if (!(e instanceof GenerationCancelledError)) setError(e instanceof Error ? e.message : 'Error al rehacer la parte.');
    } finally {
      setBusyIndex(null);
    }
  };

  const toPrototype = useCallback(
    (node: TreeNode) => {
      if (!treeGraph) return;
      const chain = [...routeOf(treeGraph, node.codigo)]
        .map((c) => treeGraph.nodos.find((n) => n.codigo === c))
        .filter((n): n is TreeNode => Boolean(n) && !['suelo', 'raiz'].includes(n!.nivel) && n!.nivel !== 'fruto')
        .map((n) => `${LEVEL_LABEL[n.nivel]}: ${n.nombre}${n.descripcion ? ` — ${n.descripcion}` : ''}`);
      setPrototypeSeed({
        origin: { kind: 'arbol', code: node.codigo, label: `Árbol de Innovación: ${treeGraph.tema}` },
        topic: node.nombre,
        context: [
          node.solucion && `Solución posible: ${node.solucion}`,
          node.impacto_esperado && `Impacto esperado: ${node.impacto_esperado}`,
          'Cadena del árbol:',
          ...chain,
        ]
          .filter(Boolean)
          .join('\n'),
      });
      onNavigate('prototipado');
    },
    [treeGraph, setPrototypeSeed, onNavigate],
  );

  return (
    <div className="w-full space-y-6">
      <ToolHeader
        title={MODULE_LABELS.arbol.title}
        subtitle={MODULE_LABELS.arbol.subtitle}
        titleColor="#5EC2DD"
        description="De las tendencias globales a las de Colombia y el territorio, y de allí a oportunidades y frutos: proyectos, servicios y prototipos. La IA lo construye para cualquier tema; explóralo aquí y descarga el informe formal."
      >
        {treeGraph && inBank && <BancoStatus color="#5EC2DD" onOpen={() => onNavigate('banco')} />}
        {treeGraph && <ReportActions disabled={busy} getReport={() => (treeGraph ? arbolReport(prompt0Data, innovationTreeMarkdown, treeGraph) : null)} />}
        {treeGraph && <ClearButton disabled={busy} onClear={clearAll} />}
      </ToolHeader>

      <ErrorNotice message={error} onClose={() => setError(null)} />
      <OfflineNotice onOpenBank={() => onNavigate('banco')}>Puedes explorar un árbol guardado y llevar cualquiera de sus frutos a Prototipado.</OfflineNotice>

      <section className="lab-panel space-y-4" aria-label="Tema del árbol">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-[#5EC2DD] sy flex items-center gap-2">
            <Trees className="w-4 h-4 text-[#5EC2DD]" aria-hidden="true" /> Tema central
          </h2>
          <SegmentedControl<ThemeMode>
            label="Origen del tema"
            value={themeMode}
            onChange={setThemeMode}
            options={[
              { value: 'texto', label: 'Escribirlo' },
              { value: 'archivo', label: 'Un archivo' },
              { value: 'observatorio', label: 'Señal del Observatorio' },
            ]}
          />
        </div>
        <div>
          <label className="lab-label" htmlFor="tree-theme">
            Tema (desde una palabra hasta el título de un reto)
          </label>
          <input id="tree-theme" className="lab-input" value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Ej: Economía circular del café" />
        </div>
        {themeMode === 'texto' && (
          <div>
            <label className="lab-label" htmlFor="tree-expl">
              Explicación (opcional)
            </label>
            <textarea
              id="tree-expl"
              className="lab-input"
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Una frase o un párrafo que oriente las tendencias"
            />
          </div>
        )}
        {themeMode === 'archivo' && (
          <FileDrop
            fileName={fileName}
            onError={setError}
            onLoaded={(name, content) => {
              setFileName(name);
              setExplanation(content);
              if (!theme.trim()) setTheme(name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '));
            }}
          />
        )}
        {themeMode === 'observatorio' && (
          <ObservatorioPicker
            selectedId={signalId}
            onPick={(s) => {
              setSignalId(s.id);
              setTheme(s.nombre);
              setExplanation(signalAsInput(s));
            }}
          />
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className={`flex items-center gap-2 text-xs ${hasStudy ? 'text-white cursor-pointer' : 'text-brand-textMuted'}`}>
            <input type="checkbox" disabled={!hasStudy} checked={useStudy && hasStudy} onChange={(e) => setUseStudy(e.target.checked)} />
            {hasStudy
              ? `Usar el Estudio Territorial de ${prompt0Data.municipality} como evidencia`
              : 'Sin Estudio Territorial: la raíz se sustenta con fuentes públicas'}
          </label>
          <button
            type="button"
            className="metal px-6 py-2.5 text-xs font-bold flex items-center gap-2 disabled:opacity-40"
            disabled={busy || !theme.trim()}
            onClick={() => void generate()}
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" /> {treeGraph ? 'Construir de nuevo' : 'Construir el árbol con IA'}
          </button>
        </div>
      </section>

      <GenerationProgress progress={progress} label="Parte" />

      {treeGraph ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2" aria-label="Resumen del árbol">
              {[
                [stats.global, 'globales'],
                [stats.nacional, 'Colombia'],
                [stats.territorial, 'territorio'],
                [stats.frutos, 'frutos'],
              ].map(([n, label]) => (
                <span key={label} className="lab-chip">
                  <strong className="text-white">{n}</strong> {label}
                </span>
              ))}
              {treeGraph.origen === 'documento' && (
                <span className="lab-chip" title="La conversión a nodos falló; las relaciones se dedujeron de las tablas del documento.">
                  Reconstruido desde las tablas
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedControl<'arbol' | 'tabla'>
                label="Vista"
                value={view}
                onChange={setView}
                options={[
                  { value: 'arbol', label: 'Árbol' },
                  { value: 'tabla', label: 'Tabla' },
                ]}
              />
              <SegmentedControl<FruitFilter>
                label="Filtrar frutos por tipo"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'todos', label: 'Todos' },
                  { value: 'proyecto', label: 'Proyectos' },
                  { value: 'servicio', label: 'Servicios' },
                  { value: 'prototipo', label: 'Prototipos' },
                ]}
              />
            </div>
          </div>

          {view === 'arbol' ? (
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5 items-start">
              <TreeCanvas graph={treeGraph} selected={selected} filter={filter} onSelect={setSelected} />
              <aside className="lab-panel xl:sticky xl:top-4 xl:max-h-[90vh] xl:overflow-y-auto" aria-live="polite">
                <NodePanel node={selectedNode} graph={treeGraph} onSelect={setSelected} onPrototype={toPrototype} />
              </aside>
            </div>
          ) : (
            <TreeTable
              graph={treeGraph}
              filter={filter}
              onOpen={(c) => {
                setView('arbol');
                setSelected(c);
              }}
            />
          )}

          <SectionReview
            title="Revisión automática"
            sections={innovationTreeSections}
            busyIndex={busyIndex}
            disabled={busy}
            onRegenerate={(i) => void regenerate(i)}
          />

          <Disclosure title={<span className="text-sm font-semibold text-white sy">Análisis detallado: tablas, oportunidades, fuentes y síntesis</span>}>
            <RichDocument markdown={innovationTreeMarkdown} />
          </Disclosure>
        </>
      ) : (
        !progress && (
          <EmptyState title="Aún no hay árbol">
            Escribe un tema y constrúyelo. Cada nodo saldrá del análisis de la IA, con su evidencia y su ruta; el informe formal se descarga en Word o PDF.
          </EmptyState>
        )
      )}
    </div>
  );
};
