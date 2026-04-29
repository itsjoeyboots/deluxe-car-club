import { View, type ViewProps } from 'react-native';
import { colors, radii, shadow } from '@/lib/theme';

export type CardProps = ViewProps & {
  variant?: 'plain' | 'raised' | 'inset';
  padded?: boolean;
};

export function Card({
  variant = 'plain',
  padded = true,
  style,
  ...rest
}: CardProps) {
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor:
            variant === 'inset' ? colors.sand : colors.surfaceRaised,
          borderRadius: radii.lg,
          borderWidth: variant === 'plain' ? 1 : 0,
          borderColor: colors.border,
          padding: padded ? 18 : 0,
        },
        variant === 'raised' ? shadow.raised : shadow.card,
        style,
      ]}
    />
  );
}
