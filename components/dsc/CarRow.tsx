import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { colors, radii } from '@/lib/theme';
import type { Car } from '@/types/db';
import { Text } from './Text';

type CarRowProps = {
  car: Car & { cover_url?: string | null };
};

export function CarRow({ car }: CarRowProps) {
  const title = [car.year, car.make, car.model].filter(Boolean).join(' ');
  return (
    <Pressable
      onPress={() => router.push(`/cars/${car.id}`)}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.85 : 1 }]}
    >
      {car.cover_url ? (
        <Image
          source={{ uri: car.cover_url }}
          style={styles.cover}
          contentFit="cover"
          transition={120}
        />
      ) : (
        <View style={styles.placeholder}>
          <Text variant="caption" tone="onDark">
            {(car.make ?? '?').slice(0, 1).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text variant="bodyBold" numberOfLines={1}>
            {title || 'Untitled car'}
          </Text>
          {car.is_primary ? (
            <View style={styles.primaryDot}>
              <Text variant="caption" tone="onDark">
                PRIMARY
              </Text>
            </View>
          ) : null}
        </View>
        {car.nickname ? (
          <Text variant="small" tone="muted">
            “{car.nickname}”
          </Text>
        ) : null}
        <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
          {car.status === 'complete' ? 'Build complete' : 'Build in progress'}
        </Text>
      </View>
      <Text style={{ color: colors.textMuted, fontSize: 22 }}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  cover: {
    width: 72,
    height: 56,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: colors.ink,
  },
  placeholder: {
    width: 72,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gold,
  },
  primaryDot: {
    backgroundColor: colors.terracottaDeep,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
});
