import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, type ViewStyle } from 'react-native';
import { colors, radii } from '@/lib/theme';

export function Skeleton({
  width,
  height,
  radius = radii.sm,
  style,
}: {
  width?: number | `${number}%` | 'auto';
  height?: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.base,
        {
          width: width ?? '100%',
          height: height ?? 14,
          borderRadius: radius,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonRow() {
  return (
    <View style={styles.row}>
      <Skeleton width={56} height={56} radius={28} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton width={'70%'} height={14} />
        <Skeleton width={'45%'} height={11} />
        <Skeleton width={'30%'} height={11} />
      </View>
    </View>
  );
}

export function SkeletonCard({ height = 180 }: { height?: number }) {
  return (
    <View style={styles.card}>
      <Skeleton width={'100%'} height={height * 0.55} radius={radii.md} />
      <View style={{ gap: 8, marginTop: 12 }}>
        <Skeleton width={'80%'} height={16} />
        <Skeleton width={'50%'} height={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
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
  card: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
});
