import React, { useEffect, useState } from 'react';
import { Check, Copy, Edit3, Trash2 } from 'lucide-react';
import { Disclosure } from '@/components/lab/RichDocument';

/**
 * Revisar, corregir, copiar y borrar lo que sale de cada herramienta. En el taller, cada grupo lee el
 * resultado, lo ajusta a su territorio y decide qué se lleva a la siguiente herramienta: lo que se
 * corrige aquí es lo que ve la siguiente herramienta y lo que sale en el informe.
 */

/** Copia al portapapeles; si el navegador no deja (página sin https, permisos), usa el método de siempre. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(area);
      return ok;
    } catch {
      return false;
    }
  }
}

/** Botón «Copiar»: avisa «Copiado» un momento. */
export const CopyButton: React.FC<{ getText: () => string; label?: string; small?: boolean }> = ({ getText, label = 'Copiar', small = true }) => {
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle');
  useEffect(() => {
    if (state === 'idle') return;
    const timer = window.setTimeout(() => setState('idle'), 2000);
    return () => window.clearTimeout(timer);
  }, [state]);
  return (
    <button
      type="button"
      className={`lab-btn ${small ? 'lab-btn-sm' : ''}`}
      onClick={() => void copyText(getText()).then((ok) => setState(ok ? 'ok' : 'fail'))}
      aria-live="polite"
    >
      {state === 'ok' ? <Check className="w-3 h-3" aria-hidden="true" /> : <Copy className="w-3 h-3" aria-hidden="true" />}{' '}
      {state === 'ok' ? 'Copiado' : state === 'fail' ? 'No se pudo copiar' : label}
    </button>
  );
};

/**
 * Copiar, Editar y Borrar un texto. Al editar se abre un cuadro con el texto; «Guardar» lo reemplaza y
 * «Cancelar» lo deja como estaba. Borrar pide confirmación y no se puede deshacer (se puede «Rehacer» con la IA).
 */
export const ResultToolbar: React.FC<{
  /** Cómo se llama lo que se edita, para los avisos («el bloque», «el nodo», «el plan»). */
  noun: string;
  text: string;
  onSave: (text: string) => void;
  onDelete?: () => void;
  disabled?: boolean;
  /** Texto de ayuda sobre el formato que se espera al editar. */
  hint?: string;
}> = ({ noun, text, onSave, onDelete, disabled, hint }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);

  // Si el texto cambia desde afuera (se rehizo o se cambió de bloque), el cuadro no se queda con lo viejo.
  useEffect(() => {
    if (!editing) setDraft(text);
  }, [text, editing]);

  const remove = () => {
    if (window.confirm(`¿Borrar ${noun}? No se puede deshacer; si lo necesitas de nuevo, puedes rehacerlo con la IA.`)) onDelete?.();
  };

  if (editing) {
    return (
      <div className="space-y-2 w-full">
        <label className="lab-label" htmlFor="result-edit">
          Corrige {noun}
        </label>
        <textarea
          id="result-edit"
          className="lab-input font-mono text-xs leading-relaxed"
          style={{ minHeight: '16rem' }}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          spellCheck
        />
        {hint && <p className="text-[11px] text-brand-textMuted">{hint}</p>}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="metal px-4 py-2 text-xs font-bold"
            onClick={() => {
              onSave(draft);
              setEditing(false);
            }}
          >
            Guardar cambios
          </button>
          <button
            type="button"
            className="lab-btn lab-btn-sm"
            onClick={() => {
              setDraft(text);
              setEditing(false);
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`Acciones sobre ${noun}`}>
      <button type="button" className="lab-btn lab-btn-sm" disabled={disabled} onClick={() => setEditing(true)}>
        <Edit3 className="w-3 h-3" aria-hidden="true" /> Corregir
      </button>
      <CopyButton getText={() => text} />
      {onDelete && (
        <button type="button" className="lab-btn lab-btn-sm" disabled={disabled} onClick={remove}>
          <Trash2 className="w-3 h-3" aria-hidden="true" /> Borrar
        </button>
      )}
    </div>
  );
};

/** Una parte de un resultado largo (bloque del estudio, parte de la ideación o del árbol). */
export interface ReviewSection {
  number: number;
  title: string;
  markdown: string;
}

/**
 * Panel «Revisar y ajustar»: todas las partes del resultado, cada una con Corregir, Copiar y Borrar.
 * También deja copiar todo el resultado de una vez.
 */
export function SectionsWorkbench<T extends ReviewSection>({
  title = 'Revisar y ajustar antes de seguir',
  sections,
  onReplace,
  onClearSection,
  disabled,
}: {
  title?: string;
  sections: readonly T[];
  /** Guarda la parte corregida. */
  onReplace: (index: number, next: T) => void;
  /** Deja la parte vacía (borrada). */
  onClearSection: (index: number, section: T) => void;
  disabled?: boolean;
}) {
  if (!sections.length) return null;
  return (
    <Disclosure title={<span className="text-sm font-semibold text-white sy">{title}</span>}>
      <div className="space-y-4">
        <p className="text-xs text-brand-textSecondary leading-relaxed">
          Lean cada parte, corríjanla con lo que sabe el grupo, copien lo que necesiten o borren lo que no sirva. Lo que queda aquí es lo que llega a la siguiente
          herramienta y a los informes.
        </p>
        <div className="flex flex-wrap gap-2">
          <CopyButton label="Copiar todo" small={false} getText={() => sections.map((s) => s.markdown).filter((m) => m.trim()).join('\n\n')} />
        </div>
        <ol className="space-y-3 list-none p-0">
          {sections.map((section, index) => (
            <li key={section.number} className="lab-card space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-bold text-white sy">
                  {section.number}. {section.title}
                </span>
                {!section.markdown.trim() && <span className="text-[11px] text-[#F3C26B]">Vacía</span>}
              </div>
              {section.markdown.trim() && <p className="text-xs text-brand-textMuted line-clamp-2">{section.markdown.replace(/[#*|>_`-]/g, ' ').replace(/\s+/g, ' ').trim()}</p>}
              <ResultToolbar
                noun={`«${section.title}»`}
                text={section.markdown}
                disabled={disabled}
                onSave={(text) => onReplace(index, { ...section, markdown: text })}
                onDelete={section.markdown.trim() ? () => onClearSection(index, section) : undefined}
              />
            </li>
          ))}
        </ol>
      </div>
    </Disclosure>
  );
}
