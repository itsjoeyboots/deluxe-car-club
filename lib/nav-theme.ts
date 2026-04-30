import type { Theme } from '@react-navigation/native';
import { colors } from './theme';

export const dccNavTheme: Theme = {
  dark: true,
  colors: {
    primary: colors.terracotta,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.terracotta,
  },
  fonts: {
    regular: { fontFamily: 'Inter_400Regular', fontWeight: '400' },
    medium: { fontFamily: 'Inter_500Medium', fontWeight: '500' },
    bold: { fontFamily: 'Inter_700Bold', fontWeight: '700' },
    heavy: { fontFamily: 'PlayfairDisplay_700Bold', fontWeight: '700' },
  },
};
