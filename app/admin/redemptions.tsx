import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { router, Stack } from 'expo-router';
import {
  Avatar,
  Button,
  Card,
  Screen,
  Text,
} from '@/components/dsc';
import { useAuth } from '@/lib/auth-context';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { colors, fonts, radii } from '@/lib/theme';
import type { RedemptionStatus } from '@/types/db';

type AdminRedemption = {
  id: string;
  status: RedemptionStatus;
  redeemed_at: string;
  user_id: string;
  reward_id: string;
  user: {
    id: string;
    full_name: string | null;
    profile_photo_url: string | null;
    app_number: number | null;
    email: string | null;
  } | null;
  reward: {
    id: string;
    name: string;
    point_cost: number;
  } | null;
};

const FILTERS: { key: RedemptionStatus | 'all'; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'fulfilled', label: 'Fulfilled' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'all', label: 'All' },
];

export default function AdminRedemptionsScreen() {
  const { profile, loading: authLoading } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [rows, setRows] = useState<AdminRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RedemptionStatus | 'all'>('pending');
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured || !isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let query = supabase
      .from('reward_redemptions')
      .select(
        'id, status, redeemed_at, user_id, reward_id, user:profiles!reward_redemptions_user_id_fkey(id, full_name, profile_photo_url, app_number, email), reward:rewards!reward_redemptions_reward_id_fkey(id, name, point_cost)',
      )
      .order('redeemed_at', { ascending: false })
      .limit(200);
    if (filter !== 'all') query = query.eq('status', filter);
    const { data, error } = await query;
    if (!error && data) setRows(data as unknown as AdminRedemption[]);
    setLoading(false);
  }, [isAdmin, filter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const counts = useMemo(() => {
    let pending = 0;
    let fulfilled = 0;
    let cancelled = 0;
    for (const r of rows) {
      if (r.status === 'pending') pending += 1;
      else if (r.status === 'fulfilled') fulfilled += 1;
      else if (r.status === 'cancelled') cancelled += 1;
    }
    return { pending, fulfilled, cancelled };
  }, [rows]);

  if (authLoading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Redemptions', headerShown: true }} />
        <Text tone="muted">Loading…</Text>
      </Screen>
    );
  }

  if (!isAdmin) {
    return (
      <Screen contentContainerStyle={{ paddingTop: 24, gap: 16 }}>
        <Stack.Screen options={{ title: 'Redemptions', headerShown: true }} />
        <Text variant="display">Admins only.</Text>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  async function setStatus(id: string, status: RedemptionStatus, refundPoints?: number, userId?: string) {
    setBusyId(id);
    const { error } = await supabase
      .from('reward_redemptions')
      .update({ status })
      .eq('id', id);
    if (error) {
      setBusyId(null);
      showError('Could not update', error.message);
      return;
    }
    if (status === 'cancelled' && refundPoints && refundPoints > 0 && userId) {
      const { error: refundErr } = await supabase
        .from('points_transactions')
        .insert({
          user_id: userId,
          amount: refundPoints,
          reason: 'redemption_refund',
        });
      if (refundErr) {
        setBusyId(null);
        showError(
          'Status updated, but refund failed',
          refundErr.message + '\n\nGrant the points manually from /admin/points.',
        );
        await refresh();
        return;
      }
    }
    setBusyId(null);
    await refresh();
  }

  async function handleCancel(row: AdminRedemption) {
    if (!row.user || !row.reward) return;
    const ok = await confirmAction(
      'Cancel redemption?',
      `Refund ${row.reward.point_cost.toLocaleString()} pts to ${row.user.full_name ?? 'member'}?`,
    );
    if (!ok) return;
    await setStatus(row.id, 'cancelled', row.reward.point_cost, row.user.id);
  }

  return (
    <Screen contentContainerStyle={{ paddingTop: 24, gap: 14 }}>
      <Stack.Screen options={{ title: 'Redemptions', headerShown: true }} />

      <View>
        <Text variant="eyebrow" tone="terracotta">
          Founders only
        </Text>
        <Text variant="display" style={{ marginTop: 4 }}>
          Redemptions
        </Text>
        <Text variant="small" tone="muted" style={{ marginTop: 6 }}>
          Fulfill or cancel reward redemptions. Cancelling refunds the points.
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={({ pressed }) => [
              styles.filterPill,
              {
                backgroundColor: filter === f.key ? colors.terracotta : 'transparent',
                borderColor: filter === f.key ? colors.terracotta : colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text
              style={{
                color: filter === f.key ? colors.ink : colors.textSecondary,
                fontFamily: fonts.sansBold,
                fontSize: 12,
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <CountChip label="Pending" value={counts.pending} accent="gold" />
        <CountChip label="Fulfilled" value={counts.fulfilled} accent="terracotta" />
        <CountChip label="Cancelled" value={counts.cancelled} accent="muted" />
      </View>

      <View style={{ height: StyleSheet.hairlineWidth * 2, backgroundColor: colors.border, marginVertical: 4 }} />

      {loading ? (
        <Text tone="muted">Loading…</Text>
      ) : rows.length === 0 ? (
        <Card variant="inset">
          <Text variant="bodyBold">
            {filter === 'pending' ? 'Inbox zero.' : 'No redemptions.'}
          </Text>
          <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
            {filter === 'pending'
              ? 'When members redeem rewards, they land here pending fulfillment.'
              : 'Try a different filter.'}
          </Text>
        </Card>
      ) : (
        <View style={{ gap: 12 }}>
          {rows.map((r) => (
            <RedemptionCard
              key={r.id}
              row={r}
              busy={busyId === r.id}
              onFulfill={() => setStatus(r.id, 'fulfilled')}
              onCancel={() => handleCancel(r)}
              onUnreview={() => setStatus(r.id, 'pending')}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

function RedemptionCard({
  row,
  busy,
  onFulfill,
  onCancel,
  onUnreview,
}: {
  row: AdminRedemption;
  busy: boolean;
  onFulfill: () => void;
  onCancel: () => void;
  onUnreview: () => void;
}) {
  const submitted = new Date(row.redeemed_at).toLocaleDateString();
  const userName = row.user?.full_name ?? 'Member';
  const number = row.user?.app_number
    ? `#${String(row.user.app_number).padStart(3, '0')}`
    : null;
  return (
    <Card variant="raised">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable
          onPress={() =>
            row.user
              ? router.push({ pathname: '/u/[id]', params: { id: row.user.id } })
              : null
          }
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}
        >
          <Avatar
            url={row.user?.profile_photo_url}
            name={userName}
            size="md"
          />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text variant="bodyBold" numberOfLines={1} style={{ flexShrink: 1 }}>
                {userName}
              </Text>
              {number ? (
                <Text variant="caption" tone="terracotta">
                  {number}
                </Text>
              ) : null}
            </View>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {submitted} · {row.user?.email ?? '—'}
            </Text>
          </View>
        </Pressable>
        <StatusPill status={row.status} />
      </View>

      <View style={{ marginTop: 12 }}>
        <Text variant="caption" tone="muted">
          REWARD
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 4 }}>
          <Text variant="h2" style={{ flex: 1 }} numberOfLines={2}>
            {row.reward?.name ?? 'Unknown reward'}
          </Text>
          <Text variant="bodyBold" tone="terracotta">
            {row.reward?.point_cost.toLocaleString()} pts
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        {row.status === 'pending' ? (
          <>
            <View style={{ flex: 1 }}>
              <Button
                label="Fulfill"
                fullWidth
                loading={busy}
                onPress={onFulfill}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label="Cancel & Refund"
                variant="danger"
                fullWidth
                onPress={onCancel}
                disabled={busy}
              />
            </View>
          </>
        ) : (
          <View style={{ flex: 1 }}>
            <Button
              label="Reopen"
              variant="secondary"
              fullWidth
              loading={busy}
              onPress={onUnreview}
            />
          </View>
        )}
      </View>
    </Card>
  );
}

function StatusPill({ status }: { status: RedemptionStatus }) {
  const palette: Record<RedemptionStatus, { bg: string; fg: string; label: string }> = {
    pending: { bg: colors.gold, fg: colors.ink, label: 'PENDING' },
    fulfilled: { bg: colors.terracotta, fg: colors.ink, label: 'FULFILLED' },
    cancelled: { bg: colors.danger, fg: colors.textOnDark, label: 'CANCELLED' },
  };
  const p = palette[status];
  return (
    <View style={[styles.statusPill, { backgroundColor: p.bg }]}>
      <Text style={[styles.statusPillText, { color: p.fg }]}>{p.label}</Text>
    </View>
  );
}

function CountChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: 'terracotta' | 'gold' | 'muted';
}) {
  const fg =
    accent === 'terracotta'
      ? colors.terracotta
      : accent === 'gold'
        ? colors.gold
        : colors.textMuted;
  return (
    <View style={styles.countChip}>
      <Text variant="caption" tone="muted">
        {label.toUpperCase()}
      </Text>
      <Text style={{ fontFamily: fonts.sansBold, fontSize: 18, color: fg, marginTop: 2 }}>
        {value.toLocaleString()}
      </Text>
    </View>
  );
}

async function confirmAction(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return false;
    return window.confirm(`${title}\n\n${message}`);
  }
  return new Promise<boolean>((resolve) => {
    Alert.alert(title, message, [
      { text: 'Keep', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Confirm', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

function showError(title: string, message: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

const styles = StyleSheet.create({
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1.5,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  statusPillText: {
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1,
  },
  countChip: {
    flex: 1,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
  },
});
