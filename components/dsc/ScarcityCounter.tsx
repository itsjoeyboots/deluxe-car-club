import { StyleSheet, View } from 'react-native';
import { colors, radii } from '@/lib/theme';
import { Text } from './Text';
import { ProgressBar } from './ProgressBar';

export function ScarcityCounter({
  approved,
  approvedCap,
  paid,
  paidCap,
}: {
  approved: number;
  approvedCap: number;
  paid: number;
  paidCap: number;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text variant="eyebrow" tone="muted">
          Approved
        </Text>
        <Text variant="bodyBold" tone="terracotta">
          {approved} / {approvedCap}
        </Text>
      </View>
      <ProgressBar value={approved} max={approvedCap} tone="terracotta" />
      <View style={[styles.row, { marginTop: 14 }]}>
        <Text variant="eyebrow" tone="muted">
          Paid Spots Filled
        </Text>
        <Text variant="bodyBold" style={{ color: colors.gold }}>
          {paid} / {paidCap}
        </Text>
      </View>
      <ProgressBar value={paid} max={paidCap} tone="gold" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
});
