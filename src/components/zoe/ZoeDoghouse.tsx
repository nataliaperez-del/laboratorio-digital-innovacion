import React from 'react';

/** Tamaño de la casita; en celulares, más pequeña. */
export const DOGHOUSE = typeof window !== 'undefined' && window.innerWidth < 768 ? { width: 70, height: 66, margin: 12 } : { width: 92, height: 86, margin: 18 };

/** Dónde queda la puerta en pantalla: ZOE camina hasta aquí para entrar y sale desde aquí. */
export function doghouseDoor() {
  return {
    x: window.innerWidth - DOGHOUSE.margin - DOGHOUSE.width / 2,
    y: window.innerHeight - DOGHOUSE.margin,
  };
}

interface Props {
  /** ZOE está adentro: se ven sus ojos en la puerta y la casita se puede tocar para llamarla. */
  occupied: boolean;
  onCall?: () => void;
}

/** La casita holográfica de ZOE: ahí descansa cuando no se la necesita. */
export const ZoeDoghouse: React.FC<Props> = ({ occupied, onCall }) => {
  const art = (
    <svg viewBox="0 0 92 86" width={DOGHOUSE.width} height={DOGHOUSE.height} aria-hidden="true" className="zoe-house-art">
      <defs>
        <linearGradient id="zoe-house-roof" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#B85EFF" />
          <stop offset="1" stopColor="#5B3DD6" />
        </linearGradient>
        <linearGradient id="zoe-house-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#123A5E" />
          <stop offset="1" stopColor="#0A2140" />
        </linearGradient>
      </defs>
      {/* Plataforma de luz, como la de ZOE */}
      <ellipse cx="46" cy="80" rx="40" ry="5" className="zoe-house-glow" />
      {/* Paredes */}
      <path d="M14 42 L46 20 L78 42 L78 78 L14 78 Z" fill="url(#zoe-house-wall)" stroke="#27DCFF" strokeWidth="1.6" strokeLinejoin="round" />
      {/* Tablas */}
      <path d="M14 54 H78 M14 66 H78" stroke="#27DCFF" strokeOpacity=".22" strokeWidth="1" />
      {/* Techo */}
      <path d="M6 46 L46 14 L86 46 L80 50 L46 23 L12 50 Z" fill="url(#zoe-house-roof)" stroke="#E9D5FF" strokeOpacity=".7" strokeWidth="1.2" strokeLinejoin="round" />
      {/* Placa con el nombre */}
      <rect x="33" y="31" width="26" height="9" rx="2.5" fill="#04222B" stroke="#F29F05" strokeWidth="1" />
      <text x="46" y="38.2" textAnchor="middle" fontSize="7" fontWeight="700" fill="#F3C26B" fontFamily="Space Grotesk, sans-serif" letterSpacing=".8">
        ZOE
      </text>
      {/* Puerta */}
      <path d="M32 78 V60 a14 14 0 0 1 28 0 V78 Z" fill="#03060F" stroke="#27DCFF" strokeOpacity=".8" strokeWidth="1.4" />
      {occupied && (
        <g className="zoe-house-eyes">
          <ellipse cx="41" cy="64" rx="2.6" ry="3" fill="#9FE8FF" />
          <ellipse cx="51" cy="64" rx="2.6" ry="3" fill="#9FE8FF" />
        </g>
      )}
      {/* Hueso junto a la puerta */}
      <g fill="#EFF6FF" fillOpacity=".85">
        <rect x="65" y="74" width="8" height="2.4" rx="1.2" />
        <circle cx="65" cy="73.8" r="1.7" />
        <circle cx="65" cy="76.6" r="1.7" />
        <circle cx="73" cy="73.8" r="1.7" />
        <circle cx="73" cy="76.6" r="1.7" />
      </g>
    </svg>
  );

  const style = { right: DOGHOUSE.margin, bottom: DOGHOUSE.margin - 4, width: DOGHOUSE.width, height: DOGHOUSE.height };
  if (!occupied || !onCall) {
    return (
      <div className="zoe-house" style={style} aria-hidden="true">
        {art}
      </div>
    );
  }
  return (
    <button type="button" className="zoe-house zoe-house-occupied" style={style} onClick={onCall} aria-label="Llamar a ZOE: está en su casita" title="ZOE está en su casita · Tócala para llamarla">
      {art}
      <span className="zoe-house-zzz" aria-hidden="true">
        <span>z</span>
        <span>z</span>
      </span>
    </button>
  );
};

export default ZoeDoghouse;
