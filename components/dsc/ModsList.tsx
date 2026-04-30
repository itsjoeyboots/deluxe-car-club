import { StyleSheet, View } from 'react-native';
import { colors, fonts } from '@/lib/theme';
import type { Mod, ModCategory } from '@/types/db';
import { Card } from './Card';
import { Text } from './Text';

const CATEGORY_LABEL: Record<ModCategory, string> = {
  engine: 'Engine',
  suspension: 'Suspension',
  exterior: 'Exterior',
  interior: 'Interior',
  wheels: 'Wheels',
  audio: 'Audio',
  other: 'Other',
};

const ORDER: ModCategory[] = [
  'engine',
  'suspension',
  'exterior',
  'interior',
  'wheels',
  'audio',
  'other',
];

export function ModsList({ mods }: { mods: Mod[] }) {
  if (mods.length === 0) {
    return (
      <Card variant="inset">
        <Text variant="small" tone="muted">
          No mods listed yet.
        </Text>
      </Card>
    );
  }

  const grouped: Partial<Record<ModCategory, Mod[]>> = {};
  for (const m of mods) {
    if (!grouped[m.category]) grouped[m.category] = [];
    grouped[m.category]!.push(m);
  }

  return (
    <View style={{ gap: 10 }}>
      {ORDER.filter((c) => grouped[c]?.length).map((c) => (
        <Card key={c}>
          <Text style={styles.eyebrow}>{CATEGORY_LABEL[c]}</Text>
          <View style={{ marginTop: 8, gap: 6 }}>
            {grouped[c]!.map((m) => (
              <View key={m.id} style={styles.row}>
                <View style={styles.bullet} />
                <Text variant="small" style={{ flex: 1 }}>
                  {m.description}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: {
    color: colors.terracotta,
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.terracotta,
    marginTop: 8,
  },
});
