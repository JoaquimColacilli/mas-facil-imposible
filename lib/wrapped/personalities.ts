import type { WrappedPersonalityId } from '@/lib/types'

export interface WrappedPersonality {
  id: WrappedPersonalityId
  label: string
  emoji: string
  desc: string
  /** Short stat shown under the description (e.g. "23% ahorrado"). */
  micro: string
  /** Gradient stops used across slide 9, slide 10 and the share card. */
  g1: string
  g2: string
}

export const PERSONALITIES: Record<WrappedPersonalityId, WrappedPersonality> = {
  ahorrista: {
    id: 'ahorrista',
    label: 'EL AHORRISTA',
    emoji: '🌱',
    desc: 'Apartaste más del 20% de tus ingresos. Disciplina nivel pro.',
    micro: '',
    g1: 'oklch(0.55 0.13 155)',
    g2: 'oklch(0.48 0.11 230)',
  },
  inversor: {
    id: 'inversor',
    label: 'EL INVERSOR',
    emoji: '📈',
    desc: 'Más de la mitad de lo que apartaste fue a trabajar por vos.',
    micro: '',
    g1: 'oklch(0.55 0.14 295)',
    g2: 'oklch(0.55 0.10 65)',
  },
  social: {
    id: 'social',
    label: 'EL SOCIAL',
    emoji: '🥂',
    desc: 'Salidas, delivery y planes. Viviste el mes — y está bien.',
    micro: '',
    g1: 'oklch(0.60 0.14 15)',
    g2: 'oklch(0.60 0.11 65)',
  },
  equilibrado: {
    id: 'equilibrado',
    label: 'EL EQUILIBRADO',
    emoji: '⚖️',
    desc: 'Ni te privaste ni te pasaste. Mantuviste el pulso.',
    micro: 'balance 50/30/20',
    g1: 'oklch(0.55 0.10 155)',
    g2: 'oklch(0.55 0.13 230)',
  },
  austero: {
    id: 'austero',
    label: 'EL AUSTERO',
    emoji: '🗝️',
    desc: 'Gastaste menos que nunca. Pocas salidas, muchos ahorros.',
    micro: '',
    g1: 'oklch(0.45 0.08 260)',
    g2: 'oklch(0.55 0.10 155)',
  },
}

/**
 * Map wrapped personality to the community category the generated post lands on.
 * Social / Equilibrado / Austero default to "ahorros" — the feed category that
 * best matches a retrospective recap without inventing a new category.
 */
export const PERSONALITY_COMMUNITY_CATEGORY: Record<
  WrappedPersonalityId,
  'ahorros' | 'inversiones'
> = {
  ahorrista: 'ahorros',
  inversor: 'inversiones',
  social: 'ahorros',
  equilibrado: 'ahorros',
  austero: 'ahorros',
}
