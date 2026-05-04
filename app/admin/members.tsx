import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, Stack } from 'expo-router';
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
import type { MemberStatus, MemberTier } from '@/types/db';

type AdminMember = {
  id: string;
  full_name: string | null;
  email: string | null;
  city: string | null;
  profile_photo_url: string | null;
  app_number: number | null;
  status: MemberStatus;
  tier: MemberTier;
  role: 'member' | 'admin';
  points_balance: number;
  approved_at: string | null;
  paid_since: string | null;
};

type StatusFilter = 'all' | MemberStatus;
type TierFilter = 'all' | MemberTier;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'paid', label: 'Paid' },
  { key: 'rejected', label: 'Rejected' },
];

const TIER_FILTERS: { key: TierFilter; label: string }[] = [
  { key: 'all', label: 'Any tier' },
  { key: 'none', label: 'None' },
  { key: 'drivers', label: 'Drivers' },
  { key: 'collector', label: 'Collector' },
];

export default function AdminMembersScreen() {
  const { profile, loading: authLoading } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [members, setMembers] = useState<AdminMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured || !isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id, full_name, email, city, profile_photo_url, app_number, status, tier, role, points_balance, approved_at, paid_since',
      )
      .order('approved_at', { ascending: false, nullsFirst: false });
    if (!error && data) {
      setMembers(data as AdminMember[]);
    }
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    let out = members;
    if (statusFilter !== 'all') out = out.filter((m) => m.status === statusFilter);
    if (tierFilter !== 'all') out = out.filter((m) => m.tier === tierFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (m) =>
          (m.full_name ?? '').toLowerCase().includes(q) ||
          (m.email ?? '').toLowerCase().includes(q) ||
          (m.city ?? '').toLowerCase().includes(q) ||
          (m.app_number ? String(m.app_number) : '').includes(q),
      );
    }
    return out;
  }, [members, search, statusFilter, tierFilter]);

  if (authLoading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Members', headerShown: true }} />
        <Text tone="muted">Loading…</Text>
      </Screen>
    );
  }

  if (!isAdmin) {
    return (
      <Screen contentContainerStyle={{ paddingTop: 24, gap: 16 }}>
        <Stack.Screen options={{ title: 'Members', headerShown: true }} />
        <Text variant="display">Admins only.</Text>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  async function setTier(id: string, tier: MemberTier) {
    setBusyId(id);
    const patch: { tier: MemberTier; status?: MemberStatus; paid_since?: string | null } = {
      tier,
    };
    if (tier === 'none') {
      patch.paid_since = null;
    } else {
      patch.status = 'paid';
      const target = members.find((m) => m.id === id);
      if (!target?.paid_since) patch.paid_since = new Date().toISOString();
    }
    const { error } = await supabase.from('profiles').update(patch).eq('id', id);
    setBusyId(null);
    if (error) {
      showError('Could not update tier', error.message);
      return;
    }
    await refresh();
  }

  async function setStatus(id: string, status: MemberStatus) {
    setBusyId(id);
    const patch: Partial<AdminMember> = { status };
    if (status === 'rejected') {
      patch.tier = 'none';
      patch.paid_since = null;
    }
    const { error } = await supabase.from('profiles').update(patch).eq('id', id);
    setBusyId(null);
    if (error) {
      showError('Could not update status', error.message);
      return;
    }
    await refresh();
  }

  return (
    <Screen contentContainerStyle={{ paddingTop: 24, gap: 14 }}>
      <Stack.Screen options={{ title: 'Members', headerShown: true }} />

      <View>
        <Text variant="eyebrow" tone="terracotta">
          Founders only
        </Text>
        <Text variant="display" style={{ marginTop: 4 }}>
          Members
        </Text>
        <Text variant="small" tone="muted" style={{ marginTop: 6 }}>
          {filtered.length} shown · {members.length} total
        </Text>
      </View>

      <TextField
        placeholder="Search by name, email, city, or app #"
        value={search}
        onChangeText={setSearch}
        autoCorrect={false}
      />

      <View style={{ gap: 8 }}>
        <Text variant="caption" tone="muted">
          STATUS
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillRow}
        >
          {STATUS_FILTERS.map((f) => (
            <FilterPill
              key={f.key}
              label={f.label}
              active={statusFilter === f.key}
              onPress={() => setStatusFilter(f.key)}
            />
          ))}
        </ScrollView>
        <Text variant="caption" tone="muted" style={{ marginTop: 6 }}>
          TIER
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillRow}
        >
          {TIER_FILTERS.map((f) => (
            <FilterPill
              key={f.key}
              label={f.label}
              active={tierFilter === f.key}
              onPress={() => setTierFilter(f.key)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={{ height: StyleSheet.hairlineWidth * 2, backgroundColor: colors.border, marginVertical: 4 }} />

      {loading ? (
        <Text tone="muted">Loading…</Text>
      ) : filtered.length === 0 ? (
        <Card variant="inset">
          <Text variant="bodyBold">No members match.</Text>
          <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
            Adjust the filters or search term.
          </Text>
        </Card>
      ) : (
        <View style={{ gap: 12 }}>
          {filtered.map((m) => (
            <MemberAdminCard
              key={m.id}
              member={m}
              busy={busyId === m.id}
              onSetTier={(t) => setTier(m.id, t)}
              onSetStatus={(s) => setStatus(m.id, s)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

function MemberAdminCard({
  member,
  busy,
  onSetTier,
  onSetStatus,
}: {
  member: AdminMember;
  busy: boolean;
  onSetTier: (tier: MemberTier) => void;
  onSetStatus: (status: MemberStatus) => void;
}) {
  const number = member.app_number
    ? `#${String(member.app_number).padStart(3, '0')}`
    : null;
  const isSuspended = member.status === 'rejected';

  return (
    <Card variant="raised">
      <Pressable
        onPress={() =>
          router.push({ pathname: '/u/[id]', params: { id: member.id } })
        }
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
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
            {member.role === 'admin' ? (
              <View style={[styles.miniPill, { backgroundColor: colors.gold }]}>
                <Text style={styles.miniPillText}>FOUNDER</Text>
              </View>
            ) : null}
          </View>
          {member.email ? (
            <Text variant="small" tone="muted" numberOfLines={1}>
              {member.email}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            <StatusPill status={member.status} />
            <TierPill tier={member.tier} />
            <View style={[styles.miniPill, { backgroundColor: colors.inkMuted }]}>
              <Text style={styles.miniPillText}>{member.points_balance.toLocaleString()} PTS</Text>
            </View>
          </View>
        </View>
      </Pressable>

      <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 14 }} />

      <Text variant="caption" tone="muted">
        SET TIER
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
        {(['none', 'drivers', 'collector'] as MemberTier[]).map((t) => (
          <Button
            key={t}
            label={t === 'none' ? 'No tier' : t === 'drivers' ? 'Drivers' : 'Collector'}
            size="sm"
            variant={member.tier === t ? 'primary' : 'secondary'}
            onPress={() => onSetTier(t)}
            disabled={busy}
          />
        ))}
      </View>

      <Text variant="caption" tone="muted" style={{ marginTop: 12 }}>
        STATUS
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
        <Button
          label="Approve"
          size="sm"
          variant={member.status === 'approved' ? 'primary' : 'secondary'}
          onPress={() => onSetStatus('approved')}
          disabled={busy || member.status === 'paid'}
        />
        <Button
          label={isSuspended ? 'Suspended' : 'Suspend'}
          size="sm"
          variant={isSuspended ? 'primary' : 'danger'}
          onPress={() => onSetStatus('rejected')}
          disabled={busy}
        />
      </View>

      <View style={{ marginTop: 12 }}>
        <Button
          label="Adjust Points"
          size="sm"
          variant="secondary"
          fullWidth
          onPress={() =>
            router.push({
              pathname: '/admin/points',
              params: { user: member.id },
            })
          }
        />
      </View>
    </Card>
  );
}

function FilterPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterPill,
        {
          backgroundColor: active ? colors.terracotta : 'transparent',
          borderColor: active ? colors.terracotta : colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: active ? colors.ink : colors.textSecondary,
          fontFamily: fonts.sansBold,
          fontSize: 12,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function StatusPill({ status }: { status: MemberStatus }) {
  const palette: Record<MemberStatus, { bg: string; fg: string }> = {
    guest: { bg: colors.inkMuted, fg: colors.textSecondary },
    pending: { bg: colors.gold, fg: colors.ink },
    approved: { bg: colors.terracottaDeep, fg: colors.textOnDark },
    paid: { bg: colors.terracotta, fg: colors.ink },
    rejected: { bg: colors.danger, fg: colors.textOnDark },
  };
  const p = palette[status];
  return (
    <View style={[styles.miniPill, { backgroundColor: p.bg }]}>
      <Text style={[styles.miniPillText, { color: p.fg }]}>{status.toUpperCase()}</Text>
    </View>
  );
}

function TierPill({ tier }: { tier: MemberTier }) {
  if (tier === 'none') {
    return (
      <View style={[styles.miniPill, { backgroundColor: colors.inkMuted }]}>
        <Text style={styles.miniPillText}>NO TIER</Text>
      </View>
    );
  }
  const bg = tier === 'collector' ? colors.gold : colors.terracottaDeep;
  const fg = tier === 'collector' ? colors.ink : colors.textOnDark;
  return (
    <View style={[styles.miniPill, { backgroundColor: bg }]}>
      <Text style={[styles.miniPillText, { color: fg }]}>{tier.toUpperCase()}</Text>
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
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1.5,
  },
  miniPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  miniPillText: {
    color: colors.sandLight,
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
