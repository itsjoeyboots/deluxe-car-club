/**
 * Deluxe Car Club — canonical design tokens.
 *
 * Dark luxury automotive palette — matte black surfaces, ivory text,
 * a turquoise glow accent (lifted from the DCC logo) and a metallic
 * silver in place of the old gold. Token names are kept so the rest
 * of the app cascades automatically; the literal English meanings
 * (e.g. "sand", "gold") no longer match — they're aesthetic aliases now.
 *
 * Tailwind config mirrors these names; keep them in sync if you change anything.
 */

export const colors = {
  // Brand primitives (dark theme)
  terracotta: '#22D3DA',       // turquoise — primary accent (logo glow)
  terracottaDeep: '#0EA8B5',   // pressed/hover turquoise
  sand: '#13131A',             // base dark surface (was warm cream)
  sandLight: '#1C1C26',        // raised dark surface (was paler cream)
  ink: '#0B0B0D',              // deepest matte black (page background, fallbacks)
  inkMuted: '#15151B',         // slightly lighter than ink
  gold: '#E5E5E2',             // metallic silver / ivory (was warm gold)
  goldBright: '#7AECEF',       // bright cyan glow (was bright gold)

  // Semantic aliases
  background: '#0B0B0D',
  surface: '#13131A',
  surfaceRaised: '#1C1C26',
  border: 'rgba(255, 255, 255, 0.10)',
  textPrimary: '#F4F4F2',
  textSecondary: '#C9C9C0',
  textMuted: 'rgba(244, 244, 242, 0.55)',
  textOnDark: '#F4F4F2',
  success: '#3FB988',
  danger: '#E94B4B',
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
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 3,
  },
  raised: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

export type ColorToken = keyof typeof colors;
