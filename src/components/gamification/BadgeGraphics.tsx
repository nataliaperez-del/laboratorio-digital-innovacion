import React from 'react';

/** Insignia a dibujar, tamaño y si está desbloqueada. */
export interface BadgeGraphicProps {
  size?: number;
  className?: string;
  isUnlocked?: boolean;
}

interface InternalBadgeProps extends BadgeGraphicProps {
  assetName: string;
  title: string;
}

/** Colores de cada insignia según su herramienta. */
export const BADGE_UNIT_THEMES: Record<string, { primary: string; glow: string; label: string }> = {
  pionero_territorial: {
    primary: '#10B981', // Verde esmeralda territorial distinguido y sobrio
    glow: 'rgba(16, 185, 129, 0.45)',
    label: 'Estudio Territorial',
  },
  visionario_estrategico: {
    primary: '#F29F05', // Ámbar / Oro cálido de ideación
    glow: 'rgba(242, 159, 5, 0.50)',
    label: 'Ideación Estratégica',
  },
  arquitecto_tendencias: {
    primary: '#00C8FF', // Azul celeste / Cian de árbol de tendencias
    glow: 'rgba(0, 200, 255, 0.50)',
    label: 'Árbol de Innovación',
  },
  ingeniero_prototipos: {
    primary: '#E024A5', // Fucsia prototipado
    glow: 'rgba(224, 36, 165, 0.52)',
    label: 'Prototipado TRL',
  },
  custodio_conocimiento: {
    primary: '#A78BFA', // Púrpura / Violeta banco unificado
    glow: 'rgba(167, 139, 250, 0.50)',
    label: 'Contenedor de resultados',
  },
  vinculo_cognitivo: {
    primary: '#00F5FF', // Cian digital ZOE
    glow: 'rgba(0, 245, 255, 0.50)',
    label: 'Agente ZOE 3D',
  },
  maestro_innovador_360: {
    primary: '#FFD700', // Oro imperial 360
    glow: 'rgba(255, 215, 0, 0.55)',
    label: 'Maestría 360',
  },
};

const BaseImageBadge: React.FC<InternalBadgeProps> = ({ assetName, title, size = 96, className = '', isUnlocked = true }) => {
  const pngSrc = `/assets/badges/${assetName}.png`;
  const webpSrc = `/assets/badges/${assetName}.webp`;
  const theme = BADGE_UNIT_THEMES[assetName] || {
    primary: '#00F5FF',
    glow: 'rgba(0, 245, 255, 0.45)',
    label: 'Innovación',
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 transition-transform ${className}`}
      style={{ width: size, height: size }}
      title={`${title} ${isUnlocked ? '(Desbloqueada)' : '(Bloqueada)'}`}
    >
      <picture className="w-full h-full flex items-center justify-center">
        <source srcSet={webpSrc} type="image/webp" />
        <img
          src={pngSrc}
          alt={title}
          loading="lazy"
          className="w-full h-full object-contain pointer-events-none transition-all duration-300"
          style={{
            filter: isUnlocked
              ? `drop-shadow(0 0 12px ${theme.glow}) drop-shadow(0 0 4px ${theme.primary}60)`
              : 'drop-shadow(0 0 5px rgba(255, 255, 255, 0.12)) saturate(0.85) opacity(0.88)',
          }}
        />
      </picture>
    </div>
  );
};

/**
 * 1. PIONERO TERRITORIAL / NIVEL 1
 */
export const PioneroTerritorialBadge: React.FC<BadgeGraphicProps> = (props) => (
  <BaseImageBadge {...props} assetName="pionero_territorial" title="Pionero Territorial" />
);

/**
 * 2. VISIONARIO ESTRATÉGICO / NIVEL 3
 */
export const VisionarioEstrategicoBadge: React.FC<BadgeGraphicProps> = (props) => (
  <BaseImageBadge {...props} assetName="visionario_estrategico" title="Visionario Estratégico" />
);

/**
 * 3. ARQUITECTO DE TENDENCIAS / NIVEL 4
 */
export const ArquitectoTendenciasBadge: React.FC<BadgeGraphicProps> = (props) => (
  <BaseImageBadge {...props} assetName="arquitecto_tendencias" title="Arquitecto de Tendencias" />
);

/**
 * 4. INGENIERO DE PROTOTIPOS / NIVEL 2
 */
export const IngenieroPrototiposBadge: React.FC<BadgeGraphicProps> = (props) => (
  <BaseImageBadge {...props} assetName="ingeniero_prototipos" title="Ingeniero de Prototipos" />
);

/**
 * 5. CUSTODIO DEL CONOCIMIENTO / BANCO UNIFICADO
 */
export const CustodioConocimientoBadge: React.FC<BadgeGraphicProps> = (props) => (
  <BaseImageBadge {...props} assetName="custodio_conocimiento" title="Custodio del Conocimiento" />
);

/**
 * 6. VÍNCULO COGNITIVO / ZOE 3D AVATAR
 */
export const VinculoCognitivoBadge: React.FC<BadgeGraphicProps> = (props) => (
  <BaseImageBadge {...props} assetName="vinculo_cognitivo" title="Vínculo Cognitivo" />
);

/**
 * 7. MAESTRO INNOVADOR 360 / RANGO MÁXIMO
 */
export const MaestroInnovador360Badge: React.FC<BadgeGraphicProps> = (props) => (
  <BaseImageBadge {...props} assetName="maestro_innovador_360" title="Maestro Innovador 360" />
);

/**
 * Componente unificador BadgeGraphicRenderer
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
export const RankEmblem: React.FC<{ level: number; size?: number; className?: string }> = ({ level, size = 64, className = '' }) => {
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
