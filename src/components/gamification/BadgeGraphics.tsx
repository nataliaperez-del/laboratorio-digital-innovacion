import React from 'react';

export interface BadgeGraphicProps {
  size?: number;
  className?: string;
  isUnlocked?: boolean;
}

interface InternalBadgeProps extends BadgeGraphicProps {
  assetName: string;
  title: string;
}

const BaseImageBadge: React.FC<InternalBadgeProps> = ({
  assetName,
  title,
  size = 96,
  className = '',
  isUnlocked = true,
}) => {
  const pngSrc = `/assets/badges/${assetName}.png`;
  const webpSrc = `/assets/badges/${assetName}.webp`;

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
              ? 'drop-shadow(0 0 14px rgba(0, 245, 255, 0.5)) drop-shadow(0 0 6px rgba(180, 255, 43, 0.35))'
              : 'drop-shadow(0 0 6px rgba(0, 245, 255, 0.2)) saturate(0.9) opacity(0.92)',
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
