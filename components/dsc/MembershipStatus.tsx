import { Platform, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fonts, radii } from '@/lib/theme';
import {
  MEMBERSHIP,
  deriveMembershipState,
  formatUntil,
} from '@/lib/membership';
import type { Profile } from '@/types/db';
import { Button } from './Button';
import { Card } from './Card';
import { Text } from './Text';

type Tier =
  | 'guest'
  | 'pending'
  | 'approved'
  | 'paid'
  | 'admin';

/**
 * Membership status card for Profile + Home tabs.
 *
 * Shows base + each addon, with Activate CTAs on items not yet active.
 * For pre-approval states (guest, pending, rejected) we render a single
 * status banner instead.
 */
export function MembershipStatus({
  profile,
  variant = 'full',
}: {
  profile: Profile | null | undefined;
  variant?: 'full' | 'compact';
}) {
  const tier: Tier =
    profile?.role === 'admin'
      ? 'admin'
      : profile?.status === 'paid'
        ? 'paid'
        : profile?.status === 'approved'
          ? 'approved'
          : profile?.status === 'pending'
            ? 'pending'
            : 'guest';

  const membership = deriveMembershipState(profile);
  const compact = variant === 'compact';

  if (tier === 'guest' || tier === 'pending') {
    return (
      <Card variant="raised">
        <Text variant="eyebrow" tone="terracotta">
          {tier === 'pending' ? 'Application In Review' : 'Not yet a member'}
        </Text>
        <Text variant="h2" style={{ marginTop: 6 }}>
          {tier === 'pending'
            ? 'We’re reading your application.'
            : 'Apply to get in.'}
        </Text>
        <Text variant="small" tone="muted" style={{ marginTop: 6 }}>
          {tier === 'pending'
            ? 'Founders review every application by hand. We’ll email you the moment a decision is made.'
            : 'Application is free. If approved, base membership is $' +
              MEMBERSHIP.base.annual +
              '/yr.'}
        </Text>
        {tier === 'guest' ? (
          <Button
            label="Start Application"
            size="md"
            fullWidth
            style={{ marginTop: 14 }}
            onPress={() => router.push('/apply')}
          />
        ) : null}
      </Card>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      <Text variant="eyebrow" tone="muted">
        Membership
      </Text>
      <MembershipRow
        active={membership.hasActiveBase || tier === 'admin'}
        title={MEMBERSHIP.base.label}
        priceLine={`$${MEMBERSHIP.base.annual} / year`}
        status={
          tier === 'admin'
            ? 'Founders comp'
            : membership.hasActiveBase
              ? `Renews ${formatUntil(membership.basePaidUntil)}`
              : 'Activate to unlock the full app'
        }
        ctaLabel="Activate Base"
        compact={compact}
      />
      <MembershipRow
        active={membership.hasMarketplaceAddon || tier === 'admin'}
        title={MEMBERSHIP.marketplaceAddon.label}
        priceLine={`$${MEMBERSHIP.marketplaceAddon.annual} / year`}
        status={
          tier === 'admin'
            ? 'Founders comp'
            : membership.hasMarketplaceAddon
              ? `Renews ${formatUntil(membership.marketplaceAddonUntil)}`
              : MEMBERSHIP.marketplaceAddon.blurb
        }
        ctaLabel="Add Marketplace"
        compact={compact}
      />
      <MembershipRow
        active={membership.hasSeasonPass || tier === 'admin'}
        title={MEMBERSHIP.seasonPass.label}
        priceLine={`$${MEMBERSHIP.seasonPass.monthly} / month`}
        status={
          tier === 'admin'
            ? 'Founders comp'
            : membership.hasSeasonPass
              ? `Renews ${formatUntil(membership.seasonPassUntil)}`
              : MEMBERSHIP.seasonPass.blurb
        }
        ctaLabel="Add Season Pass"
        compact={compact}
      />
    </View>
  );
}

function MembershipRow({
  active,
  title,
  priceLine,
  status,
  ctaLabel,
  compact,
}: {
  active: boolean;
  title: string;
  priceLine: string;
  status: string;
  ctaLabel: string;
  compact: boolean;
}) {
  return (
    <View
      style={[
        styles.row,
        {
          borderColor: active ? colors.terracotta : colors.border,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text variant="bodyBold" numberOfLines={1} style={{ flexShrink: 1 }}>
            {title}
          </Text>
          {active ? (
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>ACTIVE</Text>
            </View>
          ) : null}
        </View>
        <Text variant="caption" tone="terracotta" style={{ marginTop: 2 }}>
          {priceLine.toUpperCase()}
        </Text>
        {!compact ? (
          <Text variant="small" tone="muted" style={{ marginTop: 6 }} numberOfLines={3}>
            {status}
          </Text>
        ) : (
          <Text variant="caption" tone="muted" style={{ marginTop: 4 }} numberOfLines={1}>
            {status}
          </Text>
        )}
      </View>
      {!active ? (
        <Button
          label={ctaLabel}
          size="sm"
          variant="secondary"
          onPress={() => {
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
              window.alert(
                'Activation flow ships when Stripe is wired. Founders can grant access via the admin panel for now.',
              );
            }
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    padding: 14,
  },
  activePill: {
    backgroundColor: colors.terracotta,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  activePillText: {
    color: colors.ink,
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 1,
  },
});
