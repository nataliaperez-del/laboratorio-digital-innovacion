import React from 'react';

export interface BadgeGraphicProps {
  size?: number;
  className?: string;
  isUnlocked?: boolean;
}

// 5-Pointed Star Polygon generator
function getStarPoints(cx: number, cy: number, r: number): string {
  const points = [];
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.42;
    points.push(`${(cx + radius * Math.cos(angle)).toFixed(1)},${(cy + radius * Math.sin(angle)).toFixed(1)}`);
  }
  return points.join(' ');
}

// Scalloped Rosette polygon generator
function getRosettePoints(cx: number, cy: number, rOuter: number, rInner: number, teeth: number = 24): string {
  const points = [];
  for (let i = 0; i < teeth * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const angle = (i * Math.PI) / teeth - Math.PI / 2;
    points.push(`${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`);
  }
  return points.join(' ');
}

/**
 * 1. PIONERO TERRITORIAL / NIVEL 1
 * Referente: Rombo curvado con doble borde neón cian, 3 estrellas doradas,
 * texto "DIAGNÓSTICO", mapa isométrico plegado con pin de ubicación 3D,
 * cinta verde lima eléctrico con texto "PIONERO" y base con "TERRITORIAL" y laureles.
 */
export const PioneroTerritorialBadge: React.FC<BadgeGraphicProps> = ({ size = 96, className = '', isUnlocked = true }) => {
  const prefix = 'pio';
  const cyanBorder = isUnlocked ? `url(#${prefix}-cyan)` : `url(#${prefix}-l-cyan)`;
  const bgGrad = isUnlocked ? `url(#${prefix}-bg)` : `url(#${prefix}-l-bg)`;
  const bannerGrad = isUnlocked ? `url(#${prefix}-banner)` : `url(#${prefix}-l-banner)`;
  const goldGrad = isUnlocked ? `url(#${prefix}-gold)` : `url(#${prefix}-l-gold)`;
  const bannerText = isUnlocked ? '#041E1C' : '#1E293B';
  const subText = isUnlocked ? '#E0F7FA' : '#94A3B8';
  const accentText = isUnlocked ? '#7DF9FF' : '#64748B';

  return (
    <svg width={size} height={size} viewBox="0 0 140 140" className={className} style={{ overflow: 'visible' }}>
      <defs>
        {/* Unlocked Gradients */}
        <linearGradient id={`${prefix}-cyan`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00FFFF" />
          <stop offset="50%" stopColor="#00B4D8" />
          <stop offset="100%" stopColor="#0077B6" />
        </linearGradient>
        <radialGradient id={`${prefix}-bg`} cx="50%" cy="45%" r="65%">
          <stop offset="0%" stopColor="#0E334D" />
          <stop offset="60%" stopColor="#071E2F" />
          <stop offset="100%" stopColor="#020E18" />
        </radialGradient>
        <linearGradient id={`${prefix}-banner`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#76DD00" />
          <stop offset="25%" stopColor="#B4FF2B" />
          <stop offset="50%" stopColor="#8DF500" />
          <stop offset="85%" stopColor="#B4FF2B" />
          <stop offset="100%" stopColor="#5EBD00" />
        </linearGradient>
        <linearGradient id={`${prefix}-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF275" />
          <stop offset="50%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#D4A000" />
        </linearGradient>

        {/* Locked Gradients */}
        <linearGradient id={`${prefix}-l-cyan`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <radialGradient id={`${prefix}-l-bg`} cx="50%" cy="45%" r="65%">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </radialGradient>
        <linearGradient id={`${prefix}-l-banner`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="50%" stopColor="#64748B" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <linearGradient id={`${prefix}-l-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>
      </defs>

      {/* Sombra proyectada */}
      <g transform="translate(70,68) rotate(45) translate(-70,-68)">
        <rect x="30" y="28" width="80" height="80" rx="18" fill="#000000" opacity="0.5" />
      </g>

      {/* Rombo exterior cian neón */}
      <g transform="translate(70,68) rotate(45) translate(-70,-68)">
        <rect x="30" y="28" width="80" height="80" rx="18" fill={cyanBorder} />
        <rect x="33" y="31" width="74" height="74" rx="15" fill={bgGrad} stroke={isUnlocked ? '#00FFFF' : '#64748B'} strokeWidth="1.2" />
        <rect x="36" y="34" width="68" height="68" rx="12" fill="none" stroke={isUnlocked ? '#00E5FF' : '#475569'} strokeWidth="0.8" strokeDasharray="3 2" opacity="0.6" />
      </g>

      {/* 3 Estrellas Superiores */}
      <polygon points={getStarPoints(70, 21, 3.8)} fill={goldGrad} />
      <polygon points={getStarPoints(59, 24, 2.7)} fill={goldGrad} />
      <polygon points={getStarPoints(81, 24, 2.7)} fill={goldGrad} />

      {/* Texto DIAGNÓSTICO */}
      <text x="70" y="34" fill={accentText} fontSize="5.5" fontWeight="800" textAnchor="middle" letterSpacing="1.2" fontFamily="Arial, Helvetica, sans-serif">
        DIAGNÓSTICO
      </text>

      {/* Icono: Mapa Plegado Isométrico 3D + Pin */}
      <g transform="translate(0, -2)">
        {/* Cara izquierda del mapa */}
        <polygon points="46,47 58,43 58,54 46,58" fill={isUnlocked ? '#007799' : '#334155'} stroke={isUnlocked ? '#00E5FF' : '#64748B'} strokeWidth="0.8" />
        {/* Cara centro del mapa */}
        <polygon points="58,43 76,46 76,57 58,54" fill={isUnlocked ? '#008BA3' : '#475569'} stroke={isUnlocked ? '#00E5FF' : '#64748B'} strokeWidth="0.8" />
        {/* Cara derecha del mapa */}
        <polygon points="76,46 94,42 94,53 76,57" fill={isUnlocked ? '#00657C' : '#1E293B'} stroke={isUnlocked ? '#00E5FF' : '#64748B'} strokeWidth="0.8" />
        {/* Líneas topográficas/contornos en el mapa */}
        <path d="M 49,52 Q 54,49 58,51 Q 67,53 76,52 Q 85,50 91,48" fill="none" stroke={isUnlocked ? '#00FFCC' : '#94A3B8'} strokeWidth="0.9" opacity="0.85" />
        <path d="M 50,56 Q 56,53 58,54 Q 66,56 76,55" fill="none" stroke={isUnlocked ? '#76FF03' : '#64748B'} strokeWidth="0.7" opacity="0.7" />

        {/* Pin de ubicación 3D (Amarillo-Dorado con centro blanco) */}
        <circle cx="70" cy="41" r="4.2" fill={goldGrad} stroke={isUnlocked ? '#FF8F00' : '#475569'} strokeWidth="0.8" />
        <circle cx="70" cy="41" r="1.5" fill="#FFFFFF" />
        <polygon points="67.5,43 72.5,43 70,49" fill={goldGrad} />
      </g>

      {/* Cinta / Banner Verde Lima PIONERO */}
      <g>
        {/* Sombra de la cinta */}
        <rect x="13" y="61" width="114" height="23" rx="5.5" fill="#000000" opacity="0.5" />
        {/* Cuerpo de la cinta */}
        <rect x="13" y="59" width="114" height="23" rx="5.5" fill={bannerGrad} stroke={isUnlocked ? '#3B7E00' : '#1E293B'} strokeWidth="1.2" />
        {/* Filete interior */}
        <rect x="15" y="61" width="110" height="19" rx="4" fill="none" stroke="#FFFFFF" strokeWidth="0.7" opacity="0.45" />
        {/* Texto PIONERO */}
        <text x="70" y="75" fill={bannerText} fontSize="12" fontWeight="900" textAnchor="middle" letterSpacing="1.8" fontFamily="Arial Black, Impact, sans-serif">
          PIONERO
        </text>
      </g>

      {/* Texto TERRITORIAL */}
      <text x="70" y="93" fill={subText} fontSize="6.5" fontWeight="800" textAnchor="middle" letterSpacing="2" fontFamily="Arial, Helvetica, sans-serif">
        TERRITORIAL
      </text>

      {/* Laureles Inferiores */}
      <g>
        {/* Rama Izquierda */}
        <path d="M 53,99 Q 47,105 45,114" fill="none" stroke={isUnlocked ? '#00E5FF' : '#64748B'} strokeWidth="1.2" />
        <ellipse cx="47" cy="103" rx="2" ry="3.5" transform="rotate(-35 47 103)" fill={bannerGrad} />
        <ellipse cx="44" cy="109" rx="2" ry="3.5" transform="rotate(-60 44 109)" fill={bannerGrad} />
        <ellipse cx="51" cy="102" rx="1.6" ry="3" transform="rotate(20 51 102)" fill={bannerGrad} />
        <ellipse cx="48" cy="108" rx="1.6" ry="3" transform="rotate(15 48 108)" fill={bannerGrad} />

        {/* Rama Derecha */}
        <path d="M 87,99 Q 93,105 95,114" fill="none" stroke={isUnlocked ? '#00E5FF' : '#64748B'} strokeWidth="1.2" />
        <ellipse cx="93" cy="103" rx="2" ry="3.5" transform="rotate(35 93 103)" fill={bannerGrad} />
        <ellipse cx="96" cy="109" rx="2" ry="3.5" transform="rotate(60 96 109)" fill={bannerGrad} />
        <ellipse cx="89" cy="102" rx="1.6" ry="3" transform="rotate(-20 89 102)" fill={bannerGrad} />
        <ellipse cx="92" cy="108" rx="1.6" ry="3" transform="rotate(-15 92 108)" fill={bannerGrad} />

        {/* Estrella central inferior */}
        <polygon points={getStarPoints(70, 102, 3.2)} fill={goldGrad} />
      </g>
    </svg>
  );
};

/**
 * 2. VISIONARIO ESTRATÉGICO / NIVEL 3
 * Referente: Roseta dentada dorada/lima (24 picos), medallón circular azul petróleo,
 * 3 estrellas doradas, bombilla de ideas radiante con filamento,
 * texto "VISIONARIO" / "ESTRATÉGICO", laureles y subtítulo "IDEACIÓN · VOCACIÓN".
 */
export const VisionarioEstrategicoBadge: React.FC<BadgeGraphicProps> = ({ size = 96, className = '', isUnlocked = true }) => {
  const prefix = 'vis';
  const cyanBorder = isUnlocked ? `url(#${prefix}-cyan)` : `url(#${prefix}-l-cyan)`;
  const bgGrad = isUnlocked ? `url(#${prefix}-bg)` : `url(#${prefix}-l-bg)`;
  const goldGrad = isUnlocked ? `url(#${prefix}-gold)` : `url(#${prefix}-l-gold)`;
  const rosetteGrad = isUnlocked ? `url(#${prefix}-rosette)` : `url(#${prefix}-l-rosette)`;
  const subText = isUnlocked ? '#7DF9FF' : '#64748B';

  return (
    <svg width={size} height={size} viewBox="0 0 140 140" className={className} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`${prefix}-cyan`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00FFFF" />
          <stop offset="50%" stopColor="#00B4D8" />
          <stop offset="100%" stopColor="#0077B6" />
        </linearGradient>
        <linearGradient id={`${prefix}-rosette`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#B4FF2B" />
          <stop offset="35%" stopColor="#FFD700" />
          <stop offset="70%" stopColor="#8DF500" />
          <stop offset="100%" stopColor="#F5A623" />
        </linearGradient>
        <radialGradient id={`${prefix}-bg`} cx="50%" cy="45%" r="65%">
          <stop offset="0%" stopColor="#0E334D" />
          <stop offset="60%" stopColor="#071E2F" />
          <stop offset="100%" stopColor="#020E18" />
        </radialGradient>
        <linearGradient id={`${prefix}-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF275" />
          <stop offset="50%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#D4A000" />
        </linearGradient>

        {/* Locked */}
        <linearGradient id={`${prefix}-l-cyan`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <linearGradient id={`${prefix}-l-rosette`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#64748B" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <radialGradient id={`${prefix}-l-bg`} cx="50%" cy="45%" r="65%">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </radialGradient>
        <linearGradient id={`${prefix}-l-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>
      </defs>

      {/* Sombra de la roseta */}
      <polygon points={getRosettePoints(70, 71, 62, 53, 24)} fill="#000000" opacity="0.45" />

      {/* Roseta dentada exterior (24 picos dorados/lima) */}
      <polygon points={getRosettePoints(70, 68, 62, 53, 24)} fill={rosetteGrad} />

      {/* Medallón circular interior */}
      <circle cx="70" cy="68" r="50" fill={bgGrad} stroke={cyanBorder} strokeWidth="2.5" />
      <circle cx="70" cy="68" r="46" fill="none" stroke={isUnlocked ? '#00FFFF' : '#475569'} strokeWidth="1" strokeDasharray="3 2" opacity="0.75" />

      {/* 3 Estrellas Superiores */}
      <polygon points={getStarPoints(70, 29, 3.5)} fill={goldGrad} />
      <polygon points={getStarPoints(60, 32, 2.5)} fill={goldGrad} />
      <polygon points={getStarPoints(80, 32, 2.5)} fill={goldGrad} />

      {/* Bombilla de Ideas Radiante (Lightbulb) */}
      <g>
        {/* Rayos de luz radiantes */}
        <line x1="70" y1="36" x2="70" y2="39" stroke={isUnlocked ? '#FFF275' : '#64748B'} strokeWidth="1.2" strokeLinecap="round" />
        <line x1="59" y1="41" x2="62" y2="43" stroke={isUnlocked ? '#FFF275' : '#64748B'} strokeWidth="1.2" strokeLinecap="round" />
        <line x1="81" y1="41" x2="78" y2="43" stroke={isUnlocked ? '#FFF275' : '#64748B'} strokeWidth="1.2" strokeLinecap="round" />
        <line x1="55" y1="49" x2="58" y2="49" stroke={isUnlocked ? '#FFF275' : '#64748B'} strokeWidth="1.2" strokeLinecap="round" />
        <line x1="85" y1="49" x2="82" y2="49" stroke={isUnlocked ? '#FFF275' : '#64748B'} strokeWidth="1.2" strokeLinecap="round" />

        {/* Resplandor suave de la bombilla */}
        <circle cx="70" cy="48" r="8" fill={isUnlocked ? '#FFF9C4' : '#64748B'} opacity={isUnlocked ? '0.2' : '0.1'} />
        {/* Contorno cristal de bombilla */}
        <path d="M 64,48 C 64,44.7 66.7,42 70,42 C 73.3,42 76,44.7 76,48 C 76,50.5 74.5,52 73.5,53.5 L 73.5,55 L 66.5,55 L 66.5,53.5 C 65.5,52 64,50.5 64,48 Z" fill="none" stroke={goldGrad} strokeWidth="1.5" />
        {/* Filamento interior */}
        <path d="M 68,52 L 68,48 Q 70,46 72,48 L 72,52" fill="none" stroke={isUnlocked ? '#FFFFFF' : '#94A3B8'} strokeWidth="1" />
        {/* Casquillo roscado de la bombilla */}
        <line x1="67" y1="56.5" x2="73" y2="56.5" stroke={goldGrad} strokeWidth="1.2" />
        <line x1="68" y1="58.5" x2="72" y2="58.5" stroke={goldGrad} strokeWidth="1" />
      </g>

      {/* Laureles Laterales Izquierda y Derecha */}
      <g>
        {/* Izquierda */}
        <path d="M 40,46 Q 37,60 41,74" fill="none" stroke={isUnlocked ? '#B4FF2B' : '#64748B'} strokeWidth="1.2" />
        <ellipse cx="37" cy="51" rx="1.8" ry="3.5" transform="rotate(-30 37 51)" fill={rosetteGrad} />
        <ellipse cx="36" cy="59" rx="1.8" ry="3.5" transform="rotate(-15 36 59)" fill={rosetteGrad} />
        <ellipse cx="38" cy="67" rx="1.8" ry="3.5" transform="rotate(10 38 67)" fill={rosetteGrad} />
        <ellipse cx="43" cy="54" rx="1.5" ry="3" transform="rotate(25 43 54)" fill={rosetteGrad} />
        <ellipse cx="42" cy="62" rx="1.5" ry="3" transform="rotate(30 42 62)" fill={rosetteGrad} />

        {/* Derecha */}
        <path d="M 100,46 Q 103,60 99,74" fill="none" stroke={isUnlocked ? '#B4FF2B' : '#64748B'} strokeWidth="1.2" />
        <ellipse cx="103" cy="51" rx="1.8" ry="3.5" transform="rotate(30 103 51)" fill={rosetteGrad} />
        <ellipse cx="104" cy="59" rx="1.8" ry="3.5" transform="rotate(15 104 59)" fill={rosetteGrad} />
        <ellipse cx="102" cy="67" rx="1.8" ry="3.5" transform="rotate(-10 102 67)" fill={rosetteGrad} />
        <ellipse cx="97" cy="54" rx="1.5" ry="3" transform="rotate(-25 97 54)" fill={rosetteGrad} />
        <ellipse cx="98" cy="62" rx="1.5" ry="3" transform="rotate(-30 98 62)" fill={rosetteGrad} />
      </g>

      {/* Textos Centrales */}
      <text x="70" y="69" fill="#FFFFFF" fontSize="8.5" fontWeight="900" textAnchor="middle" letterSpacing="1.2" fontFamily="Arial Black, Impact, sans-serif">
        VISIONARIO
      </text>
      <text x="70" y="80" fill="#FFFFFF" fontSize="8.5" fontWeight="900" textAnchor="middle" letterSpacing="1.2" fontFamily="Arial Black, Impact, sans-serif">
        ESTRATÉGICO
      </text>

      {/* Subtítulo Inferior: IDEACIÓN · VOCACIÓN */}
      <g>
        <line x1="42" y1="88" x2="52" y2="88" stroke={subText} strokeWidth="0.8" opacity="0.6" />
        <text x="70" y="90" fill={subText} fontSize="5.5" fontWeight="800" textAnchor="middle" letterSpacing="1.5" fontFamily="Arial, Helvetica, sans-serif">
          IDEACIÓN · VOCACIÓN
        </text>
        <line x1="88" y1="88" x2="98" y2="88" stroke={subText} strokeWidth="0.8" opacity="0.6" />
      </g>
    </svg>
  );
};

/**
 * 3. ARQUITECTO DE TENDENCIAS / NIVEL 4
 * Referente: Medalla circular perfecta biselada con borde exterior cian neón,
 * gráfico de barras ascendente con flecha diagonal hacia el futuro,
 * laureles laterales, texto "ARQUITECTO DE", gran cinta curvada verde lima
 * "TENDENCIAS" con colas de golondrina salientes y 3 estrellas doradas en la base.
 */
export const ArquitectoTendenciasBadge: React.FC<BadgeGraphicProps> = ({ size = 96, className = '', isUnlocked = true }) => {
  const prefix = 'arq';
  const cyanBorder = isUnlocked ? `url(#${prefix}-cyan)` : `url(#${prefix}-l-cyan)`;
  const bgGrad = isUnlocked ? `url(#${prefix}-bg)` : `url(#${prefix}-l-bg)`;
  const bannerGrad = isUnlocked ? `url(#${prefix}-banner)` : `url(#${prefix}-l-banner)`;
  const goldGrad = isUnlocked ? `url(#${prefix}-gold)` : `url(#${prefix}-l-gold)`;
  const bannerText = isUnlocked ? '#041E1C' : '#1E293B';

  return (
    <svg width={size} height={size} viewBox="0 0 140 140" className={className} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`${prefix}-cyan`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00FFFF" />
          <stop offset="50%" stopColor="#00B4D8" />
          <stop offset="100%" stopColor="#0077B6" />
        </linearGradient>
        <radialGradient id={`${prefix}-bg`} cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#0E334D" />
          <stop offset="60%" stopColor="#071E2F" />
          <stop offset="100%" stopColor="#020E18" />
        </radialGradient>
        <linearGradient id={`${prefix}-banner`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#76DD00" />
          <stop offset="25%" stopColor="#B4FF2B" />
          <stop offset="50%" stopColor="#8DF500" />
          <stop offset="85%" stopColor="#B4FF2B" />
          <stop offset="100%" stopColor="#5EBD00" />
        </linearGradient>
        <linearGradient id={`${prefix}-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF275" />
          <stop offset="50%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#D4A000" />
        </linearGradient>

        {/* Locked */}
        <linearGradient id={`${prefix}-l-cyan`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <radialGradient id={`${prefix}-l-bg`} cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </radialGradient>
        <linearGradient id={`${prefix}-l-banner`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="50%" stopColor="#64748B" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <linearGradient id={`${prefix}-l-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>
      </defs>

      {/* Sombra de la medalla */}
      <circle cx="70" cy="65" r="52" fill="#000000" opacity="0.45" />

      {/* Disco y marco circular exterior neón */}
      <circle cx="70" cy="62" r="52" fill={cyanBorder} />
      <circle cx="70" cy="62" r="48" fill={bgGrad} stroke={isUnlocked ? '#00FFFF' : '#64748B'} strokeWidth="1.5" />
      <circle cx="70" cy="62" r="44" fill="none" stroke={isUnlocked ? '#00E5FF' : '#475569'} strokeWidth="0.8" opacity="0.6" />

      {/* Laureles decorativos en los bordes de la medalla */}
      <g>
        <path d="M 32,48 Q 28,62 33,76" fill="none" stroke={isUnlocked ? '#B4FF2B' : '#64748B'} strokeWidth="1.2" />
        <ellipse cx="28" cy="55" rx="1.8" ry="3.5" transform="rotate(-30 28 55)" fill={bannerGrad} />
        <ellipse cx="29" cy="65" rx="1.8" ry="3.5" transform="rotate(-10 29 65)" fill={bannerGrad} />
        <ellipse cx="34" cy="58" rx="1.5" ry="3" transform="rotate(25 34 58)" fill={bannerGrad} />

        <path d="M 108,48 Q 112,62 107,76" fill="none" stroke={isUnlocked ? '#B4FF2B' : '#64748B'} strokeWidth="1.2" />
        <ellipse cx="112" cy="55" rx="1.8" ry="3.5" transform="rotate(30 112 55)" fill={bannerGrad} />
        <ellipse cx="111" cy="65" rx="1.8" ry="3.5" transform="rotate(10 111 65)" fill={bannerGrad} />
        <ellipse cx="106" cy="58" rx="1.5" ry="3" transform="rotate(-25 106 58)" fill={bannerGrad} />
      </g>

      {/* Icono: Gráfico de Barras Creciente + Flecha Ascendente */}
      <g transform="translate(0, -2)">
        {/* 3 Barras Ascendentes */}
        <rect x="52" y="47" width="7" height="15" rx="1.5" fill={isUnlocked ? '#0099CC' : '#334155'} stroke={isUnlocked ? '#00FFFF' : '#64748B'} strokeWidth="0.8" />
        <rect x="62" y="41" width="7" height="21" rx="1.5" fill={isUnlocked ? '#00B4D8' : '#475569'} stroke={isUnlocked ? '#00FFFF' : '#64748B'} strokeWidth="0.8" />
        <rect x="72" y="34" width="7" height="28" rx="1.5" fill={isUnlocked ? '#00E5FF' : '#64748B'} stroke={isUnlocked ? '#00FFFF' : '#94A3B8'} strokeWidth="0.8" />

        {/* Flecha Dinámica Ascendente (Azul Cian Neón) */}
        <path d="M 47,53 Q 62,45 80,31" fill="none" stroke={isUnlocked ? '#00FFFF' : '#94A3B8'} strokeWidth="3" strokeLinecap="round" />
        <polygon points="76,28 85,28 83,37" fill={isUnlocked ? '#00FFFF' : '#94A3B8'} />
      </g>

      {/* Texto Superior: ARQUITECTO DE */}
      <text x="70" y="69" fill="#FFFFFF" fontSize="6.8" fontWeight="800" textAnchor="middle" letterSpacing="1.5" fontFamily="Arial, Helvetica, sans-serif">
        ARQUITECTO DE
      </text>

      {/* Cinta Plegada Saliente con Colas de Golondrina */}
      <g>
        {/* Colas de golondrina traseras */}
        {/* Izquierda */}
        <polygon points="6,93 25,81 25,97 6,105 13,99" fill={isUnlocked ? '#4C9A00' : '#1E293B'} stroke={isUnlocked ? '#2D5E00' : '#0F172A'} strokeWidth="0.8" />
        {/* Derecha */}
        <polygon points="134,93 115,81 115,97 134,105 127,99" fill={isUnlocked ? '#4C9A00' : '#1E293B'} stroke={isUnlocked ? '#2D5E00' : '#0F172A'} strokeWidth="0.8" />

        {/* Dobleces 3D de sombra bajo la cinta frontal */}
        <polygon points="22,96 25,81 30,96" fill="#1B4000" />
        <polygon points="118,96 115,81 110,96" fill="#1B4000" />

        {/* Cuerpo curvado frontal de la cinta */}
        <path
          d="M 18,85 Q 70,76 122,85 L 120,105 Q 70,96 20,105 Z"
          fill={bannerGrad}
          stroke={isUnlocked ? '#3B7E00' : '#334155'}
          strokeWidth="1.2"
        />
        {/* Filete interior */}
        <path
          d="M 22,87 Q 70,79 118,87 L 116,102 Q 70,94 24,102 Z"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="0.7"
          opacity="0.45"
        />

        {/* Texto en cinta: TENDENCIAS */}
        <text x="70" y="99" fill={bannerText} fontSize="11" fontWeight="900" textAnchor="middle" letterSpacing="1.8" fontFamily="Arial Black, Impact, sans-serif">
          TENDENCIAS
        </text>
      </g>

      {/* 3 Estrellas Doradas en la Base */}
      <polygon points={getStarPoints(70, 114, 3.8)} fill={goldGrad} />
      <polygon points={getStarPoints(57, 113, 2.8)} fill={goldGrad} />
      <polygon points={getStarPoints(83, 113, 2.8)} fill={goldGrad} />
    </svg>
  );
};

/**
 * 4. INGENIERO DE PROTOTIPOS / NIVEL 2
 * Referente: Hexágono vertical biselado con borde cian neón,
 * cintas colgantes con corte en V en la base, cohete espacial despegando
 * en ángulo con estela de fuego, texto "INGENIERO DE", cinta angular
 * "PROTOTIPOS", subtítulo "SOLUCIÓN TRL" y engranaje dorado.
 */
export const IngenieroPrototiposBadge: React.FC<BadgeGraphicProps> = ({ size = 96, className = '', isUnlocked = true }) => {
  const prefix = 'ing';
  const cyanBorder = isUnlocked ? `url(#${prefix}-cyan)` : `url(#${prefix}-l-cyan)`;
  const bgGrad = isUnlocked ? `url(#${prefix}-bg)` : `url(#${prefix}-l-bg)`;
  const bannerGrad = isUnlocked ? `url(#${prefix}-banner)` : `url(#${prefix}-l-banner)`;
  const goldGrad = isUnlocked ? `url(#${prefix}-gold)` : `url(#${prefix}-l-gold)`;
  const bannerText = isUnlocked ? '#041E1C' : '#1E293B';
  const subText = isUnlocked ? '#7DF9FF' : '#64748B';

  return (
    <svg width={size} height={size} viewBox="0 0 140 140" className={className} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`${prefix}-cyan`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00FFFF" />
          <stop offset="50%" stopColor="#00B4D8" />
          <stop offset="100%" stopColor="#0077B6" />
        </linearGradient>
        <radialGradient id={`${prefix}-bg`} cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#0E334D" />
          <stop offset="60%" stopColor="#071E2F" />
          <stop offset="100%" stopColor="#020E18" />
        </radialGradient>
        <linearGradient id={`${prefix}-banner`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#76DD00" />
          <stop offset="25%" stopColor="#B4FF2B" />
          <stop offset="50%" stopColor="#8DF500" />
          <stop offset="85%" stopColor="#B4FF2B" />
          <stop offset="100%" stopColor="#5EBD00" />
        </linearGradient>
        <linearGradient id={`${prefix}-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF275" />
          <stop offset="50%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#D4A000" />
        </linearGradient>

        {/* Locked */}
        <linearGradient id={`${prefix}-l-cyan`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <radialGradient id={`${prefix}-l-bg`} cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </radialGradient>
        <linearGradient id={`${prefix}-l-banner`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="50%" stopColor="#64748B" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <linearGradient id={`${prefix}-l-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>
      </defs>

      {/* Cintas colgantes inferiores (Swallowtail ribbons) */}
      <g>
        <polygon points="56,90 56,128 64,121 72,128 72,90" fill={isUnlocked ? '#00657C' : '#334155'} opacity="0.6" />
        {/* Cinta colgante izquierda */}
        <polygon points="50,92 50,132 60,123 60,92" fill={isUnlocked ? '#007799' : '#1E293B'} stroke={isUnlocked ? '#00FFFF' : '#475569'} strokeWidth="1" />
        {/* Cinta colgante derecha */}
        <polygon points="80,92 80,132 90,123 90,92" fill={isUnlocked ? '#007799' : '#1E293B'} stroke={isUnlocked ? '#00FFFF' : '#475569'} strokeWidth="1" />
      </g>

      {/* Sombra del Hexágono */}
      <polygon points="70,16 118,41 118,97 70,122 22,97 22,41" fill="#000000" opacity="0.5" />

      {/* Hexágono Principal Biselado */}
      <polygon points="70,14 118,39 118,95 70,120 22,95 22,39" fill={cyanBorder} />
      <polygon points="70,18 114,41 114,92 70,116 26,92 26,41" fill={bgGrad} stroke={isUnlocked ? '#00FFFF' : '#64748B'} strokeWidth="1.2" />
      <polygon points="70,22 110,43 110,89 70,112 30,89 30,43" fill="none" stroke={isUnlocked ? '#00E5FF' : '#475569'} strokeWidth="0.8" opacity="0.6" />

      {/* Cohete Espacial Despegando (Rocket) */}
      <g transform="translate(0, 2)">
        {/* Estela de propulsión / Llamas */}
        <path d="M 54,58 Q 50,65 46,70 Q 52,67 56,64 Z" fill={isUnlocked ? '#FF5722' : '#64748B'} />
        <path d="M 56,57 Q 53,63 50,66 Q 54,64 57,61 Z" fill={isUnlocked ? '#FFD600' : '#94A3B8'} />
        {/* Estelas de humo/luz cian */}
        <path d="M 44,72 Q 40,78 36,82" fill="none" stroke={isUnlocked ? '#00FFFF' : '#64748B'} strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
        <path d="M 49,74 Q 46,80 44,85" fill="none" stroke={isUnlocked ? '#00E5FF' : '#475569'} strokeWidth="1" strokeLinecap="round" opacity="0.6" />

        {/* Fuselaje del Cohete rotado aprox 45° */}
        <g transform="translate(70,44) rotate(-40) translate(-70,-44)">
          {/* Aleta izquierda */}
          <polygon points="63,44 57,51 63,49" fill={isUnlocked ? '#8DF500' : '#475569'} />
          {/* Aleta derecha */}
          <polygon points="77,44 83,51 77,49" fill={isUnlocked ? '#8DF500' : '#475569'} />
          {/* Cuerpo principal */}
          <path d="M 70,28 Q 76,35 75,48 L 65,48 Q 64,35 70,28 Z" fill={isUnlocked ? '#FFFFFF' : '#CBD5E1'} stroke={isUnlocked ? '#00FFFF' : '#64748B'} strokeWidth="1" />
          {/* Ventana ojo de buey */}
          <circle cx="70" cy="38" r="3" fill={isUnlocked ? '#00BCD4' : '#334155'} stroke={isUnlocked ? '#00E5FF' : '#64748B'} strokeWidth="0.8" />
          {/* Cono superior */}
          <polygon points="70,28 67,34 73,34" fill={isUnlocked ? '#FF3D00' : '#475569'} />
        </g>
      </g>

      {/* Texto Superior: INGENIERO DE */}
      <text x="70" y="66" fill="#FFFFFF" fontSize="6.5" fontWeight="800" textAnchor="middle" letterSpacing="1.2" fontFamily="Arial, Helvetica, sans-serif">
        INGENIERO DE
      </text>

      {/* Cinta Angular PROTOTIPOS */}
      <g>
        {/* Sombra de cinta */}
        <rect x="12" y="72" width="116" height="22" rx="4" fill="#000000" opacity="0.45" />
        {/* Cuerpo de cinta */}
        <rect x="12" y="70" width="116" height="22" rx="4" fill={bannerGrad} stroke={isUnlocked ? '#3B7E00' : '#334155'} strokeWidth="1.2" />
        <rect x="14" y="72" width="112" height="18" rx="2.5" fill="none" stroke="#FFFFFF" strokeWidth="0.7" opacity="0.45" />

        <text x="70" y="85" fill={bannerText} fontSize="11" fontWeight="900" textAnchor="middle" letterSpacing="1.2" fontFamily="Arial Black, Impact, sans-serif">
          PROTOTIPOS
        </text>
      </g>

      {/* Subtítulo: SOLUCIÓN TRL */}
      <text x="70" y="99" fill={subText} fontSize="6" fontWeight="800" textAnchor="middle" letterSpacing="1.8" fontFamily="Arial, Helvetica, sans-serif">
        SOLUCIÓN TRL
      </text>

      {/* Engranaje Mecánico Dorado Inferior (Cogwheel) */}
      <g transform="translate(70, 109)">
        {/* Dientes del engranaje */}
        <circle cx="0" cy="0" r="4.5" fill={goldGrad} />
        <circle cx="0" cy="0" r="2" fill={isUnlocked ? '#071E2F' : '#0F172A'} />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <rect key={i} x="-1" y="-5.8" width="2" height="2" transform={`rotate(${angle})`} fill={goldGrad} rx="0.4" />
        ))}
      </g>
    </svg>
  );
};

/**
 * 5. CUSTODIO DEL CONOCIMIENTO / BANCO UNIFICADO
 * Referente: Escudo con arco de bóveda clásico superior y base en punta redondeada,
 * 3 estrellas doradas, templo griego / biblioteca clásica con libro abierto radiante,
 * texto "CUSTODIO DEL CONOCIMIENTO", pastilla verde lima "BANCO UNIFICADO"
 * y pila de cilindros de base de datos con ramas de laurel.
 */
export const CustodioConocimientoBadge: React.FC<BadgeGraphicProps> = ({ size = 96, className = '', isUnlocked = true }) => {
  const prefix = 'cus';
  const cyanBorder = isUnlocked ? `url(#${prefix}-cyan)` : `url(#${prefix}-l-cyan)`;
  const bgGrad = isUnlocked ? `url(#${prefix}-bg)` : `url(#${prefix}-l-bg)`;
  const bannerGrad = isUnlocked ? `url(#${prefix}-banner)` : `url(#${prefix}-l-banner)`;
  const goldGrad = isUnlocked ? `url(#${prefix}-gold)` : `url(#${prefix}-l-gold)`;
  const bannerText = isUnlocked ? '#041E1C' : '#1E293B';

  return (
    <svg width={size} height={size} viewBox="0 0 140 140" className={className} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`${prefix}-cyan`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00FFFF" />
          <stop offset="50%" stopColor="#00B4D8" />
          <stop offset="100%" stopColor="#0077B6" />
        </linearGradient>
        <radialGradient id={`${prefix}-bg`} cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#0E334D" />
          <stop offset="60%" stopColor="#071E2F" />
          <stop offset="100%" stopColor="#020E18" />
        </radialGradient>
        <linearGradient id={`${prefix}-banner`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#76DD00" />
          <stop offset="25%" stopColor="#B4FF2B" />
          <stop offset="50%" stopColor="#8DF500" />
          <stop offset="85%" stopColor="#B4FF2B" />
          <stop offset="100%" stopColor="#5EBD00" />
        </linearGradient>
        <linearGradient id={`${prefix}-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF275" />
          <stop offset="50%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#D4A000" />
        </linearGradient>

        {/* Locked */}
        <linearGradient id={`${prefix}-l-cyan`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <radialGradient id={`${prefix}-l-bg`} cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </radialGradient>
        <linearGradient id={`${prefix}-l-banner`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="50%" stopColor="#64748B" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <linearGradient id={`${prefix}-l-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>
      </defs>

      {/* Sombra del escudo abovedado */}
      <path
        d="M 28,52 A 42,42 0 0,1 112,52 L 112,98 Q 112,125 70,135 Q 28,125 28,98 Z"
        fill="#000000"
        opacity="0.5"
      />

      {/* Escudo con Bóveda Clásica */}
      <path
        d="M 28,50 A 42,42 0 0,1 112,50 L 112,96 Q 112,123 70,133 Q 28,123 28,96 Z"
        fill={cyanBorder}
      />
      <path
        d="M 31,52 A 39,39 0 0,1 109,52 L 109,94 Q 109,119 70,129 Q 31,119 31,94 Z"
        fill={bgGrad}
        stroke={isUnlocked ? '#00FFFF' : '#64748B'}
        strokeWidth="1.2"
      />
      <path
        d="M 35,54 A 35,35 0 0,1 105,54 L 105,92 Q 105,115 70,124 Q 35,115 35,92 Z"
        fill="none"
        stroke={isUnlocked ? '#00E5FF' : '#475569'}
        strokeWidth="0.8"
        strokeDasharray="3 2"
        opacity="0.6"
      />

      {/* 3 Estrellas Superiores */}
      <polygon points={getStarPoints(70, 23, 3.2)} fill={goldGrad} />
      <polygon points={getStarPoints(59, 25, 2.5)} fill={goldGrad} />
      <polygon points={getStarPoints(81, 25, 2.5)} fill={goldGrad} />

      {/* Templo Griego de la Sabiduría / Partenón + Libro Abierto */}
      <g transform="translate(0, -3)">
        {/* Frontón triangular (Techo) */}
        <polygon points="70,30 50,38 90,38" fill={isUnlocked ? '#00BCD4' : '#334155'} stroke={isUnlocked ? '#00FFFF' : '#64748B'} strokeWidth="1" />
        {/* Friso horizontal */}
        <rect x="51" y="38" width="38" height="2.5" fill={isUnlocked ? '#00E5FF' : '#475569'} />
        {/* Columnas clásicas */}
        <rect x="53" y="41" width="3" height="13" rx="0.5" fill={isUnlocked ? '#00E5FF' : '#64748B'} />
        <rect x="63" y="41" width="3" height="13" rx="0.5" fill={isUnlocked ? '#00E5FF' : '#64748B'} />
        <rect x="74" y="41" width="3" height="13" rx="0.5" fill={isUnlocked ? '#00E5FF' : '#64748B'} />
        <rect x="84" y="41" width="3" height="13" rx="0.5" fill={isUnlocked ? '#00E5FF' : '#64748B'} />
        {/* Base del templo */}
        <rect x="50" y="54" width="40" height="2.5" rx="0.5" fill={isUnlocked ? '#00E5FF' : '#475569'} />

        {/* Libro Abierto Radiante entre las columnas */}
        <g transform="translate(70, 48)">
          <path d="M 0,-1 C -3,-3 -7,-3 -9,-1 L -9,5 C -7,3 -3,3 0,4 C 3,3 7,3 9,5 L 9,-1 C 7,-3 3,-3 0,-1 Z" fill={isUnlocked ? '#FFFFFF' : '#CBD5E1'} stroke={isUnlocked ? '#00FFFF' : '#64748B'} strokeWidth="0.7" />
          <line x1="0" y1="-1" x2="0" y2="4" stroke={isUnlocked ? '#007799' : '#334155'} strokeWidth="0.8" />
        </g>
      </g>

      {/* Texto Central */}
      <text x="70" y="65" fill="#FFFFFF" fontSize="7.5" fontWeight="900" textAnchor="middle" letterSpacing="1.2" fontFamily="Arial Black, Impact, sans-serif">
        CUSTODIO DEL
      </text>
      <text x="70" y="74" fill="#FFFFFF" fontSize="7.5" fontWeight="900" textAnchor="middle" letterSpacing="1.2" fontFamily="Arial Black, Impact, sans-serif">
        CONOCIMIENTO
      </text>

      {/* Pastilla Verde Lima BANCO UNIFICADO */}
      <g>
        <rect x="26" y="80" width="88" height="17" rx="8.5" fill={bannerGrad} stroke={isUnlocked ? '#3B7E00' : '#334155'} strokeWidth="1.2" />
        <rect x="28" y="82" width="84" height="13" rx="6.5" fill="none" stroke="#FFFFFF" strokeWidth="0.7" opacity="0.45" />
        <text x="70" y="92" fill={bannerText} fontSize="7.2" fontWeight="900" textAnchor="middle" letterSpacing="1.2" fontFamily="Arial Black, Impact, sans-serif">
          BANCO UNIFICADO
        </text>
      </g>

      {/* Base de Datos (Discos / Cilindro) y Laureles */}
      <g>
        {/* Laureles a los lados */}
        <path d="M 44,103 Q 40,111 44,120" fill="none" stroke={isUnlocked ? '#B4FF2B' : '#64748B'} strokeWidth="1" />
        <ellipse cx="40" cy="107" rx="1.5" ry="3" transform="rotate(-30 40 107)" fill={bannerGrad} />
        <ellipse cx="41" cy="115" rx="1.5" ry="3" transform="rotate(-50 41 115)" fill={bannerGrad} />

        <path d="M 96,103 Q 100,111 96,120" fill="none" stroke={isUnlocked ? '#B4FF2B' : '#64748B'} strokeWidth="1" />
        <ellipse cx="100" cy="107" rx="1.5" ry="3" transform="rotate(30 100 107)" fill={bannerGrad} />
        <ellipse cx="99" cy="115" rx="1.5" ry="3" transform="rotate(50 99 115)" fill={bannerGrad} />

        {/* Cilindros de Base de Datos */}
        <g transform="translate(0, 1)">
          {/* Cilindro 1 (Arriba) */}
          <ellipse cx="70" cy="103" rx="10" ry="3" fill={isUnlocked ? '#00E5FF' : '#64748B'} stroke={isUnlocked ? '#00FFFF' : '#94A3B8'} strokeWidth="0.8" />
          {/* Cilindro 2 (Centro) */}
          <path d="M 60,105 C 60,107 64,109 70,109 C 76,109 80,107 80,105 L 80,109 C 80,111 76,113 70,113 C 64,113 60,111 60,109 Z" fill={isUnlocked ? '#00B4D8' : '#475569'} stroke={isUnlocked ? '#00FFFF' : '#94A3B8'} strokeWidth="0.8" />
          {/* Cilindro 3 (Abajo) */}
          <path d="M 60,110 C 60,112 64,114 70,114 C 76,114 80,112 80,110 L 80,114 C 80,116 76,118 70,118 C 64,118 60,116 60,114 Z" fill={isUnlocked ? '#0077B6' : '#334155'} stroke={isUnlocked ? '#00FFFF' : '#94A3B8'} strokeWidth="0.8" />
        </g>
      </g>
    </svg>
  );
};

/**
 * 6. VÍNCULO COGNITIVO / ZOE 3D AVATAR
 * Referente: Medalla circular con borde cian neón, 3 estrellas doradas,
 * avatar holográfico de Zoe (perrito schnauzer / terrier digital amigable con cejas,
 * orejitas, cuello con collar 'Z' y anillos orbitales cian), texto "VÍNCULO COGNITIVO",
 * cinta verde lima "ZOE 3D AVATAR" y chip microprocesador / circuito de IA en la base.
 */
export const VinculoCognitivoBadge: React.FC<BadgeGraphicProps> = ({ size = 96, className = '', isUnlocked = true }) => {
  const prefix = 'vin';
  const cyanBorder = isUnlocked ? `url(#${prefix}-cyan)` : `url(#${prefix}-l-cyan)`;
  const bgGrad = isUnlocked ? `url(#${prefix}-bg)` : `url(#${prefix}-l-bg)`;
  const bannerGrad = isUnlocked ? `url(#${prefix}-banner)` : `url(#${prefix}-l-banner)`;
  const goldGrad = isUnlocked ? `url(#${prefix}-gold)` : `url(#${prefix}-l-gold)`;
  const bannerText = isUnlocked ? '#041E1C' : '#1E293B';

  return (
    <svg width={size} height={size} viewBox="0 0 140 140" className={className} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`${prefix}-cyan`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00FFFF" />
          <stop offset="50%" stopColor="#00B4D8" />
          <stop offset="100%" stopColor="#0077B6" />
        </linearGradient>
        <radialGradient id={`${prefix}-bg`} cx="50%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#0E334D" />
          <stop offset="60%" stopColor="#071E2F" />
          <stop offset="100%" stopColor="#020E18" />
        </radialGradient>
        <linearGradient id={`${prefix}-banner`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#76DD00" />
          <stop offset="25%" stopColor="#B4FF2B" />
          <stop offset="50%" stopColor="#8DF500" />
          <stop offset="85%" stopColor="#B4FF2B" />
          <stop offset="100%" stopColor="#5EBD00" />
        </linearGradient>
        <linearGradient id={`${prefix}-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF275" />
          <stop offset="50%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#D4A000" />
        </linearGradient>

        {/* Locked */}
        <linearGradient id={`${prefix}-l-cyan`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <radialGradient id={`${prefix}-l-bg`} cx="50%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </radialGradient>
        <linearGradient id={`${prefix}-l-banner`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="50%" stopColor="#64748B" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <linearGradient id={`${prefix}-l-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>
      </defs>

      {/* Sombra de la medalla */}
      <circle cx="70" cy="65" r="53" fill="#000000" opacity="0.45" />

      {/* Medalla Circular Neón */}
      <circle cx="70" cy="62" r="53" fill={cyanBorder} />
      <circle cx="70" cy="62" r="49" fill={bgGrad} stroke={isUnlocked ? '#00FFFF' : '#64748B'} strokeWidth="1.5" />
      <circle cx="70" cy="62" r="45" fill="none" stroke={isUnlocked ? '#00E5FF' : '#475569'} strokeWidth="0.8" opacity="0.6" />

      {/* 3 Estrellas Superiores */}
      <polygon points={getStarPoints(70, 22, 3.5)} fill={goldGrad} />
      <polygon points={getStarPoints(59, 25, 2.5)} fill={goldGrad} />
      <polygon points={getStarPoints(81, 25, 2.5)} fill={goldGrad} />

      {/* Avatar Holográfico de Zoe (Perrito Schnauzer Tecnológico) */}
      <g transform="translate(0, -3)">
        {/* Anillo orbital holográfico cian que rodea a Zoe */}
        <ellipse cx="70" cy="48" rx="26" ry="7" fill="none" stroke={isUnlocked ? '#00FFFF' : '#64748B'} strokeWidth="1.2" opacity="0.8" strokeDasharray="6 2" />

        {/* Orejas caídas características */}
        <path d="M 58,40 C 53,35 48,43 51,52 C 53,53 58,48 58,40 Z" fill={isUnlocked ? '#607D8B' : '#334155'} stroke={isUnlocked ? '#00E5FF' : '#64748B'} strokeWidth="0.8" />
        <path d="M 82,40 C 87,35 92,43 89,52 C 87,53 82,48 82,40 Z" fill={isUnlocked ? '#607D8B' : '#334155'} stroke={isUnlocked ? '#00E5FF' : '#64748B'} strokeWidth="0.8" />

        {/* Cabeza de Zoe */}
        <ellipse cx="70" cy="45" rx="14" ry="12" fill={isUnlocked ? '#B0BEC5' : '#475569'} stroke={isUnlocked ? '#00FFFF' : '#64748B'} strokeWidth="1" />

        {/* Cejas pobladas tupidas (Schnauzer eyebrows) */}
        <polygon points="62,39 67,36 67,41" fill={isUnlocked ? '#ECEFF1' : '#94A3B8'} />
        <polygon points="78,39 73,36 73,41" fill={isUnlocked ? '#ECEFF1' : '#94A3B8'} />

        {/* Ojos expresivos brillantes */}
        <circle cx="65" cy="42" r="2.2" fill="#0B192C" />
        <circle cx="64.5" cy="41.5" r="0.8" fill="#FFFFFF" />
        <circle cx="75" cy="42" r="2.2" fill="#0B192C" />
        <circle cx="74.5" cy="41.5" r="0.8" fill="#FFFFFF" />

        {/* Barba y hocico frondoso blanco/holográfico */}
        <path d="M 64,46 C 60,49 59,57 70,58 C 81,57 80,49 76,46 C 73,46 67,46 64,46 Z" fill={isUnlocked ? '#FFFFFF' : '#CBD5E1'} stroke={isUnlocked ? '#00E5FF' : '#64748B'} strokeWidth="0.8" />
        {/* Naricita negra */}
        <ellipse cx="70" cy="47" rx="2" ry="1.4" fill="#0F172A" />

        {/* Cuello y collar tecnológico con dije 'Z' */}
        <rect x="63" y="58" width="14" height="3" rx="1" fill={isUnlocked ? '#00E5FF' : '#334155'} />
        <circle cx="70" cy="62" r="2.5" fill={goldGrad} />
        <text x="70" y="63.5" fill="#0B192C" fontSize="3" fontWeight="900" textAnchor="middle" fontFamily="Arial Black">Z</text>
      </g>

      {/* Laureles Laterales */}
      <g>
        <path d="M 33,54 Q 30,66 35,78" fill="none" stroke={isUnlocked ? '#B4FF2B' : '#64748B'} strokeWidth="1" />
        <ellipse cx="30" cy="60" rx="1.5" ry="3" transform="rotate(-30 30 60)" fill={bannerGrad} />
        <ellipse cx="32" cy="70" rx="1.5" ry="3" transform="rotate(-10 32 70)" fill={bannerGrad} />

        <path d="M 107,54 Q 110,66 105,78" fill="none" stroke={isUnlocked ? '#B4FF2B' : '#64748B'} strokeWidth="1" />
        <ellipse cx="110" cy="60" rx="1.5" ry="3" transform="rotate(30 110 60)" fill={bannerGrad} />
        <ellipse cx="108" cy="70" rx="1.5" ry="3" transform="rotate(10 108 70)" fill={bannerGrad} />
      </g>

      {/* Textos Centrales */}
      <text x="70" y="72" fill="#FFFFFF" fontSize="8" fontWeight="900" textAnchor="middle" letterSpacing="1.2" fontFamily="Arial Black, Impact, sans-serif">
        VÍNCULO
      </text>
      <text x="70" y="81" fill="#FFFFFF" fontSize="8" fontWeight="900" textAnchor="middle" letterSpacing="1.2" fontFamily="Arial Black, Impact, sans-serif">
        COGNITIVO
      </text>

      {/* Cinta Verde Lima ZOE 3D AVATAR */}
      <g>
        {/* Colas de golondrina de cinta */}
        <polygon points="12,94 28,84 28,98 12,104 18,99" fill={isUnlocked ? '#4C9A00' : '#1E293B'} />
        <polygon points="128,94 112,84 112,98 128,104 122,99" fill={isUnlocked ? '#4C9A00' : '#1E293B'} />

        {/* Cuerpo de la cinta */}
        <path d="M 24,87 Q 70,80 116,87 L 114,103 Q 70,96 26,103 Z" fill={bannerGrad} stroke={isUnlocked ? '#3B7E00' : '#334155'} strokeWidth="1.2" />
        <path d="M 27,89 Q 70,83 113,89 L 111,100 Q 70,94 29,100 Z" fill="none" stroke="#FFFFFF" strokeWidth="0.7" opacity="0.45" />

        <text x="70" y="98" fill={bannerText} fontSize="8.5" fontWeight="900" textAnchor="middle" letterSpacing="1.2" fontFamily="Arial Black, Impact, sans-serif">
          ZOE 3D AVATAR
        </text>
      </g>

      {/* Microchip / Circuito de IA en la Base */}
      <g transform="translate(70, 115)">
        {/* Pistas de circuito a los lados */}
        <line x1="-12" y1="-3" x2="-8" y2="-3" stroke={isUnlocked ? '#00FFFF' : '#64748B'} strokeWidth="1" />
        <line x1="-12" y1="0" x2="-8" y2="0" stroke={isUnlocked ? '#00FFFF' : '#64748B'} strokeWidth="1" />
        <line x1="-12" y1="3" x2="-8" y2="3" stroke={isUnlocked ? '#00FFFF' : '#64748B'} strokeWidth="1" />

        <line x1="8" y1="-3" x2="12" y2="-3" stroke={isUnlocked ? '#00FFFF' : '#64748B'} strokeWidth="1" />
        <line x1="8" y1="0" x2="12" y2="0" stroke={isUnlocked ? '#00FFFF' : '#64748B'} strokeWidth="1" />
        <line x1="8" y1="3" x2="12" y2="3" stroke={isUnlocked ? '#00FFFF' : '#64748B'} strokeWidth="1" />

        {/* Chip central */}
        <rect x="-6" y="-6" width="12" height="12" rx="2" fill={isUnlocked ? '#0E334D' : '#334155'} stroke={isUnlocked ? '#00FFFF' : '#94A3B8'} strokeWidth="1" />
        {/* Núcleo dorado del procesador */}
        <rect x="-3" y="-3" width="6" height="6" rx="1" fill={goldGrad} />
      </g>
    </svg>
  );
};

/**
 * 7. MAESTRO INNOVADOR 360 / RANGO MÁXIMO
 * Referente: Gran Roseta Imperial dorada y verde lima con 28 picos dentados,
 * corona imperial dorada con joyas, hilera de 5 estrellas doradas,
 * texto "MAESTRO INNOVADOR", gran cinta curva verde lima con "360" gigante,
 * globo terráqueo holográfico con anillos orbitales y laureles imperiales.
 */
export const MaestroInnovador360Badge: React.FC<BadgeGraphicProps> = ({ size = 96, className = '', isUnlocked = true }) => {
  const prefix = 'mae';
  const cyanBorder = isUnlocked ? `url(#${prefix}-cyan)` : `url(#${prefix}-l-cyan)`;
  const bgGrad = isUnlocked ? `url(#${prefix}-bg)` : `url(#${prefix}-l-bg)`;
  const bannerGrad = isUnlocked ? `url(#${prefix}-banner)` : `url(#${prefix}-l-banner)`;
  const goldGrad = isUnlocked ? `url(#${prefix}-gold)` : `url(#${prefix}-l-gold)`;
  const rosetteGrad = isUnlocked ? `url(#${prefix}-rosette)` : `url(#${prefix}-l-rosette)`;
  const bannerText = isUnlocked ? '#041E1C' : '#1E293B';

  return (
    <svg width={size} height={size} viewBox="0 0 140 140" className={className} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`${prefix}-cyan`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00FFFF" />
          <stop offset="50%" stopColor="#00B4D8" />
          <stop offset="100%" stopColor="#0077B6" />
        </linearGradient>
        <linearGradient id={`${prefix}-rosette`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#B4FF2B" />
          <stop offset="35%" stopColor="#FFD700" />
          <stop offset="70%" stopColor="#8DF500" />
          <stop offset="100%" stopColor="#F5A623" />
        </linearGradient>
        <radialGradient id={`${prefix}-bg`} cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#0E334D" />
          <stop offset="60%" stopColor="#071E2F" />
          <stop offset="100%" stopColor="#020E18" />
        </radialGradient>
        <linearGradient id={`${prefix}-banner`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#76DD00" />
          <stop offset="25%" stopColor="#B4FF2B" />
          <stop offset="50%" stopColor="#8DF500" />
          <stop offset="85%" stopColor="#B4FF2B" />
          <stop offset="100%" stopColor="#5EBD00" />
        </linearGradient>
        <linearGradient id={`${prefix}-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF275" />
          <stop offset="50%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#D4A000" />
        </linearGradient>

        {/* Locked */}
        <linearGradient id={`${prefix}-l-cyan`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <linearGradient id={`${prefix}-l-rosette`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#64748B" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <radialGradient id={`${prefix}-l-bg`} cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#0F172A" />
        </radialGradient>
        <linearGradient id={`${prefix}-l-banner`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="50%" stopColor="#64748B" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <linearGradient id={`${prefix}-l-gold`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>
      </defs>

      {/* Sombra de la roseta imperial */}
      <polygon points={getRosettePoints(70, 70, 64, 55, 28)} fill="#000000" opacity="0.45" />

      {/* Roseta Imperial Dentada (28 picos dorados y verde lima) */}
      <polygon points={getRosettePoints(70, 67, 64, 55, 28)} fill={rosetteGrad} />

      {/* Medallón Circular Interior */}
      <circle cx="70" cy="67" r="51" fill={bgGrad} stroke={cyanBorder} strokeWidth="2.5" />
      <circle cx="70" cy="67" r="47" fill="none" stroke={isUnlocked ? '#00FFFF' : '#475569'} strokeWidth="1" strokeDasharray="3 2" opacity="0.75" />

      {/* Corona Real Imperial Dorada de 5 Puntas */}
      <g transform="translate(70, 31)">
        {/* Banda base de la corona */}
        <rect x="-14" y="3" width="28" height="3" rx="0.8" fill={goldGrad} stroke={isUnlocked ? '#B8860B' : '#475569'} strokeWidth="0.6" />
        {/* Joyas en la banda */}
        <circle cx="-8" cy="4.5" r="0.8" fill={isUnlocked ? '#00FFFF' : '#CBD5E1'} />
        <circle cx="0" cy="4.5" r="0.8" fill={isUnlocked ? '#FF3D00' : '#CBD5E1'} />
        <circle cx="8" cy="4.5" r="0.8" fill={isUnlocked ? '#00FFFF' : '#CBD5E1'} />
        {/* 5 Puntas de la corona */}
        <polygon points="-14,3 -13,-4 -8,0 -1,-6 0,-6 1,-6 8,0 13,-4 14,3" fill={goldGrad} stroke={isUnlocked ? '#B8860B' : '#475569'} strokeWidth="0.8" />
        {/* Perlas/Gemas en los vértices */}
        <circle cx="-13" cy="-4" r="1.1" fill="#FFFFFF" />
        <circle cx="-8" cy="0" r="0.9" fill="#FFFFFF" />
        <circle cx="0" cy="-6" r="1.4" fill={isUnlocked ? '#00FFFF' : '#FFFFFF'} />
        <circle cx="8" cy="0" r="0.9" fill="#FFFFFF" />
        <circle cx="13" cy="-4" r="1.1" fill="#FFFFFF" />
      </g>

      {/* Hilera de 5 Estrellas Doradas */}
      <polygon points={getStarPoints(70, 42, 3)} fill={goldGrad} />
      <polygon points={getStarPoints(60, 43, 2.4)} fill={goldGrad} />
      <polygon points={getStarPoints(80, 43, 2.4)} fill={goldGrad} />
      <polygon points={getStarPoints(51, 45, 2)} fill={goldGrad} />
      <polygon points={getStarPoints(89, 45, 2)} fill={goldGrad} />

      {/* Laureles Imperiales a los lados */}
      <g>
        <path d="M 32,50 Q 28,64 34,78" fill="none" stroke={isUnlocked ? '#B4FF2B' : '#64748B'} strokeWidth="1.2" />
        <ellipse cx="28" cy="56" rx="1.8" ry="3.5" transform="rotate(-30 28 56)" fill={bannerGrad} />
        <ellipse cx="29" cy="66" rx="1.8" ry="3.5" transform="rotate(-10 29 66)" fill={bannerGrad} />

        <path d="M 108,50 Q 112,64 106,78" fill="none" stroke={isUnlocked ? '#B4FF2B' : '#64748B'} strokeWidth="1.2" />
        <ellipse cx="112" cy="56" rx="1.8" ry="3.5" transform="rotate(30 112 56)" fill={bannerGrad} />
        <ellipse cx="111" cy="66" rx="1.8" ry="3.5" transform="rotate(10 111 66)" fill={bannerGrad} />
      </g>

      {/* Textos: MAESTRO INNOVADOR */}
      <text x="70" y="55" fill="#FFFFFF" fontSize="8.5" fontWeight="900" textAnchor="middle" letterSpacing="1.5" fontFamily="Arial Black, Impact, sans-serif">
        MAESTRO
      </text>
      <text x="70" y="65" fill="#FFFFFF" fontSize="8.5" fontWeight="900" textAnchor="middle" letterSpacing="1.5" fontFamily="Arial Black, Impact, sans-serif">
        INNOVADOR
      </text>

      {/* Gran Cinta Curvada con "360" Gigante */}
      <g>
        {/* Colas de golondrina de cinta */}
        <polygon points="10,80 26,71 26,85 10,91 16,86" fill={isUnlocked ? '#4C9A00' : '#1E293B'} />
        <polygon points="130,80 114,71 114,85 130,91 124,86" fill={isUnlocked ? '#4C9A00' : '#1E293B'} />

        {/* Cinta frontal */}
        <path d="M 22,74 Q 70,66 118,74 L 115,94 Q 70,86 25,94 Z" fill={bannerGrad} stroke={isUnlocked ? '#3B7E00' : '#334155'} strokeWidth="1.2" />
        <path d="M 25,76 Q 70,69 115,76 L 113,91 Q 70,84 27,91 Z" fill="none" stroke="#FFFFFF" strokeWidth="0.7" opacity="0.45" />

        <text x="70" y="89" fill={bannerText} fontSize="17" fontWeight="900" textAnchor="middle" letterSpacing="2" fontFamily="Arial Black, Impact, sans-serif">
          360
        </text>
      </g>

      {/* Globo Terráqueo Holográfico con Anillos Orbitales en la Base */}
      <g transform="translate(70, 107)">
        {/* Esfera terráqueo */}
        <circle cx="0" cy="0" r="7.5" fill={isUnlocked ? '#0E334D' : '#334155'} stroke={isUnlocked ? '#00FFFF' : '#94A3B8'} strokeWidth="0.9" />
        {/* Meridianos y paralelos */}
        <ellipse cx="0" cy="0" rx="3.5" ry="7.5" fill="none" stroke={isUnlocked ? '#00FFFF' : '#64748B'} strokeWidth="0.6" />
        <line x1="-7.5" y1="0" x2="7.5" y2="0" stroke={isUnlocked ? '#00FFFF' : '#64748B'} strokeWidth="0.6" />
        {/* Anillo orbital elíptico inclinado */}
        <ellipse cx="0" cy="0" rx="13" ry="4" transform="rotate(-20)" fill="none" stroke={goldGrad} strokeWidth="1.2" />
        <circle cx="10" cy="-3.5" r="1" fill="#FFFFFF" />
      </g>
    </svg>
  );
};

/**
 * Componente unificador BadgeGraphicRenderer: mapea un ID de insignia
 * a su componente de visualización correspondiente.
 */
export const BadgeGraphicRenderer: React.FC<{
  badgeId: string;
  size?: number;
  className?: string;
  isUnlocked?: boolean;
}> = ({ badgeId, size = 96, className = '', isUnlocked = true }) => {
  const normalized = badgeId.toLowerCase().replace(/-/g, '_');

  switch (normalized) {
    case 'pionero_territorial':
      return <PioneroTerritorialBadge size={size} className={className} isUnlocked={isUnlocked} />;
    case 'visionario_estrategico':
      return <VisionarioEstrategicoBadge size={size} className={className} isUnlocked={isUnlocked} />;
    case 'arquitecto_tendencias':
      return <ArquitectoTendenciasBadge size={size} className={className} isUnlocked={isUnlocked} />;
    case 'ingeniero_prototipos':
      return <IngenieroPrototiposBadge size={size} className={className} isUnlocked={isUnlocked} />;
    case 'custodio_conocimiento':
      return <CustodioConocimientoBadge size={size} className={className} isUnlocked={isUnlocked} />;
    case 'vinculo_cognitivo':
      return <VinculoCognitivoBadge size={size} className={className} isUnlocked={isUnlocked} />;
    case 'maestro_innovador_360':
    case 'maestro_innovador':
      return <MaestroInnovador360Badge size={size} className={className} isUnlocked={isUnlocked} />;
    default:
      return <PioneroTerritorialBadge size={size} className={className} isUnlocked={isUnlocked} />;
  }
};

/**
 * Emblema de Rango para la cabecera, perfil y modal.
 */
export const RankEmblem: React.FC<{ level: number; size?: number; className?: string }> = ({
  level,
  size = 64,
  className = '',
}) => {
  switch (level) {
    case 1:
      return <PioneroTerritorialBadge size={size} className={className} isUnlocked={true} />;
    case 2:
      return <IngenieroPrototiposBadge size={size} className={className} isUnlocked={true} />;
    case 3:
      return <VisionarioEstrategicoBadge size={size} className={className} isUnlocked={true} />;
    case 4:
      return <ArquitectoTendenciasBadge size={size} className={className} isUnlocked={true} />;
    case 5:
    default:
      return <MaestroInnovador360Badge size={size} className={className} isUnlocked={true} />;
  }
};
