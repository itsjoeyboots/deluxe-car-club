import { Text as RNText, type TextProps, StyleSheet } from 'react-native';
import { colors, fonts } from '@/lib/theme';

type Variant =
  | 'displayLg'
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'eyebrow'
  | 'body'
  | 'bodyBold'
  | 'small'
  | 'caption';

type Tone = 'primary' | 'secondary' | 'muted' | 'terracotta' | 'gold' | 'onDark';

export type DSCTextProps = TextProps & {
  variant?: Variant;
  tone?: Tone;
};

const toneToColor: Record<Tone, string> = {
  primary: colors.textPrimary,
  secondary: colors.textSecondary,
  muted: colors.textMuted,
  terracotta: colors.terracottaDeep,
  gold: colors.gold,
  onDark: colors.textOnDark,
};

export function Text({
  variant = 'body',
  tone = 'primary',
  style,
  ...rest
}: DSCTextProps) {
  return (
    <RNText
      {...rest}
      style={[styles[variant], { color: toneToColor[tone] }, style]}
    />
  );
}

const styles = StyleSheet.create({
  displayLg: {
    fontFamily: fonts.serif,
    fontSize: 44,
    lineHeight: 50,
    letterSpacing: 1,
  },
  display: {
    fontFamily: fonts.serif,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: 0.8,
  },
  h1: {
    fontFamily: fonts.serif,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: 0.5,
  },
  h2: {
    fontFamily: fonts.serif,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: 0.3,
  },
  h3: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  eyebrow: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22,
  },
  bodyBold: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    lineHeight: 22,
  },
  small: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  caption: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.4,
  },
});
