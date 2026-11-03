import React from 'react';

interface BadgeGraphicProps {
  size?: number;
  className?: string;
  isUnlocked?: boolean;
}

// Símbolos auxiliares reutilizables: Laurel izquierdo y derecho, Estrella de 5 puntas
const StarSvg: React.FC<{ cx: number; cy: number; r: number; fill?: string }> = ({ cx, cy, r, fill = 'url(#goldGrad)' }) => {
  const points = [];
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.45;
    points.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
  }
  return <polygon points={points.join(' ')} fill={fill} />;
};

const LaurelBranch: React.FC<{ side: 'left' | 'right'; x: number; y: number; scale?: number; fill?: string }> = ({
  side,
  x,
  y,
  scale = 1,
  fill = 'url(#goldGrad)',
}) => {
  const isLeft = side === 'left';
  return (
    <g transform={`translate(${x},${y}) scale(${isLeft ? scale : -scale}, ${scale})`}>
      {/* Tallo */}
      <path d="M 0,15 Q -10,0 -8,-18 Q -7,-24 0,-30" fill="none" stroke={fill} strokeWidth="1.2" />
      {/* Hojas */}
      <ellipse cx="-4" cy="8" rx="2.2" ry="4" transform="rotate(-30 -4 8)" fill={fill} />
      <ellipse cx="-8" cy="-2" rx="2.2" ry="4.5" transform="rotate(-45 -8 -2)" fill={fill} />
      <ellipse cx="-9" cy="-12" rx="2.2" ry="4.5" transform="rotate(-60 -9 -12)" fill={fill} />
      <ellipse cx="-7" cy="-22" rx="2" ry="4" transform="rotate(-75 -7 -22)" fill={fill} />
      <ellipse cx="-2" cy="-28" rx="1.8" ry="3.5" transform="rotate(-85 -2 -28)" fill={fill} />
      {/* Hojas internas */}
      <ellipse cx="-1" cy="2" rx="1.8" ry="3.2" transform="rotate(20 -1 2)" fill={fill} />
      <ellipse cx="-2" cy="-8" rx="1.8" ry="3.5" transform="rotate(25 -2 -8)" fill={fill} />
      <ellipse cx="-2" cy="-18" rx="1.6" ry="3.2" transform="rotate(30 -2 -18)" fill={fill} />
    </g>
  );
};

// Definiciones maestras de gradientes dorados y sombras
const MasterDefs: React.FC = () => (
  <defs>
    {/* Gradiente Dorado Metálico de Lujo */}
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#FFF2A3" />
      <stop offset="25%" stopColor="#F5D061" />
      <stop offset="50%" stopColor="#D4AF37" />
      <stop offset="75%" stopColor="#AA7A1E" />
      <stop offset="100%" stopColor="#FFF2A3" />
    </linearGradient>

    {/* Gradiente Dorado para Banners con Profundidad 3D */}
    <linearGradient id="goldBannerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#C89625" />
      <stop offset="15%" stopColor="#FBE186" />
      <stop offset="50%" stopColor="#E5B842" />
      <stop offset="85%" stopColor="#FBE186" />
      <stop offset="100%" stopColor="#B8851B" />
    </linearGradient>

    {/* Fondo Azul Real Profundo con Iluminación Especular */}
    <radialGradient id="blueBaseGrad" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stopColor="#124873" />
      <stop offset="45%" stopColor="#0B3056" />
      <stop offset="85%" stopColor="#051B33" />
      <stop offset="100%" stopColor="#020E1C" />
    </radialGradient>

    {/* Fondo Verde Petróleo Profundo */}
    <radialGradient id="tealBaseGrad" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stopColor="#0E586C" />
      <stop offset="50%" stopColor="#073744" />
      <stop offset="100%" stopColor="#031E26" />
    </radialGradient>

    {/* Fondo Ámbar / Bronce Real */}
    <radialGradient id="amberBaseGrad" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stopColor="#5E3807" />
      <stop offset="55%" stopColor="#3D2303" />
      <stop offset="100%" stopColor="#1F1001" />
    </radialGradient>

    {/* Fondo Fucsia Púrpura Real */}
    <radialGradient id="magentaBaseGrad" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stopColor="#590C41" />
      <stop offset="55%" stopColor="#380528" />
      <stop offset="100%" stopColor="#1C0113" />
    </radialGradient>

    {/* Sombra para Banners */}
    <filter id="bannerShadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.65" />
    </filter>
  </defs>
);

