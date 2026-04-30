import { StyleSheet, View } from 'react-native';
import { colors, fonts, radii } from '@/lib/theme';
import { Text } from './Text';

export type Tier = 'guest' | 'pending' | 'approved' | 'drivers' | 'collector' | 'admin';

const tierLabel: Record<Tier, string> = {
  guest: 'Guest',
  pending: 'Pending',
  approved: 'Approved',
  drivers: 'Drivers',
  collector: 'Collector',
  admin: 'Founder',
};

const tierPalette: Record<Tier, { bg: string; fg: string; border: string }> = {
  guest: {
    bg: 'rgba(255, 255, 255, 0.06)',
    fg: colors.textSecondary,
    border: colors.border,
  },
  pending: {
    bg: 'rgba(229, 229, 226, 0.12)',
    fg: colors.gold,
    border: colors.gold,
  },
  approved: {
    bg: 'rgba(34, 211, 218, 0.14)',
    fg: colors.terracotta,
    border: colors.terracotta,
  },
  drivers: {
    bg: colors.terracottaDeep,
    fg: colors.textOnDark,
    border: colors.terracotta,
  },
  collector: {
    bg: colors.ink,
    fg: colors.goldBright,
    border: colors.gold,
  },
  admin: {
    bg: colors.ink,
    fg: colors.goldBright,
    border: colors.goldBright,
  },
};

export function TierBadge({ tier, label }: { tier: Tier; label?: string }) {
  const palette = tierPalette[tier];
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: palette.bg, borderColor: palette.border },
      ]}
    >
      <Text
        style={{
          color: palette.fg,
          fontFamily: fonts.sansBold,
          fontSize: 10,
          letterSpacing: 1.6,
          textTransform: 'uppercase',
        }}
      >
        {label ?? tierLabel[tier]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1.5,
  },
});
