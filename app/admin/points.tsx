import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  Avatar,
  Button,
  Card,
  Screen,
  Text,
  TextField,
} from '@/components/dsc';
import { useAuth } from '@/lib/auth-context';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { colors, fonts, radii } from '@/lib/theme';

type Candidate = {
  id: string;
  full_name: string | null;
  email: string | null;
  app_number: number | null;
  profile_photo_url: string | null;
  points_balance: number;
};

type Recent = {
  id: string;
  amount: number;
  reason: string;
  created_at: string;
  user_id: string;
  user: { full_name: string | null } | null;
};

const QUICK_AMOUNTS = [50, 100, 250, 500, 1000];

export default function AdminPointsScreen() {
  const { profile, loading: authLoading } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const params = useLocalSearchParams<{ user?: string }>();
  const prefilledUser = typeof params.user === 'string' ? params.user : null;

  const [members, setMembers] = useState<Candidate[]>([]);
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<Candidate | null>(null);
  const [amountText, setAmountText] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<Recent[]>([]);

  const loadMembers = useCallback(async () => {
    if (!isSupabaseConfigured || !isAdmin) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, app_number, profile_photo_url, points_balance')
      .in('status', ['approved', 'paid'])
      .order('full_name', { ascending: true });
    if (!error && data) setMembers(data as Candidate[]);
  }, [isAdmin]);

  const loadRecent = useCallback(async () => {
    if (!isSupabaseConfigured || !isAdmin) return;
    const { data, error } = await supabase
      .from('points_transactions')
      .select(
        'id, amount, reason, created_at, user_id, user:profiles!points_transactions_user_id_fkey(full_name)',
      )
      .like('reason', 'manual_grant%')
      .order('created_at', { ascending: false })
      .limit(20);
    if (!error && data) setRecent(data as unknown as Recent[]);
  }, [isAdmin]);

  useEffect(() => {
    loadMembers();
    loadRecent();
  }, [loadMembers, loadRecent]);

  useEffect(() => {
    if (!prefilledUser || picked || members.length === 0) return;
    const found = members.find((m) => m.id === prefilledUser);
    if (found) setPicked(found);
  }, [prefilledUser, members, picked]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members.slice(0, 8);
    return members
      .filter(
        (m) =>
          (m.full_name ?? '').toLowerCase().includes(q) ||
          (m.email ?? '').toLowerCase().includes(q) ||
          String(m.app_number ?? '').includes(q),
      )
      .slice(0, 8);
  }, [members, search]);

  if (authLoading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Points', headerShown: true }} />
        <Text tone="muted">Loading…</Text>
      </Screen>
    );
  }

  if (!isAdmin) {
    return (
      <Screen contentContainerStyle={{ paddingTop: 24, gap: 16 }}>
        <Stack.Screen options={{ title: 'Points', headerShown: true }} />
        <Text variant="display">Admins only.</Text>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  async function submit(direction: 'add' | 'deduct') {
    if (!picked) {
      showError('Pick a member', 'Search and select a member first.');
      return;
    }
    const raw = parseInt(amountText.trim(), 10);
    if (!Number.isFinite(raw) || raw <= 0) {
      showError('Amount required', 'Enter a positive whole number.');
      return;
    }
    const amount = direction === 'add' ? raw : -raw;
    const trimmedReason = reason.trim();
    const reasonLabel = trimmedReason
      ? `manual_grant: ${trimmedReason}`
      : 'manual_grant';

    setBusy(true);
    const { error } = await supabase.from('points_transactions').insert({
      user_id: picked.id,
      amount,
      reason: reasonLabel,
    });
    setBusy(false);
    if (error) {
      showError('Could not record points', error.message);
      return;
    }
    setAmountText('');
    setReason('');
    await Promise.all([loadMembers(), loadRecent()]);
    const refreshed = (await supabase
      .from('profiles')
      .select('id, full_name, email, app_number, profile_photo_url, points_balance')
      .eq('id', picked.id)
      .maybeSingle()) as { data: Candidate | null };
    if (refreshed.data) setPicked(refreshed.data);
    if (Platform.OS === 'web') {
      // no-op, the balance card update is the feedback
    } else {
      Alert.alert(
        direction === 'add' ? 'Points awarded' : 'Points deducted',
        `${Math.abs(amount).toLocaleString()} pts ${direction === 'add' ? 'to' : 'from'} ${picked.full_name ?? 'member'}.`,
      );
    }
  }

  return (
    <Screen contentContainerStyle={{ paddingTop: 24, gap: 14 }}>
      <Stack.Screen options={{ title: 'Points', headerShown: true }} />

      <View>
        <Text variant="eyebrow" tone="terracotta">
          Founders only
        </Text>
        <Text variant="display" style={{ marginTop: 4 }}>
          Adjust Points
        </Text>
        <Text variant="small" tone="muted" style={{ marginTop: 6 }}>
          Award or deduct points with a short reason. Goes to the points ledger.
        </Text>
      </View>

      <Card variant="raised">
        <Text variant="caption" tone="muted">
          MEMBER
        </Text>
        {picked ? (
          <View style={styles.pickedRow}>
            <Avatar
              url={picked.profile_photo_url}
              name={picked.full_name}
              size="md"
            />
            <View style={{ flex: 1 }}>
              <Text variant="bodyBold" numberOfLines={1}>
                {picked.full_name ?? 'Unnamed'}
              </Text>
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {picked.email ?? '—'}
              </Text>
              <Text variant="small" tone="terracotta" style={{ marginTop: 2 }}>
                Balance: {picked.points_balance.toLocaleString()} pts
              </Text>
            </View>
            <Button
              label="Change"
              size="sm"
              variant="ghost"
              onPress={() => setPicked(null)}
            />
          </View>
        ) : (
          <View style={{ marginTop: 8, gap: 8 }}>
            <TextField
              placeholder="Search by name, email, or app #"
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              autoCapitalize="none"
            />
            <View style={{ gap: 6 }}>
              {filtered.map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => setPicked(m)}
                  style={({ pressed }) => [
                    styles.candidate,
                    { opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Avatar
                    url={m.profile_photo_url}
                    name={m.full_name}
                    size="sm"
                  />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyBold" numberOfLines={1}>
                      {m.full_name ?? 'Unnamed'}
                    </Text>
                    <Text variant="caption" tone="muted" numberOfLines={1}>
                      {m.app_number
                        ? `#${String(m.app_number).padStart(3, '0')} · `
                        : ''}
                      {m.points_balance.toLocaleString()} pts
                    </Text>
                  </View>
                </Pressable>
              ))}
              {filtered.length === 0 ? (
                <Text variant="small" tone="muted" style={{ paddingVertical: 6 }}>
                  No matching members.
                </Text>
              ) : null}
            </View>
          </View>
        )}
      </Card>

      <Card variant="raised">
        <Text variant="caption" tone="muted">
          AMOUNT
        </Text>
        <TextField
          placeholder="e.g. 250"
          keyboardType="number-pad"
          value={amountText}
          onChangeText={(t) => setAmountText(t.replace(/[^0-9]/g, ''))}
          style={{ marginTop: 6 }}
        />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          {QUICK_AMOUNTS.map((q) => (
            <Pressable
              key={q}
              onPress={() => setAmountText(String(q))}
              style={({ pressed }) => [
                styles.quickPill,
                { opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.quickPillText}>+{q.toLocaleString()}</Text>
            </Pressable>
          ))}
        </View>

        <Text variant="caption" tone="muted" style={{ marginTop: 14 }}>
          REASON (OPTIONAL)
        </Text>
        <TextField
          placeholder="e.g. Show MVP — Saturday cars & coffee"
          value={reason}
          onChangeText={setReason}
          style={{ marginTop: 6 }}
        />

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <View style={{ flex: 1 }}>
            <Button
              label={busy ? 'Working…' : 'Award'}
              fullWidth
              loading={busy}
              onPress={() => submit('add')}
              disabled={!picked || !amountText}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="Deduct"
              variant="danger"
              fullWidth
              onPress={() => submit('deduct')}
              disabled={!picked || !amountText || busy}
            />
          </View>
        </View>
      </Card>

      <Text variant="h3" style={{ marginTop: 4 }}>
        Recent manual adjustments
      </Text>
      {recent.length === 0 ? (
        <Card variant="inset">
          <Text variant="small" tone="muted">
            No manual grants yet.
          </Text>
        </Card>
      ) : (
        <View style={{ gap: 8 }}>
          {recent.map((r) => (
            <RecentRow key={r.id} row={r} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function RecentRow({ row }: { row: Recent }) {
  const sign = row.amount >= 0 ? '+' : '−';
  const cleanReason = row.reason.replace(/^manual_grant:?\s?/, '') || 'Manual grant';
  return (
    <View style={styles.recentRow}>
      <View style={{ flex: 1 }}>
        <Text variant="bodyBold" numberOfLines={1}>
          {row.user?.full_name ?? 'Member'}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {cleanReason} · {new Date(row.created_at).toLocaleDateString()}
        </Text>
      </View>
      <Text
        variant="bodyBold"
        style={{
          color: row.amount >= 0 ? colors.terracotta : colors.danger,
        }}
      >
        {sign}
        {Math.abs(row.amount).toLocaleString()}
      </Text>
    </View>
  );
}

function showError(title: string, message: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

const styles = StyleSheet.create({
  pickedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  candidate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.terracotta,
    backgroundColor: 'transparent',
  },
  quickPillText: {
    color: colors.terracotta,
    fontFamily: fonts.sansBold,
    fontSize: 12,
    letterSpacing: 1,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 10,
  },
});
