import { StyleSheet, View } from 'react-native';
import { colors, radii } from '@/lib/theme';

export function ProgressBar({
  value,
  max,
  tone = 'terracotta',
}: {
  value: number;
  max: number;
  tone?: 'terracotta' | 'gold';
}) {
  const pct = Math.max(0, Math.min(1, max === 0 ? 0 : value / max));
  const fill = tone === 'gold' ? colors.gold : colors.terracotta;
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: fill }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
  },
});
