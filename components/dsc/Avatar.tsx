import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { colors, fonts } from '@/lib/theme';
import { Text } from './Text';

type Size = 'sm' | 'md' | 'lg' | 'xl';

const sizeMap: Record<Size, { box: number; font: number }> = {
  sm: { box: 32, font: 12 },
  md: { box: 48, font: 16 },
  lg: { box: 72, font: 22 },
  xl: { box: 112, font: 36 },
};

function initialsOf(name?: string | null): string {
  if (!name) return '·';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '·';
}

export function Avatar({
  url,
  name,
  size = 'md',
}: {
  url?: string | null;
  name?: string | null;
  size?: Size;
}) {
  const dim = sizeMap[size];
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{
          width: dim.box,
          height: dim.box,
          borderRadius: dim.box / 2,
          borderWidth: 2,
          borderColor: colors.gold,
        }}
        contentFit="cover"
        transition={120}
      />
    );
  }
  return (
    <View
      style={[
        styles.fallback,
        {
          width: dim.box,
          height: dim.box,
          borderRadius: dim.box / 2,
        },
      ]}
    >
      <Text
        style={{
          color: colors.goldBright,
          fontFamily: fonts.serif,
          fontSize: dim.font,
          letterSpacing: 1.5,
        }}
      >
        {initialsOf(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.ink,
    borderWidth: 2,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