/**
 * 1. PIONERO TERRITORIAL
 * Estilo Sello Diamante con Bordes Redondeados (Similar a superior izquierda del referente)
 */
export const PioneroTerritorialBadge: React.FC<BadgeGraphicProps> = ({ size = 110, className = '', isUnlocked = true }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      style={{ filter: isUnlocked ? 'drop-shadow(0 0 10px rgba(212,175,55,0.45))' : 'grayscale(100%) opacity(0.35)' }}
    >
      <MasterDefs />

      {/* Rombo / Diamante Exterior con esquinas curvadas */}
      <g transform="rotate(45 60 60)">
        <rect x="20" y="20" width="80" height="80" rx="16" fill="url(#tealBaseGrad)" stroke="url(#goldGrad)" strokeWidth="3.5" />
        <rect x="24.5" y="24.5" width="71" height="71" rx="13" fill="none" stroke="url(#goldGrad)" strokeWidth="1" opacity="0.6" strokeDasharray="3 2" />
        <rect x="27.5" y="27.5" width="65" height="65" rx="11" fill="none" stroke="url(#goldGrad)" strokeWidth="0.8" opacity="0.4" />
      </g>

      {/* Parte Superior: 3 Estrellas Doradas y Rótulo CERTIFIED */}
      <StarSvg cx="60" cy="22" r="3.8" />
      <StarSvg cx="51" cy="25" r="2.8" />
      <StarSvg cx="69" cy="25" r="2.8" />
      <text x="60" y="34" fill="url(#goldGrad)" fontSize="5.5" fontWeight="800" textAnchor="middle" letterSpacing="1.2">
        DIAGNÓSTICO
      </text>

      {/* Banner Horizontal Dorado Central */}
      <g filter="url(#bannerShadow)">
        <rect x="12" y="46" width="96" height="23" rx="5" fill="url(#goldBannerGrad)" stroke="#6A4907" strokeWidth="1" />
        <rect x="14" y="48" width="92" height="19" rx="3.5" fill="none" stroke="#FFFFFF" strokeWidth="0.6" opacity="0.5" />
        <text x="60" y="61" fill="#04222B" fontSize="9.5" fontWeight="900" textAnchor="middle" letterSpacing="1" fontFamily="Impact, Arial Black, sans-serif">
          PIONERO
        </text>
      </g>

      {/* Parte Inferior: Laureles Dorados y Rótulo TERRITORIO */}
      <LaurelBranch side="left" x="38" y="94" scale="0.75" />
      <LaurelBranch side="right" x="82" y="94" scale="0.75" />
      <StarSvg cx="60" cy="81" r="3.2" />
      <text x="60" y="91" fill="url(#goldGrad)" fontSize="5.5" fontWeight="800" textAnchor="middle" letterSpacing="1.5">
        TERRITORIAL
      </text>
    </svg>
  );
};

/**
 * 2. VISIONARIO ESTRATÉGICO
 * Estilo Sello Roseta Dentada Circular (Similar a superior derecha del referente)
 */
