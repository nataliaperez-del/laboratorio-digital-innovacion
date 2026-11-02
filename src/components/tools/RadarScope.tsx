import React, { useEffect, useMemo, useRef, useState } from 'react';
import { layoutRadar, polar } from '@/lib/radarLayout';
import type { RadarSignal } from '@/services/observatorio';

const SWEEP_SECONDS = 7;
/** Tiempo que un contacto sigue brillando después de la pasada del barrido. */
const AFTERGLOW_SECONDS = 3.4;
const VIEW = 1000;
const CENTER = VIEW / 2;
const RADIUS = 392;

const toView = (unit: number) => CENTER + unit * RADIUS;

interface Props {
  /** Todas las señales: sus posiciones no cambian al filtrar. */
  all: RadarSignal[];
  visibleIds: Set<number>;
  activeId: number | null;
  relatedIds: number[];
  colorOf: (s: RadarSignal) => string;
  onSelect: (s: RadarSignal) => void;
}

/**
 * Radar de barrido: el haz gira y cada señal se enciende al recibirlo y se apaga poco a poco,
 * como el fósforo de una pantalla real. El sector es el área, la cercanía al centro el impacto
 * y el tamaño la velocidad de adopción.
 */
export const RadarScope: React.FC<Props> = ({ all, visibleIds, activeId, relatedIds, colorOf, onSelect }) => {
  const { sectors, plots } = useMemo(() => layoutRadar(all), [all]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blipRefs = useRef(new Map<number, SVGGElement>());
  const [contact, setContact] = useState<{ id: number; bearing: number; range: number } | null>(null);
  const byId = useMemo(() => new Map(all.map((s) => [s.id, s])), [all]);
  const plotOf = useMemo(() => new Map(plots.map((p) => [p.id, p])), [plots]);

  const visibleRef = useRef(visibleIds);
  visibleRef.current = visibleIds;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let size = 0;
    const fit = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      size = canvas.clientWidth * scale;
      canvas.width = canvas.height = size;
    };
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    fit();

    let raf = 0;
    let lastBearing = 0;
    const startedAt = performance.now();
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const seconds = (now - startedAt) / 1000;
      const bearing = reduced ? 0 : ((seconds / SWEEP_SECONDS) * 360) % 360;
      const u = size / VIEW;
      const r = RADIUS * u;
      const c = CENTER * u;
      ctx.clearRect(0, 0, size, size);

      // Pantalla.
      const glass = ctx.createRadialGradient(c, c, 0, c, c, r);
      glass.addColorStop(0, 'rgba(18, 92, 104, .62)');
      glass.addColorStop(0.72, 'rgba(6, 46, 58, .72)');
      glass.addColorStop(1, 'rgba(3, 22, 30, .92)');
      ctx.fillStyle = glass;
      ctx.beginPath();
      ctx.arc(c, c, r, 0, Math.PI * 2);
      ctx.fill();

      if (!reduced) {
        // Estela del haz: un cono que se desvanece hacia atrás. 0 del canvas apunta al este.
        const heading = ((bearing - 90) * Math.PI) / 180;
        const trail = (ctx as CanvasRenderingContext2D).createConicGradient(heading, c, c);
        trail.addColorStop(0, 'rgba(39, 220, 255, 0)');
        trail.addColorStop(0.72, 'rgba(39, 220, 255, 0)');
        trail.addColorStop(0.985, 'rgba(39, 220, 255, .3)');
        trail.addColorStop(1, 'rgba(39, 220, 255, .46)');
        ctx.fillStyle = trail;
        ctx.beginPath();
        ctx.arc(c, c, r, 0, Math.PI * 2);
        ctx.fill();
        // El haz en sí.
        ctx.strokeStyle = 'rgba(159, 232, 255, .95)';
        ctx.lineWidth = 2 * u;
        ctx.shadowColor = '#27DCFF';
        ctx.shadowBlur = 16 * u;
        ctx.beginPath();
        ctx.moveTo(c, c);
        ctx.lineTo(c + Math.cos(heading) * r, c + Math.sin(heading) * r);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Cada contacto se enciende cuando el haz lo alcanza.
      for (const plot of plots) {
        const blip = blipRefs.current.get(plot.id);
        if (!blip) continue;
        const shown = visibleRef.current.has(plot.id);
        const behind = (bearing - plot.bearing + 360) % 360;
        const age = (behind / 360) * SWEEP_SECONDS;
        const light = reduced ? 1 : Math.exp(-age / AFTERGLOW_SECONDS);
        blip.style.opacity = shown ? String(0.3 + 0.7 * light) : '0';
        blip.style.pointerEvents = shown ? 'auto' : 'none';
        if (!shown) continue;
        // Eco: un anillo que se expande justo tras la detección.
        if (!reduced && age < 1.1) {
          const p = age / 1.1;
          const signal = byId.get(plot.id);
          ctx.strokeStyle = signal ? colorOf(signal) : '#27DCFF';
          ctx.globalAlpha = (1 - p) * 0.8;
          ctx.lineWidth = 2 * u;
          ctx.beginPath();
          ctx.arc(c + plot.x * r, c + plot.y * r, (10 + p * 34) * u, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        const crossed = lastBearing <= bearing ? plot.bearing > lastBearing && plot.bearing <= bearing : plot.bearing > lastBearing || plot.bearing <= bearing;
        if (!reduced && crossed) setContact({ id: plot.id, bearing: plot.bearing, range: plot.range });
      }
      lastBearing = bearing;
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
    // `colorOf` es estable: viene de una constante del módulo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plots, byId]);

  const active = activeId !== null ? plotOf.get(activeId) : undefined;
  const lastContact = contact ? byId.get(contact.id) : undefined;
  const shownCount = plots.filter((p) => visibleIds.has(p.id)).length;

  return (
    <div className="radar-scope">
      <div className="radar-scope-stage">
        <canvas ref={canvasRef} className="radar-scope-canvas" aria-hidden="true" />
        <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="radar-scope-svg select-none" role="group" aria-label="Radar de señales del Observatorio. Cada sector es un área; cuanto más cerca del centro, mayor impacto territorial.">
          {/* Retícula: anillos de alcance, sectores y marcas de rumbo. */}
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <circle key={f} cx={CENTER} cy={CENTER} r={RADIUS * f} fill="none" stroke="#9FE8FF" strokeOpacity={f === 1 ? 0.65 : 0.2} strokeWidth={f === 1 ? 2 : 1} />
          ))}
          {Array.from({ length: 72 }, (_, i) => {
            const major = i % 6 === 0;
            const a = polar(i * 5, 1);
            const b = polar(i * 5, major ? 1.035 : 1.018);
            return <line key={i} x1={toView(a.x)} y1={toView(a.y)} x2={toView(b.x)} y2={toView(b.y)} stroke="#9FE8FF" strokeOpacity={major ? 0.7 : 0.3} />;
          })}
          {sectors.map((sector) => {
            const edge = polar(sector.start, 1);
            const mid = (sector.start + sector.end) / 2;
            const at = polar(mid, 1.09);
            const anchor = at.x > 0.12 ? 'start' : at.x < -0.12 ? 'end' : 'middle';
            return (
              <g key={sector.area}>
                <line x1={CENTER} y1={CENTER} x2={toView(edge.x)} y2={toView(edge.y)} stroke="#9FE8FF" strokeOpacity="0.22" strokeDasharray="3 7" />
                <text x={toView(at.x)} y={toView(at.y)} textAnchor={anchor} dominantBaseline="middle" fontSize="19" fontWeight="600" fill={sector.color}>
                  {sector.area.length > 24 ? `${sector.area.slice(0, 23)}…` : sector.area}
                  <title>{sector.area}</title>
                </text>
              </g>
            );
          })}
          {[{ f: 0.25, t: 'Impacto alto' }, { f: 0.75, t: 'Impacto bajo' }].map(({ f, t }) => (
            <text key={t} x={CENTER + 6} y={CENTER - RADIUS * f - 6} fontSize="14" fill="#9FE8FF" fillOpacity="0.72">{t}</text>
          ))}

          {/* Enlaces de la señal fijada con sus relacionadas. */}
          {active && relatedIds.map((id) => {
            const other = plotOf.get(id);
            if (!other || !visibleIds.has(id)) return null;
            return <line key={id} x1={toView(active.x)} y1={toView(active.y)} x2={toView(other.x)} y2={toView(other.y)} stroke="#9FE8FF" strokeOpacity="0.45" strokeDasharray="5 5" />;
          })}

          {plots.map((plot) => {
            const signal = byId.get(plot.id);
            if (!signal) return null;
            const selected = plot.id === activeId;
            const size = 7 + (signal.adopcion / 100) * 9;
            const label = `${signal.nombre}. Área ${signal.area}, impacto ${signal.impacto}%, adopción ${signal.adopcion}%, prioridad ${signal.prioridad || 'sin definir'}`;
            return (
              <g
                key={plot.id}
                ref={(el) => {
                  if (el) blipRefs.current.set(plot.id, el);
                  else blipRefs.current.delete(plot.id);
                }}
                role="button"
                tabIndex={visibleIds.has(plot.id) ? 0 : -1}
                aria-label={label}
                aria-pressed={selected}
                className="cursor-pointer outline-none radar-blip"
                onClick={() => onSelect(signal)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(signal);
                  }
                }}
              >
                <title>{signal.nombre}</title>
                <circle cx={toView(plot.x)} cy={toView(plot.y)} r={size + 12} fill="transparent" />
                <circle cx={toView(plot.x)} cy={toView(plot.y)} r={size * 1.9} fill={colorOf(signal)} fillOpacity="0.22" />
                <circle cx={toView(plot.x)} cy={toView(plot.y)} r={size} fill={colorOf(signal)} stroke="#04222B" strokeWidth="1.5" />
              </g>
            );
          })}

          {/* Mira de la señal fijada: no se apaga con el barrido. */}
          {active && visibleIds.has(active.id) && (
            <g pointerEvents="none" stroke="#EFF6FF" strokeWidth="2.5" fill="none" transform={`translate(${toView(active.x)} ${toView(active.y)})`}>
              <path d="M-27 -13 V-27 H-13 M13 -27 H27 V-13 M27 13 V27 H13 M-13 27 H-27 V13" />
            </g>
          )}
          <circle cx={CENTER} cy={CENTER} r="5" fill="#9FE8FF" />
        </svg>
      </div>

      <div className="radar-scope-readout" aria-hidden="true">
        <span><b>{shownCount}</b> contactos en pantalla</span>
        {lastContact && contact ? (
          <span className="radar-scope-contact">
            Último contacto: <b>{lastContact.nombre}</b> · rumbo {String(Math.round(contact.bearing)).padStart(3, '0')}° · impacto {lastContact.impacto}%
          </span>
        ) : (
          <span className="radar-scope-contact">Barriendo…</span>
        )}
      </div>
    </div>
  );
};
