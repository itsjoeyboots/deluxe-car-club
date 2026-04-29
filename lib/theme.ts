/**
 * Desert Social Club — canonical design tokens.
 * Tailwind config mirrors these names; keep them in sync if you change anything.
 */

export const colors = {
  terracotta: '#C4622D',
  terracottaDeep: '#8B3A1B',
  sand: '#F5E6C8',
  sandLight: '#FAF0DC',
  ink: '#1C1008',
  inkMuted: '#2A2418',
  gold: '#C8982A',
  goldBright: '#E8C060',

  // Semantic aliases
  background: '#F5E6C8',
  surface: '#FAF0DC',
  surfaceRaised: '#FFFFFF',
  border: 'rgba(28, 16, 8, 0.12)',
  textPrimary: '#1C1008',
  textSecondary: '#2A2418',
  textMuted: 'rgba(28, 16, 8, 0.55)',
  textOnDark: '#F5E6C8',
  success: '#3D7A4F',
  danger: '#A8321F',
} as const;

export const fonts = {
  serif: 'PlayfairDisplay_700Bold',
  serifRegular: 'PlayfairDisplay_400Regular',
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansBold: 'Inter_700Bold',
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const shadow = {
  card: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  raised: {
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

export type ColorToken = keyof typeof colors;
