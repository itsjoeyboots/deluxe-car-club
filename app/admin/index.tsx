import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, Stack } from 'expo-router';
import {
  Button,
  Card,
  Divider,
  ScarcityCounter,
  Screen,
  Text,
} from '@/components/dsc';
import { useAuth } from '@/lib/auth-context';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { MEMBERSHIP } from '@/lib/membership';
import { colors, fonts, radii } from '@/lib/theme';

type ToolHref =
  | '/admin/applications'
  | '/admin/members'
  | '/admin/points'
  | '/admin/builds'
  | '/admin/redemptions'
  | '/admin/partners/suggestions'
  | '/admin/announcements'
  | '/admin/analytics'
  | '/admin/events/new'
  | '/admin/partners/new';

type Tool = {
  href: ToolHref;
  title: string;
  description: string;
  badge?: number;
};

export default function AdminHubScreen() {
  const { profile, loading: authLoading } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [counts, setCounts] = useState<{ approved: number; paid: number }>({
    approved: 0,
    paid: 0,
  });
  const [pendingApps, setPendingApps] = useState(0);
  const [unreviewedSuggestions, setUnreviewedSuggestions] = useState(0);
  const [pendingRedemptions, setPendingRedemptions] = useState(0);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured || !isAdmin) return;
    const [counts, apps, suggestions, redemptions] = await Promise.all([
      supabase.rpc('membership_counts'),
      supabase
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('partner_suggestions')
        .select('id', { count: 'exact', head: true })
        .eq('reviewed', false),
      supabase
        .from('reward_redemptions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
    ]);
    if (!counts.error && counts.data) {
      const row = (counts.data as { approved_count: number; paid_count: number }[])[0];
      if (row) setCounts({ approved: row.approved_count, paid: row.paid_count });
    }
    setPendingApps(apps.count ?? 0);
    setUnreviewedSuggestions(suggestions.count ?? 0);
    setPendingRedemptions(redemptions.count ?? 0);
  }, [isAdmin]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (authLoading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Admin', headerShown: true }} />
        <Text tone="muted">Loading…</Text>
      </Screen>
    );
  }

  if (!isAdmin) {
    return (
      <Screen contentContainerStyle={{ paddingTop: 24, gap: 16 }}>
        <Stack.Screen options={{ title: 'Admin', headerShown: true }} />
        <Text variant="display">Admins only.</Text>
        <Text tone="muted">
          This area is reserved for DCC founders. If you should have access,
          ask another admin to flip your role.
        </Text>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const tools: Tool[] = [
    {
      href: '/admin/applications',
      title: 'Applications',
      description: 'Review and approve pending applications.',
      badge: pendingApps,
    },
    {
      href: '/admin/members',
      title: 'Members',
      description: 'Tier, status, suspend, points history.',
    },
    {
      href: '/admin/points',
      title: 'Points',
      description: 'Manually award or deduct points.',
    },
    {
      href: '/admin/builds',
      title: 'Featured Builds',
      description: 'Pick build updates for the home carousel.',
    },
    {
      href: '/admin/redemptions',
      title: 'Redemptions',
      description: 'Fulfill or cancel reward redemptions.',
      badge: pendingRedemptions,
    },
    {
      href: '/admin/partners/suggestions',
      title: 'Partner Suggestions',
      description: 'Member nominations to triage.',
      badge: unreviewedSuggestions,
    },
    {
      href: '/admin/announcements',
      title: 'Announce',
      description: 'Broadcast to a tier or one member.',
    },
    {
      href: '/admin/analytics',
      title: 'Analytics',
      description: 'Counts, conversion, attendance, points flow.',
    },
  ];

  return (
    <Screen contentContainerStyle={{ paddingTop: 24, gap: 18 }}>
      <Stack.Screen options={{ title: 'Admin', headerShown: true }} />

      <View>
        <Text variant="eyebrow" tone="terracotta">
          Founders only
        </Text>
        <Text variant="display" style={{ marginTop: 4 }}>
          Admin
        </Text>
        <Text variant="small" tone="muted" style={{ marginTop: 6 }}>
          Everything that needs a founder{'’'}s touch lives here.
        </Text>
      </View>

      <ScarcityCounter
        approved={counts.approved}
        approvedCap={MEMBERSHIP.approvedCap}
        paid={counts.paid}
        paidCap={MEMBERSHIP.paidCap}
      />

      <Divider />

      <View style={styles.grid}>
        {tools.map((t) => (
          <ToolTile key={t.href} tool={t} />
        ))}
      </View>

      <Divider />

      <Text variant="h3">Quick actions</Text>
      <View style={{ gap: 10 }}>
        <Button
          label="New Event"
          variant="secondary"
          fullWidth
          onPress={() => router.push('/admin/events/new')}
        />
        <Button
          label="New Partner"
          variant="secondary"
          fullWidth
          onPress={() => router.push('/admin/partners/new')}
        />
      </View>
    </Screen>
  );
}

function ToolTile({ tool }: { tool: Tool }) {
  return (
    <Pressable
      onPress={() => router.push(tool.href)}
      style={({ pressed }) => [styles.tile, { opacity: pressed ? 0.9 : 1 }]}
    >
      <View style={styles.tileHeader}>
        <Text variant="bodyBold" numberOfLines={1} style={{ flex: 1 }}>
          {tool.title}
        </Text>
        {tool.badge && tool.badge > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{tool.badge}</Text>
          </View>
        ) : null}
      </View>
      <Text variant="caption" tone="muted" style={{ marginTop: 6 }}>
        {tool.description}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tile: {
    width: '48%',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    minHeight: 110,
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: colors.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.ink,
    fontFamily: fonts.sansBold,
    fontSize: 11,
  },
});
