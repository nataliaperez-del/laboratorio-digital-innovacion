import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Radio } from 'lucide-react';
import { loadRadarFeed, radarTrends, type RadarSignal } from '@/services/observatorio';

interface Props {
  /** Texto con el que el Radar busca las tendencias afines: el tema, la idea o el territorio. */
  theme: string;
  /** Qué hace la herramienta con estas tendencias al generar. */
  note: string;
  /** Si se indica, cada tendencia ofrece usarla como insumo. */
  onPick?: (signal: RadarSignal) => void;
  pickLabel?: string;
  onOpenRadar?: () => void;
}

/**
 * Tendencias del Radar del Observatorio para la herramienta en curso: las afines al tema y, si
 * faltan, las de mayor impacto. Es lo mismo que la herramienta le entrega a la IA al generar.
 * Si el Radar no responde, el bloque lo dice y la herramienta sigue funcionando.
 */
export const RadarTrends: React.FC<Props> = ({ theme, note, onPick, pickLabel = 'Usar esta tendencia', onOpenRadar }) => {
  const [signals, setSignals] = useState<RadarSignal[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const deferredTheme = useDeferredValue(theme);

  useEffect(() => {
    let alive = true;
    loadRadarFeed()
      .then((feed) => alive && setSignals(feed.senales))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const trends = useMemo(() => radarTrends(signals ?? [], deferredTheme, 6), [signals, deferredTheme]);
  const related = trends.filter((t) => t.related).length;
  const active = trends.find((t) => t.signal.id === open)?.signal;

  return (
    <section className="lab-card space-y-2.5" aria-label="Tendencias del Radar">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-white sy flex items-center gap-1.5">
          <Radio className="w-4 h-4 text-[var(--brand-teal-text)]" aria-hidden="true" /> Tendencias del Radar
        </h3>
        {onOpenRadar && (
          <button type="button" className="lab-btn lab-btn-sm" onClick={onOpenRadar}>
            Ver el Radar
          </button>
        )}
      </header>

      {failed ? (
        <p className="text-xs text-brand-textMuted">El Radar del Observatorio no respondió. La herramienta funciona igual, sin sus tendencias.</p>
      ) : !signals ? (
        <p className="text-xs text-brand-textMuted">Leyendo el Radar del Observatorio…</p>
      ) : (
        <>
          <p className="text-[11px] text-brand-textMuted">
            {related ? `${related} ${related === 1 ? 'tendencia afín' : 'tendencias afines'} a lo que estás trabajando` : 'Ninguna coincide con el tema todavía: estas son las de mayor impacto'}
            . {note}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {trends.map(({ signal, related: isRelated }) => (
              <button
                key={signal.id}
                type="button"
                aria-expanded={open === signal.id}
                className="lab-chip lab-chip-btn"
                style={open === signal.id ? { borderColor: signal.color, color: 'var(--text-primary)' } : undefined}
                onClick={() => setOpen(open === signal.id ? null : signal.id)}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: signal.color }} aria-hidden="true" />
                {signal.nombre}
                {isRelated && <span className="text-[var(--brand-olive)] font-semibold">· afín</span>}
              </button>
            ))}
          </div>
          {active && (
            <div className="rounded-xl border border-white/10 p-3 space-y-1.5">
              <p className="text-[11px] text-brand-textMuted">
                {active.area} · Impacto {active.impacto}% · Adopción {active.adopcion}%{active.horizonte ? ` · ${active.horizonte}` : ''}
              </p>
              <p className="text-xs text-brand-textSecondary leading-snug">{active.descripcion}</p>
              {active.oportunidades.length > 0 && <p className="text-xs text-brand-textSecondary leading-snug">Oportunidades: {active.oportunidades.join('; ')}.</p>}
              {onPick && (
                <button type="button" className="lab-btn lab-btn-sm" onClick={() => onPick(active)}>
                  {pickLabel}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
};
