import { View, StyleSheet } from 'react-native';
import {
  Button,
  Card,
  Divider,
  PointsChip,
  ScarcityCounter,
  Screen,
  Text,
  TierBadge,
  type Tier,
} from '@/components/dsc';
import { useAuth } from '@/lib/auth-context';
import { MEMBERSHIP } from '@/lib/membership';

export default function HomeScreen() {
  const { profile, session } = useAuth();

  const displayName =
    profile?.full_name?.split(' ')[0] ??
    session?.user.email?.split('@')[0] ??
    'Member';

  const tier: Tier = mapTier(
    profile?.status,
    profile?.tier,
    profile?.role,
  );
  const points = profile?.points_balance ?? 0;

  return (
    <Screen contentContainerStyle={{ paddingTop: 24, gap: 20 }}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text variant="eyebrow" tone="terracotta">
            Desert Social Club
          </Text>
          <Text variant="display" style={{ marginTop: 4 }}>
            Hey {displayName}.
          </Text>
        </View>
        <TierBadge tier={tier} />
      </View>

      <Card variant="raised">
        <View style={styles.spaceBetween}>
          <Text variant="eyebrow" tone="muted">
            Your Points
          </Text>
          <PointsChip points={points} />
        </View>
        <Text variant="display" style={{ marginTop: 8 }}>
          {points.toLocaleString()}
        </Text>
        <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
          {nextRewardLine(points)}
        </Text>
      </Card>

      <View style={{ gap: 8 }}>
        <Text variant="eyebrow" tone="muted">
          Spots in the club
        </Text>
        <ScarcityCounter
          approved={0}
          approvedCap={MEMBERSHIP.approvedCap}
          paid={0}
          paidCap={MEMBERSHIP.paidCap}
        />
        <Text variant="caption" tone="muted">
          Counts will go live once the database is connected.
        </Text>
      </View>

      {tier === 'guest' || tier === 'pending' ? (
        <Card>
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
              : `One-time $${MEMBERSHIP.applicationFeeUsd} application fee, non-refundable. Covers your welcome kit and review.`}
          </Text>
          {tier === 'guest' ? (
            <Button
              label="Start Application"
              size="md"
              fullWidth
              style={{ marginTop: 14 }}
              onPress={() => {
                // Wired up in Phase 3
              }}
            />
          ) : null}
        </Card>
      ) : null}

      <Divider tone="gold" />

      <Section title="Upcoming Events">
        <Card variant="inset">
          <Text variant="small" tone="muted">
            No events on the books yet. Check back after the founders post the
            spring rally schedule.
          </Text>
        </Card>
      </Section>

      <Section title="Featured Builds">
        <Card variant="inset">
          <Text variant="small" tone="muted">
            Member builds will rotate through here. Add your car from the
            Profile tab to be eligible.
          </Text>
        </Card>
      </Section>

      <Section title="Partner Deals">
        <Card variant="inset">
          <Text variant="small" tone="muted">
            DSC partner shops, discounts, and tour days will live here.
          </Text>
        </Card>
      </Section>

      <View style={{ alignItems: 'center', paddingTop: 12 }}>
        <Text variant="caption" tone="muted">
          Built in the East Valley · {new Date().getFullYear()}
        </Text>
      </View>
    </Screen>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 10 }}>
      <Text variant="h3" tone="primary">
        {title}
      </Text>
      {children}
    </View>
  );
}

function mapTier(status?: string, tier?: string, role?: string): Tier {
  if (role === 'admin') return 'admin';
  if (status === 'paid' && tier === 'collector') return 'collector';
  if (status === 'paid' && tier === 'drivers') return 'drivers';
  if (status === 'approved') return 'approved';
  if (status === 'pending') return 'pending';
  return 'guest';
}

function nextRewardLine(points: number): string {
  const tiers = [
    { cost: 500, name: 'Sticker Pack' },
    { cost: 1500, name: 'Branded Tee' },
    { cost: 3000, name: 'Hat or Hoodie' },
    { cost: 5000, name: 'Free Guest Pass' },
    { cost: 10000, name: 'Free Month' },
    { cost: 25000, name: 'Featured Build' },
    { cost: 50000, name: 'Free Annual Renewal' },
  ];
  const next = tiers.find((t) => t.cost > points);
  if (!next) return 'Top of the rewards ladder. Talk to the founders.';
  const remaining = next.cost - points;
  return `${remaining.toLocaleString()} pts to ${next.name}`;
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  spaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
