import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquareHeart, X } from 'lucide-react';
import { EMPTY_ANSWERS, isComplete, SATISFACTION_QUESTIONS, type SurveyAnswers, type SurveyField } from '@/lib/satisfaction';
import type { DownloadFormat } from '@/store/useStore';

interface Props {
  format: DownloadFormat;
  documentName: string;
  onSubmit: (answers: Record<SurveyField, number>) => void;
  onCancel: () => void;
}

const FORMAT_LABEL: Record<DownloadFormat, string> = { word: 'Word', pdf: 'PDF' };

/**
 * Las tres preguntas de satisfacción, obligatorias antes de entregar el documento. Cancelar no
 * descarga nada. ZOE no la ve ni la responde (`data-zoe-ignore`): la opinión es de la persona.
 * Se dibuja en `document.body` para quedar encima de todo, también de la cabecera.
 */
export const SatisfactionDialog: React.FC<Props> = ({ format, documentName, onSubmit, onCancel }) => {
  const [answers, setAnswers] = useState<SurveyAnswers>(EMPTY_ANSWERS);
  const firstRef = useRef<HTMLButtonElement>(null);
  const complete = isComplete(answers);
  const missing = SATISFACTION_QUESTIONS.filter((q) => answers[q.field] === null).length;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [onCancel]);

  return createPortal(
    <div className="lab-survey-backdrop" data-zoe-ignore onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="lab-survey" role="dialog" aria-modal="true" aria-labelledby="survey-title" aria-describedby="survey-desc">
        <header className="flex items-start gap-3">
          <MessageSquareHeart className="w-6 h-6 shrink-0 text-[var(--brand-teal-text)] mt-0.5" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2 id="survey-title" className="text-base font-bold sy">
              Antes de descargar, tu opinión
            </h2>
            <p id="survey-desc" className="text-xs text-brand-textSecondary mt-0.5">
              Tres preguntas sobre «{documentName}». Tus respuestas mejoran el Laboratorio y se ven en las métricas del Contenedor de resultados.
            </p>
          </div>
          <button type="button" className="lab-btn lab-btn-icon" onClick={onCancel} aria-label="Cancelar la descarga">
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </header>

        {SATISFACTION_QUESTIONS.map((q, qi) => {
          const values = Array.from({ length: q.max - q.min + 1 }, (_, i) => q.min + i);
          return (
            <fieldset key={q.field} className="space-y-2">
              <legend className="text-sm font-semibold mb-2">
                {qi + 1}. {q.question}
              </legend>
              <div className="lab-scale" role="radiogroup" aria-label={q.question}>
                {values.map((v, i) => (
                  <button
                    key={v}
                    ref={qi === 0 && i === 0 ? firstRef : undefined}
                    type="button"
                    role="radio"
                    aria-checked={answers[q.field] === v}
                    aria-label={`${v}${v === q.min ? `, ${q.low}` : v === q.max ? `, ${q.high}` : ''}`}
                    onClick={() => setAnswers((a) => ({ ...a, [q.field]: v }))}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-[11px] text-brand-textMuted" aria-hidden="true">
                <span>{q.low}</span>
                <span>{q.high}</span>
              </div>
            </fieldset>
          );
        })}

        <footer className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
          {!complete && (
            <span className="text-[11px] text-brand-textMuted mr-auto" aria-live="polite">
              {missing === 1 ? 'Falta 1 pregunta' : `Faltan ${missing} preguntas`}
            </span>
          )}
          <button type="button" className="lab-btn" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="metal px-5 py-2 text-xs font-bold disabled:opacity-40" disabled={!complete} onClick={() => complete && onSubmit(answers)}>
            Enviar y descargar en {FORMAT_LABEL[format]}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
};
