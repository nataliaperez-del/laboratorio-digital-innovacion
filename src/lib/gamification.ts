import {
  Compass,
  BrainCircuit,
  Trees,
  Rocket,
  FolderArchive,
  Sparkles,
  Award,
  Crown,
  type LucideIcon,
} from 'lucide-react';
import type { AppState } from '@/store/useStore';

export interface BadgeDefinition {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  howToUnlock: string;
  category: 'Estudio' | 'Ideación' | 'Árbol' | 'Prototipado' | 'Banco' | 'ZOE' | 'Maestría';
  color: string;
  icon: LucideIcon;
  xp: number;
}

export const INNOVATION_BADGES: BadgeDefinition[] = [
  {
    id: 'pionero_territorial',
    title: 'Pionero Territorial',
    subtitle: 'Diagnóstico y Caracterización MDVT',
    description: 'Completó un Estudio Territorial caracterizando vocaciones, pilares y matriz FODA.',
    howToUnlock: 'Genera o guarda un Estudio Territorial en el módulo de Estudio.',
    category: 'Estudio',
    color: '#A8C63C',
    icon: Compass,
    xp: 150,
  },
  {
    id: 'visionario_estrategico',
    title: 'Visionario Estratégico',
    subtitle: 'Vocación e Hipótesis de Reto',
    description: 'Formuló la vocación productiva y seleccionó una alternativa estratégica para el territorio.',
    howToUnlock: 'Genera una propuesta de ideación y elige un tema en el taller de Ideación.',
    category: 'Ideación',
    color: '#F29F05',
    icon: BrainCircuit,
    xp: 150,
  },
  {
    id: 'arquitecto_tendencias',
    title: 'Arquitecto de Tendencias',
    subtitle: 'Conexión Global, Nacional y Frutos',
    description: 'Estructuró un Árbol Holográfico de Innovación conectando 10 tendencias mundiales con el territorio.',
    howToUnlock: 'Construye un Árbol de Innovación con ramas globales, nacionales y frutos.',
    category: 'Árbol',
    color: '#5EC2DD',
    icon: Trees,
    xp: 200,
  },
  {
    id: 'ingeniero_prototipos',
    title: 'Ingeniero de Prototipos',
    subtitle: 'Estructuración TRL y Solución Técnica',
    description: 'Diseñó un Plan de Prototipado formal con fases de validación, arquitectura de solución y métricas.',
    howToUnlock: 'Diseña y genera al menos un Plan de Prototipado en el módulo de Prototipado.',
    category: 'Prototipado',
    color: '#E024A5',
    icon: Rocket,
    xp: 200,
  },
  {
    id: 'custodio_conocimiento',
    title: 'Custodio del Conocimiento',
    subtitle: 'Aporte al Banco Unificado',
    description: 'Depositó ejercicios relevantes en el Banco Unificado, fortaleciendo la memoria institucional.',
    howToUnlock: 'Deposita cualquier ejercicio en el Banco Unificado de Innovación.',
    category: 'Banco',
    color: '#A78BFA',
    icon: FolderArchive,
    xp: 100,
  },
  {
    id: 'vinculo_cognitivo',
    title: 'Vínculo Cognitivo',
    subtitle: 'Interacción con ZOE 3D',
    description: 'Activó o consultó estrategias con ZOE, la asistente holográfica del laboratorio.',
    howToUnlock: 'Abre el asistente ZOE e interactúa con su presencia 3D.',
    category: 'ZOE',
    color: '#27DCFF',
    icon: Sparkles,
    xp: 100,
  },
  {
    id: 'maestro_innovador_360',
    title: 'Maestro Innovador 360',
    subtitle: 'Ciclo Integral de Innovación',
    description: 'Completó los 4 ejes fundamentales del laboratorio: Estudio, Ideación, Árbol y Prototipado.',
    howToUnlock: 'Desbloquea las 4 insignias base de las herramientas de innovación.',
    category: 'Maestría',
    color: '#FFD700',
    icon: Crown,
    xp: 500,
  },
];

export interface InnovationRank {
  level: number;
  title: string;
  minXp: number;
  maxXp: number;
  badgeCountGoal: number;
  color: string;
  description: string;
}

