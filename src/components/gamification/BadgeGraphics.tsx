import React from 'react';

interface BadgeGraphicProps {
  size?: number;
  className?: string;
  isUnlocked?: boolean;
}

/**
 * 1. PIONERO TERRITORIAL
 * Brújula topográfica con coordenadas y nodos de exploración regional.
 */
export const PioneroTerritorialBadge: React.FC<BadgeGraphicProps> = ({ size = 96, className = '', isUnlocked = true }) => {
  const color = '#A8C63C';
  const filterId = `glow-pionero-${Math.random().toString(36).substr(2, 5)}`;
  const gradId = `grad-pionero-${Math.random().toString(36).substr(2, 5)}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={{ filter: isUnlocked ? 'drop-shadow(0 0 8px rgba(168,198,60,0.5))' : 'grayscale(100%) opacity(0.35)' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C4E045" />
          <stop offset="50%" stopColor="#A8C63C" />
          <stop offset="100%" stopColor="#4A6609" />
        </linearGradient>
      </defs>

      {/* Anillo exterior dentado / compás */}
      <circle cx="50" cy="50" r="45" fill="#04222B" stroke={`url(#${gradId})`} strokeWidth="3" />
      <circle cx="50" cy="50" r="41" fill="none" stroke="#A8C63C" strokeWidth="0.8" strokeDasharray="2 3" opacity="0.6" />

      {/* Marcas cardinales */}
      <line x1="50" y1="8" x2="50" y2="15" stroke="#A8C63C" strokeWidth="2.5" />
      <line x1="50" y1="85" x2="50" y2="92" stroke="#A8C63C" strokeWidth="2.5" />
      <line x1="8" y1="50" x2="15" y2="50" stroke="#A8C63C" strokeWidth="2.5" />
      <line x1="85" y1="50" x2="92" y2="50" stroke="#A8C63C" strokeWidth="2.5" />

      {/* Aguja de Brújula Diamante */}
      <polygon points="50,18 57,50 50,45 43,50" fill={`url(#${gradId})`} />
      <polygon points="50,82 57,50 50,55 43,50" fill="#094354" stroke="#A8C63C" strokeWidth="1" />

      {/* Centro de la Brújula */}
      <circle cx="50" cy="50" r="6" fill="#C4E045" stroke="#04222B" strokeWidth="2" />
      <circle cx="50" cy="50" r="2" fill="#04222B" />
    </svg>
  );
};

/**
 * 2. VISIONARIO ESTRATÉGICO
 * Cerebro cuántico y bombilla de energía con sinapsis doradas.
 */
