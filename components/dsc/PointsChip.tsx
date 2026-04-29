import { StyleSheet, View } from 'react-native';
import { colors, fonts, radii } from '@/lib/theme';
import { Text } from './Text';

export function PointsChip({ points }: { points: number }) {
  return (
    <View style={styles.chip}>
      <View style={styles.dot} />
      <Text
        style={{
          color: colors.goldBright,
          fontFamily: fonts.sansBold,
          fontSize: 13,
          letterSpacing: 0.5,
        }}
      >
        {points.toLocaleString()} pts
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.ink,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.goldBright,
  },
});