export const INNOVATION_RANKS: InnovationRank[] = [
  {
    level: 1,
    title: 'Observador Regional',
    minXp: 0,
    maxXp: 299,
    badgeCountGoal: 1,
    color: '#5EC2DD',
    description: 'Iniciando el recorrido de inteligencia territorial e innovación.',
  },
  {
    level: 2,
    title: 'Explorador de Desafíos',
    minXp: 300,
    maxXp: 599,
    badgeCountGoal: 3,
    color: '#A8C63C',
    description: 'Diagnostica dinámicas y formula enfoques estratégicos con datos.',
  },
  {
    level: 3,
    title: 'Arquitecto Territorial',
    minXp: 600,
    maxXp: 999,
    badgeCountGoal: 5,
    color: '#F29F05',
    description: 'Conecta tendencias de vanguardia y genera planes técnicos aplicables.',
  },
  {
    level: 4,
    title: 'Líder de Innovación 360',
    minXp: 1000,
    maxXp: 1400,
    badgeCountGoal: 7,
    color: '#FFD700',
    description: 'Domina el ciclo integral de transformación regional de InnovaHub360.',
  },
];

export interface GamificationState {
  unlockedBadgeIds: string[];
  totalXp: number;
  currentRank: InnovationRank;
  nextRank: InnovationRank | null;
  progressPercent: number;
}

/**
 * Evalúa el estado del laboratorio y retorna las insignias desbloqueadas y el nivel alcanzado.
 */
export function evaluateGamification(
  state: {
    containerData?: string;
    savedStudies?: Array<unknown>;
    themeProposalMarkdown?: string;
    savedIdeations?: Array<unknown>;
    treeGraph?: unknown;
    savedTrees?: Array<unknown>;
    prototypes?: Array<unknown>;
    zoeInteractions?: number;
  }
): GamificationState {
  const unlocked = new Set<string>();

  // 1. Pionero Territorial
  if ((state.containerData && state.containerData.trim().length > 100) || (state.savedStudies && state.savedStudies.length > 0)) {
    unlocked.add('pionero_territorial');
  }

  // 2. Visionario Estratégico
  if ((state.themeProposalMarkdown && state.themeProposalMarkdown.trim().length > 100) || (state.savedIdeations && state.savedIdeations.length > 0)) {
    unlocked.add('visionario_estrategico');
  }

  // 3. Arquitecto de Tendencias
  if (state.treeGraph || (state.savedTrees && state.savedTrees.length > 0)) {
    unlocked.add('arquitecto_tendencias');
  }

  // 4. Ingeniero de Prototipos
  if (state.prototypes && state.prototypes.length > 0) {
    unlocked.add('ingeniero_prototipos');
  }

  // 5. Custodio del Conocimiento
  const totalSaved =
    (state.savedStudies?.length || 0) +
    (state.savedIdeations?.length || 0) +
    (state.savedTrees?.length || 0) +
    (state.prototypes?.length || 0);
  if (totalSaved > 0) {
    unlocked.add('custodio_conocimiento');
  }

  // 6. Vínculo Cognitivo (ZOE)
  if ((state.zoeInteractions ?? 0) > 0) {
    unlocked.add('vinculo_cognitivo');
  }

  // 7. Maestro Innovador 360 (los 4 ejes fundamentales)
  if (
    unlocked.has('pionero_territorial') &&
    unlocked.has('visionario_estrategico') &&
    unlocked.has('arquitecto_tendencias') &&
    unlocked.has('ingeniero_prototipos')
  ) {
    unlocked.add('maestro_innovador_360');
  }

  const unlockedBadgeIds = Array.from(unlocked);

  // Calcular XP acumulado
  const totalXp = unlockedBadgeIds.reduce((acc, id) => {
    const badge = INNOVATION_BADGES.find((b) => b.id === id);
    return acc + (badge?.xp ?? 0);
  }, 0);

  // Determinar Rango Actual
  let currentRank = INNOVATION_RANKS[0];
  let nextRank: InnovationRank | null = INNOVATION_RANKS[1];

  for (let i = 0; i < INNOVATION_RANKS.length; i++) {
    if (totalXp >= INNOVATION_RANKS[i].minXp) {
      currentRank = INNOVATION_RANKS[i];
      nextRank = INNOVATION_RANKS[i + 1] ?? null;
    }
  }

  // Calcular porcentaje hacia el siguiente rango
  let progressPercent = 100;
  if (nextRank) {
    const range = nextRank.minXp - currentRank.minXp;
    const gained = totalXp - currentRank.minXp;
    progressPercent = Math.min(100, Math.max(0, Math.round((gained / range) * 100)));
  }

  return {
    unlockedBadgeIds,
    totalXp,
    currentRank,
    nextRank,
    progressPercent,
  };
}