export const VisionarioEstrategicoBadge: React.FC<BadgeGraphicProps> = ({ size = 110, className = '', isUnlocked = true }) => {
  // Generar los 24 dientes de roseta dorada oficial
  const teethPoints = [];
  const cx = 60, cy = 60, rOuter = 55, rInner = 50, n = 24;
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = (i * Math.PI) / n - Math.PI / 2;
    teethPoints.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      style={{ filter: isUnlocked ? 'drop-shadow(0 0 10px rgba(242,159,5,0.45))' : 'grayscale(100%) opacity(0.35)' }}
    >
      <MasterDefs />

      {/* Roseta Dentada Exterior Dorada */}
      <polygon points={teethPoints.join(' ')} fill="url(#goldGrad)" stroke="#8A5F11" strokeWidth="1" filter="url(#bannerShadow)" />

      {/* Círculo Base Azul Real */}
      <circle cx="60" cy="60" r="46" fill="url(#blueBaseGrad)" stroke="url(#goldGrad)" strokeWidth="2.5" />
      <circle cx="60" cy="60" r="42" fill="none" stroke="url(#goldGrad)" strokeWidth="1" strokeDasharray="3 2" opacity="0.7" />

      {/* Parte Superior: 3 Estrellas Doradas */}
      <StarSvg cx="60" cy="27" r="4.2" />
      <StarSvg cx="50" cy="30" r="3" />
      <StarSvg cx="70" cy="30" r="3" />

      {/* Barras de Enmarcado Central */}
      <line x1="32" y1="42" x2="43" y2="42" stroke="url(#goldGrad)" strokeWidth="1.8" />
      <line x1="77" y1="42" x2="88" y2="42" stroke="url(#goldGrad)" strokeWidth="1.8" />
      <line x1="32" y1="45" x2="43" y2="45" stroke="url(#goldGrad)" strokeWidth="1" />
      <line x1="77" y1="45" x2="88" y2="45" stroke="url(#goldGrad)" strokeWidth="1" />

      {/* Texto Central Imponente */}
      <text x="60" y="47" fill="url(#goldGrad)" fontSize="11" fontWeight="900" textAnchor="middle" letterSpacing="1.2" fontFamily="Impact, Arial Black, sans-serif">
        IDEACIÓN
      </text>
      <text x="60" y="62" fill="url(#goldGrad)" fontSize="13.5" fontWeight="900" textAnchor="middle" letterSpacing="1.5" fontFamily="Impact, Arial Black, sans-serif">
        VOCACIÓN
      </text>

      {/* Laureles Laterales */}
      <LaurelBranch side="left" x="35" y="77" scale="0.7" />
      <LaurelBranch side="right" x="85" y="77" scale="0.7" />

      {/* Parte Inferior: CERTIFIED */}
      <text x="60" y="76" fill="url(#goldGrad)" fontSize="6" fontWeight="800" textAnchor="middle" letterSpacing="1.8">
        ESTRATÉGICO
      </text>
      <StarSvg cx="60" cy="85" r="2.8" />
    </svg>
  );
};

/**
 * 3. ARQUITECTO DE TENDENCIAS
 * Estilo Medalla Circular con Gran Cinta Plegada Saliente (Similar a inferior izquierda del referente)
 */
