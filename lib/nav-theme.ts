import type { Theme } from '@react-navigation/native';
import { colors } from './theme';

export const dscNavTheme: Theme = {
  dark: false,
  colors: {
    primary: colors.terracotta,
    background: colors.sand,
    card: colors.sandLight,
    text: colors.ink,
    border: 'rgba(28, 16, 8, 0.10)',
    notification: colors.gold,
  },
  fonts: {
    regular: { fontFamily: 'Inter_400Regular', fontWeight: '400' },
    medium: { fontFamily: 'Inter_500Medium', fontWeight: '500' },
    bold: { fontFamily: 'Inter_700Bold', fontWeight: '700' },
    heavy: { fontFamily: 'PlayfairDisplay_700Bold', fontWeight: '700' },
  },
};
