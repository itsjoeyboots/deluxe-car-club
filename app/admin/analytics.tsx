import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, Stack } from 'expo-router';
import {
  Button,
  Card,
  ScarcityCounter,
  Screen,
  Text,
} from '@/components/dsc';
import { useAuth } from '@/lib/auth-context';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { MEMBERSHIP } from '@/lib/membership';
import { colors, fonts, radii } from '@/lib/theme';

type Analytics = {
  member_total: number;
  member_pending: number;
  member_approved: number;
  member_paid: number;
  member_drivers: number;
  member_collector: number;
  applications_pending: number;
  applications_approved: number;
  applications_rejected: number;
  events_upcoming: number;
  events_past: number;
  rsvps_total: number;
  checkins_total: number;
  build_updates_total: number;
  build_updates_featured: number;
  partners_total: number;
  partners_featured: number;
  partner_suggestions_unreviewed: number;
  points_awarded: number;
  points_spent: number;
  redemptions_pending: number;
  redemptions_fulfilled: number;
};

export default function AdminAnalyticsScreen() {
  const { profile, loading: authLoading } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured || !isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: rows, error: err } = await supabase.rpc('admin_analytics');
    if (err) {
      setError(err.message);
    } else {
      const row = (rows as Analytics[] | null)?.[0] ?? null;
      setData(row);
      setError(null);
    }
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (authLoading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Analytics', headerShown: true }} />
        <Text tone="muted">Loading…</Text>
      </Screen>
    );
  }

  if (!isAdmin) {
    return (
      <Screen contentContainerStyle={{ paddingTop: 24, gap: 16 }}>
        <Stack.Screen options={{ title: 'Analytics', headerShown: true }} />
        <Text variant="display">Admins only.</Text>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={{ paddingTop: 24, gap: 14 }}>
      <Stack.Screen options={{ title: 'Analytics', headerShown: true }} />

      <View>
        <Text variant="eyebrow" tone="terracotta">
          Founders only
        </Text>
        <Text variant="display" style={{ marginTop: 4 }}>
          Analytics
        </Text>
        <Text variant="small" tone="muted" style={{ marginTop: 6 }}>
          Snapshot of the club. Refresh anytime.
        </Text>
      </View>

      <ScarcityCounter
        approved={(data?.member_approved ?? 0) + (data?.member_paid ?? 0)}
        approvedCap={MEMBERSHIP.approvedCap}
        paid={data?.member_paid ?? 0}
        paidCap={MEMBERSHIP.paidCap}
      />

      <Button label={loading ? 'Refreshing…' : 'Refresh'} variant="secondary" onPress={refresh} />

      {error ? (
        <Card variant="inset">
          <Text variant="bodyBold" style={{ color: colors.danger }}>
            Could not load analytics.
          </Text>
          <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
            {error}
          </Text>
        </Card>
      ) : null}

      {data ? (
        <>
          <Group title="Members">
            <View style={styles.grid}>
              <Stat label="Total profiles" value={data.member_total} />
              <Stat label="Pending" value={data.member_pending} accent="gold" />
              <Stat label="Approved (unpaid)" value={data.member_approved} />
              <Stat label="Paid" value={data.member_paid} accent="terracotta" />
              <Stat label="Drivers" value={data.member_drivers} />
              <Stat label="Collector" value={data.member_collector} />
            </View>
          </Group>

          <Group title="Applications">
            <View style={styles.grid}>
              <Stat
                label="Pending review"
                value={data.applications_pending}
                accent="gold"
              />
              <Stat label="Approved" value={data.applications_approved} accent="terracotta" />
              <Stat label="Rejected" value={data.applications_rejected} accent="danger" />
              <Stat
                label="Conversion %"
                value={conversionPct(
                  data.applications_approved,
                  data.applications_approved + data.applications_rejected,
                )}
                suffix="%"
              />
            </View>
          </Group>

          <Group title="Events">
            <View style={styles.grid}>
              <Stat label="Upcoming" value={data.events_upcoming} accent="terracotta" />
              <Stat label="Past" value={data.events_past} />
              <Stat label="Total RSVPs" value={data.rsvps_total} />
              <Stat label="Total check-ins" value={data.checkins_total} />
              <Stat
                label="Show rate %"
                value={conversionPct(data.checkins_total, data.rsvps_total)}
                suffix="%"
              />
            </View>
          </Group>

          <Group title="Builds">
            <View style={styles.grid}>
              <Stat label="Total updates" value={data.build_updates_total} />
              <Stat
                label="Featured"
                value={data.build_updates_featured}
                accent="terracotta"
              />
            </View>
          </Group>

          <Group title="Partners">
            <View style={styles.grid}>
              <Stat label="Partners" value={data.partners_total} />
              <Stat label="Featured" value={data.partners_featured} accent="terracotta" />
              <Stat
                label="Suggestions inbox"
                value={data.partner_suggestions_unreviewed}
                accent="gold"
              />
            </View>
          </Group>

          <Group title="Points">
            <View style={styles.grid}>
              <Stat label="Total awarded" value={data.points_awarded} />
              <Stat label="Total spent" value={data.points_spent} accent="danger" />
              <Stat
                label="In circulation"
                value={data.points_awarded - data.points_spent}
                accent="terracotta"
              />
              <Stat label="Pending redemptions" value={data.redemptions_pending} accent="gold" />
              <Stat label="Fulfilled" value={data.redemptions_fulfilled} />
            </View>
          </Group>
        </>
      ) : null}
    </Screen>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10, marginTop: 6 }}>
      <Text variant="h3" tone="primary">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Stat({
  label,
  value,
  suffix,
  accent,
}: {
  label: string;
  value: number;
  suffix?: string;
  accent?: 'terracotta' | 'gold' | 'danger';
}) {
  const accentColor =
    accent === 'terracotta'
      ? colors.terracotta
      : accent === 'gold'
        ? colors.gold
        : accent === 'danger'
          ? colors.danger
          : colors.textPrimary;
  return (
    <View style={styles.stat}>
      <Text variant="caption" tone="muted">
        {label.toUpperCase()}
      </Text>
      <Text
        style={{
          color: accentColor,
          fontFamily: fonts.serif,
          fontSize: 28,
          lineHeight: 32,
          letterSpacing: 0.5,
          marginTop: 6,
        }}
      >
        {value.toLocaleString()}
        {suffix ?? ''}
      </Text>
    </View>
  );
}

function conversionPct(num: number, denom: number): number {
  if (!denom || denom <= 0) return 0;
  return Math.round((num / denom) * 100);
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  stat: {
    width: '48%',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    minHeight: 90,
  },
});