export const ArquitectoTendenciasBadge: React.FC<BadgeGraphicProps> = ({ size = 110, className = '', isUnlocked = true }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      style={{ filter: isUnlocked ? 'drop-shadow(0 0 10px rgba(94,194,221,0.45))' : 'grayscale(100%) opacity(0.35)' }}
    >
      <MasterDefs />

      {/* Círculo Exterior Dorado y Azul Petróleo */}
      <circle cx="60" cy="60" r="48" fill="url(#goldGrad)" stroke="#784A09" strokeWidth="1.5" />
      <circle cx="60" cy="60" r="44.5" fill="url(#blueBaseGrad)" stroke="url(#goldGrad)" strokeWidth="2.5" />
      <circle cx="60" cy="60" r="41" fill="none" stroke="url(#goldGrad)" strokeWidth="0.9" opacity="0.6" strokeDasharray="2.5 2" />

      {/* Parte Superior: Laureles Circulares + Gran Estrella */}
      <LaurelBranch side="left" x="42" y="38" scale="0.7" />
      <LaurelBranch side="right" x="78" y="38" scale="0.7" />
      <StarSvg cx="60" cy="27" r="4.5" />
      <line x1="42" y1="36" x2="78" y2="36" stroke="url(#goldGrad)" strokeWidth="1.8" strokeLinecap="round" />

      {/* Gran Cinta / Banner Horizontal Plegado con Puntas en Cola de Golondrina */}
      <g filter="url(#bannerShadow)">
        {/* Plegaduras oscuras traseras de la cinta */}
        <polygon points="12,65 18,52 18,65" fill="#523204" />
        <polygon points="108,65 102,52 102,65" fill="#523204" />

        {/* Extremos exteriores de la cinta con cola de milano */}
        <polygon points="6,52 18,52 18,69 6,69 11,60.5" fill="url(#goldBannerGrad)" stroke="#6A4907" strokeWidth="0.8" />
        <polygon points="114,52 102,52 102,69 114,69 109,60.5" fill="url(#goldBannerGrad)" stroke="#6A4907" strokeWidth="0.8" />

        {/* Cuerpo central del Banner */}
        <polygon points="16,49 104,49 104,72 16,72" fill="url(#goldBannerGrad)" stroke="#6A4907" strokeWidth="1" />
        <line x1="18" y1="51" x2="102" y2="51" stroke="#FFFFFF" strokeWidth="0.7" opacity="0.6" />
        <line x1="18" y1="70" x2="102" y2="70" stroke="#FFFFFF" strokeWidth="0.7" opacity="0.6" />

        <text x="60" y="65" fill="#031826" fontSize="10.5" fontWeight="900" textAnchor="middle" letterSpacing="1.2" fontFamily="Impact, Arial Black, sans-serif">
          TENDENCIAS
        </text>
      </g>

      {/* Parte Inferior: Subtítulo y 3 Estrellas */}
      <text x="60" y="85" fill="url(#goldGrad)" fontSize="6" fontWeight="800" textAnchor="middle" letterSpacing="1.5">
        ÁRBOL GLOBAL & CO
      </text>
      <StarSvg cx="60" cy="94" r="3.8" />
      <StarSvg cx="50" cy="93" r="2.8" />
      <StarSvg cx="70" cy="93" r="2.8" />
    </svg>
  );
};

/**
 * 4. INGENIERO DE PROTOTIPOS
 * Estilo Insignia Hexagonal con Cinta Colgante Inferior (Similar a inferior derecha del referente)
 */
export const IngenieroPrototiposBadge: React.FC<BadgeGraphicProps> = ({ size = 110, className = '', isUnlocked = true }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      style={{ filter: isUnlocked ? 'drop-shadow(0 0 10px rgba(224,36,165,0.45))' : 'grayscale(100%) opacity(0.35)' }}
    >
      <MasterDefs />

      {/* Cinta Colgante Inferior con Cola de Milano */}
      <g filter="url(#bannerShadow)">
        <polygon points="50,90 70,90 70,114 60,107 50,114" fill="url(#goldBannerGrad)" stroke="#784A09" strokeWidth="1" />
      </g>

      {/* Hexágono Oficial Dorado Exterior */}
      <polygon
        points="60,6 106,26 106,84 60,104 14,84 14,26"
        fill="url(#goldGrad)"
        stroke="#6B4105"
        strokeWidth="1.5"
        filter="url(#bannerShadow)"
      />

      {/* Hexágono Interior Azul Real con Tinte Magenta */}
      <polygon
        points="60,10 102,28.5 102,81.5 60,100 18,81.5 18,28.5"
        fill="url(#blueBaseGrad)"
        stroke="url(#goldGrad)"
        strokeWidth="2.5"
      />
      <polygon
        points="60,14 98,31 98,79 60,96 22,79 22,31"
        fill="none"
        stroke="url(#goldGrad)"
        strokeWidth="0.8"
        strokeDasharray="3 2"
        opacity="0.6"
      />

      {/* Parte Superior: Rótulo TRL & INNOVACIÓN */}
      <text x="60" y="32" fill="url(#goldGrad)" fontSize="10" fontWeight="900" textAnchor="middle" letterSpacing="1.2" fontFamily="Impact, Arial Black, sans-serif">
        SOLUCIÓN TRL
      </text>

      {/* Cinta / Placa Dorada Angular */}
      <g filter="url(#bannerShadow)">
        {/* Pestañas oscuras */}
        <polygon points="20,58 26,48 26,58" fill="#4A2D03" />
        <polygon points="100,58 94,48 94,58" fill="#4A2D03" />

        <polygon points="18,48 102,48 98,68 22,68" fill="url(#goldBannerGrad)" stroke="#6A4907" strokeWidth="1" />
        <text x="60" y="63" fill="#031826" fontSize="10" fontWeight="900" textAnchor="middle" letterSpacing="1.5" fontFamily="Impact, Arial Black, sans-serif">
          PROTOTIPO
        </text>
      </g>

      {/* Parte Inferior: VALIDADO + 3 Estrellas */}
      <text x="60" y="78" fill="url(#goldGrad)" fontSize="5.5" fontWeight="800" textAnchor="middle" letterSpacing="1.8">
        ACREDITADO
      </text>
      <StarSvg cx="60" cy="87" r="3.8" />
      <StarSvg cx="50" cy="85" r="2.8" />
      <StarSvg cx="70" cy="85" r="2.8" />
    </svg>
  );
};

