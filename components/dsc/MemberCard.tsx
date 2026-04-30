import { StyleSheet, View } from 'react-native';
import { colors, fonts, radii } from '@/lib/theme';
import type { Profile } from '@/types/db';
import { QRCode } from './QRCode';
import { Text } from './Text';
import { TierBadge, type Tier } from './TierBadge';

export function MemberCard({
  profile,
  tier,
}: {
  profile: Profile;
  tier: Tier;
}) {
  const number = profile.app_number
    ? `#${String(profile.app_number).padStart(3, '0')}`
    : 'PENDING';

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>Deluxe Car Club</Text>
          <Text style={styles.number}>{number}</Text>
        </View>
        <TierBadge tier={tier} />
      </View>

      <View style={{ marginTop: 14 }}>
        <QRCode value={profile.member_qr_token} size={200} />
      </View>

      <View style={{ marginTop: 14 }}>
        <Text style={styles.name} numberOfLines={1}>
          {profile.full_name ?? 'Member'}
        </Text>
        {profile.city ? (
          <Text style={styles.city} numberOfLines={1}>
            {profile.city}
          </Text>
        ) : null}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Show this card at partner shops & member events.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.gold,
    padding: 18,
    shadowColor: colors.ink,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eyebrow: {
    color: colors.terracottaDeep,
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  number: {
    color: colors.ink,
    fontFamily: fonts.serif,
    fontSize: 28,
    letterSpacing: 1,
    marginTop: 4,
  },
  name: {
    color: colors.ink,
    fontFamily: fonts.serif,
    fontSize: 22,
    letterSpacing: 0.4,
  },
  city: {
    color: colors.textMuted,
    fontFamily: fonts.sans,
    fontSize: 13,
    marginTop: 2,
  },
  footer: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  footerText: {
    color: colors.textMuted,
    fontFamily: fonts.sans,
    fontSize: 11,
    fontStyle: 'italic',
  },
});