export const VisionarioEstrategicoBadge: React.FC<BadgeGraphicProps> = ({ size = 96, className = '', isUnlocked = true }) => {
  const gradId = `grad-visionario-${Math.random().toString(36).substr(2, 5)}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={{ filter: isUnlocked ? 'drop-shadow(0 0 8px rgba(242,159,5,0.5))' : 'grayscale(100%) opacity(0.35)' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFC759" />
          <stop offset="50%" stopColor="#F29F05" />
          <stop offset="100%" stopColor="#A85700" />
        </linearGradient>
      </defs>

      {/* Escudo Hexagonal */}
      <polygon points="50,6 88,28 88,72 50,94 12,72 12,28" fill="#04222B" stroke={`url(#${gradId})`} strokeWidth="3" />
      <polygon points="50,12 82,31 82,69 50,88 18,69 18,31" fill="none" stroke="#F29F05" strokeWidth="0.8" opacity="0.4" />

      {/* Sinapsis / Ondas de Pensamiento */}
      <circle cx="50" cy="50" r="24" fill="none" stroke="#F29F05" strokeWidth="1.2" opacity="0.3" strokeDasharray="3 3" />

      {/* Bombilla / Núcleo de Visión */}
      <path d="M42,56 C38,51 35,45 35,38 C35,28 42,21 50,21 C58,21 65,28 65,38 C65,45 62,51 58,56 L58,62 L42,62 Z" fill={`url(#${gradId})`} />
      <line x1="44" y1="66" x2="56" y2="66" stroke="#FFC759" strokeWidth="2" strokeLinecap="round" />
      <line x1="47" y1="70" x2="53" y2="70" stroke="#FFC759" strokeWidth="2" strokeLinecap="round" />

      {/* Rayos de Idea */}
      <line x1="50" y1="12" x2="50" y2="17" stroke="#FFC759" strokeWidth="2" strokeLinecap="round" />
      <line x1="30" y1="23" x2="33" y2="27" stroke="#FFC759" strokeWidth="2" strokeLinecap="round" />
      <line x1="70" y1="23" x2="67" y2="27" stroke="#FFC759" strokeWidth="2" strokeLinecap="round" />
      <line x1="22" y1="38" x2="27" y2="38" stroke="#FFC759" strokeWidth="2" strokeLinecap="round" />
      <line x1="78" y1="38" x2="73" y2="38" stroke="#FFC759" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

/**
 * 3. ARQUITECTO DE TENDENCIAS
 * Árbol holográfico con nodos de ramificación geométrica y circuito.
 */
export const ArquitectoTendenciasBadge: React.FC<BadgeGraphicProps> = ({ size = 96, className = '', isUnlocked = true }) => {
  const gradId = `grad-arbol-${Math.random().toString(36).substr(2, 5)}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={{ filter: isUnlocked ? 'drop-shadow(0 0 8px rgba(94,194,221,0.5))' : 'grayscale(100%) opacity(0.35)' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A4ECFF" />
          <stop offset="50%" stopColor="#5EC2DD" />
          <stop offset="100%" stopColor="#0B5C75" />
        </linearGradient>
      </defs>

      {/* Octógono Tecnológico */}
      <polygon points="30,8 70,8 92,30 92,70 70,92 30,92 8,70 8,30" fill="#04222B" stroke={`url(#${gradId})`} strokeWidth="3" />

      {/* Tronco y ramas geométricas */}
      <line x1="50" y1="78" x2="50" y2="46" stroke={`url(#${gradId})`} strokeWidth="4" strokeLinecap="round" />
      <line x1="50" y1="56" x2="34" y2="42" stroke="#5EC2DD" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="50" y1="56" x2="66" y2="42" stroke="#5EC2DD" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="50" y1="46" x2="50" y2="28" stroke="#5EC2DD" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="34" y1="42" x2="26" y2="30" stroke="#5EC2DD" strokeWidth="2" strokeLinecap="round" />
      <line x1="66" y1="42" x2="74" y2="30" stroke="#5EC2DD" strokeWidth="2" strokeLinecap="round" />

      {/* Frutos / Nodos de Innovación */}
      <circle cx="50" cy="24" r="5" fill="#A4ECFF" stroke="#04222B" strokeWidth="1.5" />
      <circle cx="24" cy="28" r="4.5" fill="#5EC2DD" stroke="#04222B" strokeWidth="1.5" />
      <circle cx="76" cy="28" r="4.5" fill="#5EC2DD" stroke="#04222B" strokeWidth="1.5" />
      <circle cx="34" cy="42" r="3" fill="#A4ECFF" />
      <circle cx="66" cy="42" r="3" fill="#A4ECFF" />

      {/* Raíz del circuito */}
      <line x1="42" y1="84" x2="50" y2="78" stroke="#5EC2DD" strokeWidth="2" />
      <line x1="58" y1="84" x2="50" y2="78" stroke="#5EC2DD" strokeWidth="2" />
    </svg>
  );
};

/**
 * 4. INGENIERO DE PROTOTIPOS
 * Cohete supersónico y anillos de validación técnica TRL.
 */
export const IngenieroPrototiposBadge: React.FC<BadgeGraphicProps> = ({ size = 96, className = '', isUnlocked = true }) => {
  const gradId = `grad-prototipo-${Math.random().toString(36).substr(2, 5)}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={{ filter: isUnlocked ? 'drop-shadow(0 0 8px rgba(224,36,165,0.5))' : 'grayscale(100%) opacity(0.35)' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFA6E9" />
          <stop offset="50%" stopColor="#E024A5" />
          <stop offset="100%" stopColor="#7E0859" />
        </linearGradient>
      </defs>

      {/* Escudo Circular de Propulsión */}
      <circle cx="50" cy="50" r="45" fill="#04222B" stroke={`url(#${gradId})`} strokeWidth="3" />
      <circle cx="50" cy="50" r="38" fill="none" stroke="#E024A5" strokeWidth="0.8" opacity="0.5" />

      {/* Cohete Dinámico Inclinado */}
      <g transform="translate(50,50) rotate(-45) translate(-50,-50)">
        {/* Cuerpo del Cohete */}
        <path d="M50,15 C58,30 60,54 58,68 L42,68 C40,54 42,30 50,15 Z" fill={`url(#${gradId})`} />
        {/* Ventana */}
        <circle cx="50" cy="38" r="5" fill="#04222B" stroke="#FFA6E9" strokeWidth="1.5" />
        {/* Aletas */}
        <polygon points="42,54 30,68 42,66" fill="#A81279" />
        <polygon points="58,54 70,68 58,66" fill="#A81279" />
        {/* Fuego de propulsión */}
        <polygon points="45,69 50,86 55,69 50,73" fill="#F29F05" />
        <polygon points="47,69 50,79 53,69" fill="#FFD700" />
      </g>
    </svg>
  );
};

/**
 * 5. CUSTODIO DEL CONOCIMIENTO
 * Bóveda holográfica y archivo de gemas de innovación.
 */
export const CustodioConocimientoBadge: React.FC<BadgeGraphicProps> = ({ size = 96, className = '', isUnlocked = true }) => {
  const gradId = `grad-custodio-${Math.random().toString(36).substr(2, 5)}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={{ filter: isUnlocked ? 'drop-shadow(0 0 8px rgba(167,139,250,0.5))' : 'grayscale(100%) opacity(0.35)' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#DDD6FE" />
          <stop offset="50%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#5B21B6" />
        </linearGradient>
      </defs>

      {/* Escudo Arqueado */}
      <path d="M16,16 L84,16 L84,58 C84,76 50,92 50,92 C50,92 16,76 16,58 Z" fill="#04222B" stroke={`url(#${gradId})`} strokeWidth="3" />

      {/* Bóveda / Carpeta de Archivo */}
      <rect x="30" y="32" width="40" height="36" rx="4" fill="none" stroke={`url(#${gradId})`} strokeWidth="2.5" />
      <path d="M30,42 L70,42" stroke="#A78BFA" strokeWidth="1.5" />
      <polygon points="50,46 58,54 54,54 54,64 46,64 46,54 42,54" fill="#DDD6FE" />
    </svg>
  );
};

/**
 * 6. VÍNCULO COGNITIVO (ZOE)
 * Chispa de inteligencia artificial 3D y núcleo holográfico.
 */
export const VinculoCognitivoBadge: React.FC<BadgeGraphicProps> = ({ size = 96, className = '', isUnlocked = true }) => {
  const gradId = `grad-zoe-${Math.random().toString(36).substr(2, 5)}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={{ filter: isUnlocked ? 'drop-shadow(0 0 8px rgba(39,220,255,0.6))' : 'grayscale(100%) opacity(0.35)' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#80E9FF" />
          <stop offset="50%" stopColor="#27DCFF" />
          <stop offset="100%" stopColor="#0369A1" />
        </linearGradient>
      </defs>

      {/* Esfera de Resonancia */}
      <circle cx="50" cy="50" r="45" fill="#04222B" stroke={`url(#${gradId})`} strokeWidth="3" />
      <ellipse cx="50" cy="50" rx="44" ry="20" fill="none" stroke="#27DCFF" strokeWidth="1" opacity="0.4" transform="rotate(30 50 50)" />
      <ellipse cx="50" cy="50" rx="44" ry="20" fill="none" stroke="#27DCFF" strokeWidth="1" opacity="0.4" transform="rotate(-30 50 50)" />

      {/* Estrella Holográfica de ZOE */}
      <path d="M50,18 C50,34 34,50 18,50 C34,50 50,66 50,82 C50,66 66,50 82,50 C66,50 50,34 50,18 Z" fill={`url(#${gradId})`} />
      <circle cx="50" cy="50" r="5" fill="#FFFFFF" />
    </svg>
  );
};

/**
 * 7. MAESTRO INNOVADOR 360
 * Gran Corona de Oro Neón con el Sol de InnovaHub360 y Laureles.
 */
export const MaestroInnovador360Badge: React.FC<BadgeGraphicProps> = ({ size = 96, className = '', isUnlocked = true }) => {
  const gradId = `grad-maestro-${Math.random().toString(36).substr(2, 5)}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      style={{ filter: isUnlocked ? 'drop-shadow(0 0 12px rgba(255,215,0,0.7))' : 'grayscale(100%) opacity(0.35)' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF275" />
          <stop offset="35%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#B38600" />
        </linearGradient>
      </defs>

      {/* Corona / Estrella de 12 Puntas */}
      <circle cx="50" cy="50" r="45" fill="#04222B" stroke={`url(#${gradId})`} strokeWidth="3.5" />
      <circle cx="50" cy="50" r="39" fill="none" stroke="#FFD700" strokeWidth="1" opacity="0.6" strokeDasharray="3 2" />

      {/* Corona Real Imperial */}
      <path d="M25,66 L25,44 L38,55 L50,30 L62,55 L75,44 L75,66 Z" fill={`url(#${gradId})`} />
      <rect x="25" y="66" width="50" height="8" rx="2" fill="#D4AF37" stroke="#FFF275" strokeWidth="1" />

      {/* Gemas en la Corona */}
      <circle cx="25" cy="42" r="3" fill="#5EC2DD" />
      <circle cx="50" cy="27" r="4" fill="#E024A5" />
      <circle cx="75" cy="42" r="3" fill="#A8C63C" />
      <circle cx="38" cy="70" r="2" fill="#FF4500" />
      <circle cx="50" cy="70" r="2.5" fill="#27DCFF" />
      <circle cx="62" cy="70" r="2" fill="#32CD32" />
    </svg>
  );
};

/**
 * Renderizador de insignia vectorial según su ID.
 */
export const BadgeGraphicRenderer: React.FC<{ badgeId: string; size?: number; className?: string; isUnlocked?: boolean }> = ({
  badgeId,
  size = 96,
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
 */
export const RankEmblem: React.FC<{ level: number; size?: number; className?: string }> = ({
  level,
  size = 80,
  className = '',
}) => {
  if (level === 1) {
    // Nivel 1: Observador Regional (Cian)
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
        <polygon points="50,10 88,32 88,68 50,90 12,68 12,32" fill="#04222B" stroke="#5EC2DD" strokeWidth="3" />
        <circle cx="50" cy="50" r="20" fill="none" stroke="#5EC2DD" strokeWidth="2" strokeDasharray="4 2" />
        <circle cx="50" cy="50" r="7" fill="#5EC2DD" />
      </svg>
    );
  }
  if (level === 2) {
    // Nivel 2: Explorador de Desafíos (Verde)
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
        <polygon points="50,8 90,50 50,92 10,50" fill="#04222B" stroke="#A8C63C" strokeWidth="3.5" />
        <polygon points="50,22 78,50 50,78 22,50" fill="none" stroke="#A8C63C" strokeWidth="1.5" opacity="0.6" />
        <circle cx="50" cy="50" r="9" fill="#A8C63C" />
      </svg>
    );
  }
  if (level === 3) {
    // Nivel 3: Arquitecto Territorial (Ámbar)
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
        <polygon points="50,6 88,28 88,72 50,94 12,72 12,28" fill="#04222B" stroke="#F29F05" strokeWidth="3.5" />
        <polygon points="50,16 80,34 80,66 50,84 20,66 20,34" fill="#F29F05" opacity="0.2" />
        <polygon points="50,26 70,38 70,62 50,74 30,62 30,38" fill="#F29F05" />
      </svg>
    );
  }
  // Nivel 4: Líder de Innovación 360 (Oro)
  return <MaestroInnovador360Badge size={size} className={className} isUnlocked={true} />;
};