/**
 * 5. CUSTODIO DEL CONOCIMIENTO
 * Estilo Sello Bóveda Clásica con Doble Escudo y Doble Laurel
 */
export const CustodioConocimientoBadge: React.FC<BadgeGraphicProps> = ({ size = 110, className = '', isUnlocked = true }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      style={{ filter: isUnlocked ? 'drop-shadow(0 0 10px rgba(167,139,250,0.45))' : 'grayscale(100%) opacity(0.35)' }}
    >
      <MasterDefs />

      {/* Escudo Exterior con Borde Dorado */}
      <path
        d="M20,15 L100,15 L100,68 C100,90 60,110 60,110 C60,110 20,90 20,68 Z"
        fill="url(#goldGrad)"
        stroke="#6B4105"
        strokeWidth="1.5"
        filter="url(#bannerShadow)"
      />
      <path
        d="M23.5,18.5 L96.5,18.5 L96.5,67 C96.5,87 60,106 60,106 C60,106 23.5,87 23.5,67 Z"
        fill="url(#blueBaseGrad)"
        stroke="url(#goldGrad)"
        strokeWidth="2.5"
      />
      <path
        d="M26.5,21.5 L93.5,21.5 L93.5,66 C93.5,84 60,102 60,102 C60,102 26.5,84 26.5,66 Z"
        fill="none"
        stroke="url(#goldGrad)"
        strokeWidth="0.8"
        strokeDasharray="3 2"
        opacity="0.6"
      />

      {/* Estrellas Superiores */}
      <StarSvg cx="60" cy="28" r="4.2" />
      <StarSvg cx="48" cy="30" r="2.8" />
      <StarSvg cx="72" cy="30" r="2.8" />

      {/* Texto Superior */}
      <text x="60" y="42" fill="url(#goldGrad)" fontSize="7" fontWeight="800" textAnchor="middle" letterSpacing="1.2">
        MEMORIA INSTITUCIONAL
      </text>

      {/* Banner Central */}
      <g filter="url(#bannerShadow)">
        <rect x="14" y="47" width="92" height="21" rx="4" fill="url(#goldBannerGrad)" stroke="#6A4907" strokeWidth="1" />
        <text x="60" y="62" fill="#031826" fontSize="9.5" fontWeight="900" textAnchor="middle" letterSpacing="1.2" fontFamily="Impact, Arial Black, sans-serif">
          BANCO UNIFICADO
        </text>
      </g>

      {/* Laureles Inferiores */}
      <LaurelBranch side="left" x="40" y="94" scale="0.75" />
      <LaurelBranch side="right" x="80" y="94" scale="0.75" />
      <text x="60" y="80" fill="url(#goldGrad)" fontSize="6" fontWeight="800" textAnchor="middle" letterSpacing="1.5">
        CUSTODIO
      </text>
      <StarSvg cx="60" cy="90" r="3" />
    </svg>
  );
};

/**
 * 6. VÍNCULO COGNITIVO (ZOE 3D)
 * Estilo Sello Roseta Futurista con Anillo de Espejo y Estrellas
 */
