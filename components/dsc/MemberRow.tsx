import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fonts, radii } from '@/lib/theme';
import type { DirectoryMember } from '@/hooks/use-members';
import { Avatar } from './Avatar';
import { Text } from './Text';

const tierLabel: Record<string, string> = {
  drivers: 'Drivers',
  collector: 'Collector',
  none: 'Approved',
};

export function MemberRow({ member }: { member: DirectoryMember }) {
  const car = member.primary_car;
  const carLine = car
    ? [car.year, car.make, car.model].filter(Boolean).join(' ')
    : null;
  const number = member.app_number
    ? `#${String(member.app_number).padStart(3, '0')}`
    : null;
  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/u/[id]', params: { id: member.id } })
      }
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.9 : 1 }]}
    >
      <Avatar
        url={member.profile_photo_url}
        name={member.full_name}
        size="lg"
      />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text variant="bodyBold" numberOfLines={1} style={{ flexShrink: 1 }}>
            {member.full_name ?? 'Unnamed'}
          </Text>
          {number ? (
            <Text variant="caption" tone="terracotta">
              {number}
            </Text>
          ) : null}
        </View>
        {carLine ? (
          <Text variant="small" tone="muted" numberOfLines={1}>
            {carLine}
          </Text>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
          {member.city ? (
            <Text variant="caption" tone="muted">
              {member.city.toUpperCase()}
            </Text>
          ) : null}
          <View style={[styles.tier, tierStyle(member.tier)]}>
            <Text style={styles.tierText}>
              {tierLabel[member.tier] ?? 'Approved'}
            </Text>
          </View>
        </View>
      </View>
      <Text style={{ color: colors.textMuted, fontSize: 22 }}>›</Text>
    </Pressable>
  );
}

function tierStyle(tier: string) {
  switch (tier) {
    case 'collector':
      return { backgroundColor: colors.gold };
    case 'drivers':
      return { backgroundColor: colors.terracottaDeep };
    default:
      return { backgroundColor: colors.inkMuted };
  }
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
  tier: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  tierText: {
    color: colors.sandLight,
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
