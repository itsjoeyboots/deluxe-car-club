import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, fonts, radii } from '@/lib/theme';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading,
  fullWidth,
  disabled,
  iconLeft,
  iconRight,
  style,
  ...rest
}: ButtonProps) {
  const palette = palettes[variant];
  const sizing = sizes[size];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      {...rest}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          paddingHorizontal: sizing.px,
          paddingVertical: sizing.py,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={palette.fg} size="small" />
        ) : (
          <>
            {iconLeft}
            <Text
              style={{
                color: palette.fg,
                fontFamily: fonts.sansBold,
                fontSize: sizing.fs,
                letterSpacing: 1.2,
                textTransform: 'uppercase',
              }}
            >
              {label}
            </Text>
            {iconRight}
          </>
        )}
      </View>
    </Pressable>
  );
}

const palettes: Record<Variant, { bg: string; fg: string; border: string }> = {
  primary: {
    bg: colors.terracotta, // turquoise glow
    fg: colors.ink,        // dark text on bright accent — crisp contrast
    border: colors.terracotta,
  },
  secondary: {
    bg: 'transparent',
    fg: colors.terracotta,
    border: colors.terracotta,
  },
  ghost: {
    bg: 'transparent',
    fg: colors.terracotta,
    border: 'transparent',
  },
  danger: {
    bg: colors.danger,
    fg: colors.textOnDark,
    border: colors.danger,
  },
};

const sizes: Record<Size, { px: number; py: number; fs: number }> = {
  sm: { px: 14, py: 8, fs: 12 },
  md: { px: 22, py: 12, fs: 13 },
  lg: { px: 28, py: 16, fs: 14 },
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.sm,
    borderWidth: 1.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