export const VinculoCognitivoBadge: React.FC<BadgeGraphicProps> = ({ size = 110, className = '', isUnlocked = true }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      style={{ filter: isUnlocked ? 'drop-shadow(0 0 10px rgba(39,220,255,0.5))' : 'grayscale(100%) opacity(0.35)' }}
    >
      <MasterDefs />

      {/* Corona Circular de Oro y Cian */}
      <circle cx="60" cy="60" r="48" fill="url(#goldGrad)" stroke="#784A09" strokeWidth="1.5" />
      <circle cx="60" cy="60" r="44.5" fill="url(#tealBaseGrad)" stroke="url(#goldGrad)" strokeWidth="2.5" />
      <circle cx="60" cy="60" r="41" fill="none" stroke="url(#goldGrad)" strokeWidth="1" strokeDasharray="2.5 2" opacity="0.7" />

      {/* Estrellas Superiores */}
      <StarSvg cx="60" cy="27" r="4.2" />
      <StarSvg cx="50" cy="29" r="3" />
      <StarSvg cx="70" cy="29" r="3" />
      <text x="60" y="39" fill="url(#goldGrad)" fontSize="6" fontWeight="800" textAnchor="middle" letterSpacing="1.5">
        INTELIGENCIA ARTIFICIAL
      </text>

      {/* Banner Central de ZOE */}
      <g filter="url(#bannerShadow)">
        <polygon points="12,65 18,52 18,65" fill="#523204" />
        <polygon points="108,65 102,52 102,65" fill="#523204" />
        <polygon points="6,52 18,52 18,69 6,69 11,60.5" fill="url(#goldBannerGrad)" stroke="#6A4907" strokeWidth="0.8" />
        <polygon points="114,52 102,52 102,69 114,69 109,60.5" fill="url(#goldBannerGrad)" stroke="#6A4907" strokeWidth="0.8" />

        <polygon points="16,49 104,49 104,72 16,72" fill="url(#goldBannerGrad)" stroke="#6A4907" strokeWidth="1" />
        <text x="60" y="65" fill="#04222B" fontSize="11" fontWeight="900" textAnchor="middle" letterSpacing="2" fontFamily="Impact, Arial Black, sans-serif">
          ZOE 3D AVATAR
        </text>
      </g>

      {/* Laureles Inferiores */}
      <LaurelBranch side="left" x="38" y="88" scale="0.65" />
      <LaurelBranch side="right" x="82" y="88" scale="0.65" />
      <text x="60" y="84" fill="url(#goldGrad)" fontSize="6" fontWeight="800" textAnchor="middle" letterSpacing="1.5">
        ALIANZA COGNITIVA
      </text>
      <StarSvg cx="60" cy="93" r="3.2" />
    </svg>
  );
};

/**
 * 7. MAESTRO INNOVADOR 360
 * Gran Sello Imperial Máximo de Excelencia (Fusión Magistral de Oro Real)
 */
export const MaestroInnovador360Badge: React.FC<BadgeGraphicProps> = ({ size = 110, className = '', isUnlocked = true }) => {
  const teethPoints = [];
  const cx = 60, cy = 60, rOuter = 56, rInner = 51, n = 32;
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = (i * Math.PI) / n - Math.PI / 2;
    teethPoints.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      style={{ filter: isUnlocked ? 'drop-shadow(0 0 14px rgba(255,215,0,0.65))' : 'grayscale(100%) opacity(0.35)' }}
    >
      <MasterDefs />

      {/* Gran Roseta Dentada Imperial de 32 Puntas */}
      <polygon points={teethPoints.join(' ')} fill="url(#goldGrad)" stroke="#8A5F11" strokeWidth="1.2" filter="url(#bannerShadow)" />

      {/* Círculo Interior en Azul Medianoche Real con Borde Triple */}
      <circle cx="60" cy="60" r="47" fill="url(#blueBaseGrad)" stroke="url(#goldGrad)" strokeWidth="3" />
      <circle cx="60" cy="60" r="43" fill="none" stroke="url(#goldGrad)" strokeWidth="1.2" strokeDasharray="3 2" opacity="0.8" />
      <circle cx="60" cy="60" r="40" fill="none" stroke="url(#goldGrad)" strokeWidth="0.8" opacity="0.5" />

      {/* Corona Real Superior */}
      <path d="M46,31 L46,24 L52,28 L60,18 L68,28 L74,24 L74,31 Z" fill="url(#goldGrad)" stroke="#6A4907" strokeWidth="0.8" />
      <circle cx="60" cy="17" r="1.8" fill="#FFF2A3" />
      <circle cx="46" cy="23" r="1.5" fill="#FFF2A3" />
      <circle cx="74" cy="23" r="1.5" fill="#FFF2A3" />

      <text x="60" y="38" fill="url(#goldGrad)" fontSize="6.5" fontWeight="900" textAnchor="middle" letterSpacing="1.8">
        MÉRITO MÁXIMO
      </text>

      {/* Gran Banner Tridimensional Dorado */}
      <g filter="url(#bannerShadow)">
        <polygon points="10,64 16,51 16,64" fill="#523204" />
        <polygon points="110,64 104,51 104,64" fill="#523204" />
        <polygon points="4,51 16,51 16,68 4,68 9,59.5" fill="url(#goldBannerGrad)" stroke="#6A4907" strokeWidth="0.8" />
        <polygon points="116,51 104,51 104,68 116,68 111,59.5" fill="url(#goldBannerGrad)" stroke="#6A4907" strokeWidth="0.8" />

        <polygon points="14,48 106,48 106,71 14,71" fill="url(#goldBannerGrad)" stroke="#6A4907" strokeWidth="1.2" />
        <text x="60" y="63.5" fill="#031826" fontSize="10.5" fontWeight="900" textAnchor="middle" letterSpacing="1.2" fontFamily="Impact, Arial Black, sans-serif">
          MAESTRO 360
        </text>
      </g>

      {/* Laureles de la Victoria */}
      <LaurelBranch side="left" x="35" y="87" scale="0.75" />
      <LaurelBranch side="right" x="85" y="87" scale="0.75" />

      <text x="60" y="81" fill="url(#goldGrad)" fontSize="6" fontWeight="800" textAnchor="middle" letterSpacing="1.5">
        INNOVAHUB360
      </text>

      {/* 5 Estrellas Doradas */}
      <StarSvg cx="60" cy="91" r="3.6" />
      <StarSvg cx="50" cy="90" r="2.6" />
      <StarSvg cx="70" cy="90" r="2.6" />
      <StarSvg cx="41" cy="87" r="2" />
      <StarSvg cx="79" cy="87" r="2" />
    </svg>
  );
};

/**
 * Renderizador de insignia vectorial según su ID.
 */
export const BadgeGraphicRenderer: React.FC<{ badgeId: string; size?: number; className?: string; isUnlocked?: boolean }> = ({
  badgeId,
  size = 110,
  className = '',
  isUnlocked = true,
}) => {
  switch (badgeId) {
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
      return <MaestroInnovador360Badge size={size} className={className} isUnlocked={isUnlocked} />;
    default:
      return <PioneroTerritorialBadge size={size} className={className} isUnlocked={isUnlocked} />;
  }
};

/**
 * Emblema oficial para el Rango / Nivel del Usuario (1 a 4).
 * Diseñado con el mismo lenguaje de sellos dorados y cintas de certificación.
 */
export const RankEmblem: React.FC<{ level: number; size?: number; className?: string }> = ({
  level,
  size = 90,
  className = '',
}) => {
  if (level === 1) {
    // Nivel 1: Observador Regional (Sello Diamante Certificado)
    return <PioneroTerritorialBadge size={size} className={className} isUnlocked={true} />;
  }
  if (level === 2) {
    // Nivel 2: Explorador de Desafíos (Sello Hexagonal con Cinta)
    return <IngenieroPrototiposBadge size={size} className={className} isUnlocked={true} />;
  }
  if (level === 3) {
    // Nivel 3: Arquitecto Territorial (Sello Roseta Circular Dentada)
    return <VisionarioEstrategicoBadge size={size} className={className} isUnlocked={true} />;
  }
  // Nivel 4: Líder de Innovación 360 (Gran Sello Imperial Máximo)
  return <MaestroInnovador360Badge size={size} className={className} isUnlocked={true} />;
};
