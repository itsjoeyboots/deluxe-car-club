import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
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

type Audience = 'approved_all' | 'drivers_plus' | 'collector' | 'one';

const AUDIENCES: { key: Audience; label: string; hint: string }[] = [
  {
    key: 'approved_all',
    label: 'All approved',
    hint: 'Approved + paid members.',
  },
  {
    key: 'drivers_plus',
    label: 'Drivers+',
    hint: 'Drivers and Collector tiers.',
  },
  {
    key: 'collector',
    label: 'Collector only',
    hint: 'Top-tier members only.',
  },
  {
    key: 'one',
    label: 'One member',
    hint: 'Pick a specific member below.',
  },
];

type Candidate = {
  id: string;
  full_name: string | null;
  email: string | null;
  app_number: number | null;
  profile_photo_url: string | null;
};

export default function AdminAnnouncementsScreen() {
  const { profile, loading: authLoading } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [audience, setAudience] = useState<Audience>('approved_all');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [members, setMembers] = useState<Candidate[]>([]);
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<Candidate | null>(null);
  const [recipientCount, setRecipientCount] = useState(0);

  useEffect(() => {
    if (!isSupabaseConfigured || !isAdmin) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, app_number, profile_photo_url, status, tier')
        .in('status', ['approved', 'paid'])
        .order('full_name', { ascending: true });
      setMembers((data ?? []) as Candidate[]);
    })();
  }, [isAdmin]);

  useEffect(() => {
    if (!isSupabaseConfigured || !isAdmin) return;
    (async () => {
      const filter = audienceFilter(audience);
      if (audience === 'one') {
        setRecipientCount(picked ? 1 : 0);
        return;
      }
      let q = supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true });
      if (filter.statuses)
        q = q.in('status', filter.statuses as MemberStatus[]);
      if (filter.tiers) q = q.in('tier', filter.tiers as MemberTier[]);
      const { count } = await q;
      setRecipientCount(count ?? 0);
    })();
  }, [audience, picked, isAdmin]);

  const filteredCandidates = useMemo(() => {
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
        <Stack.Screen options={{ title: 'Announcements', headerShown: true }} />
        <Text tone="muted">Loading…</Text>
      </Screen>
    );
  }

  if (!isAdmin) {
    return (
      <Screen contentContainerStyle={{ paddingTop: 24, gap: 16 }}>
        <Stack.Screen options={{ title: 'Announcements', headerShown: true }} />
        <Text variant="display">Admins only.</Text>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  async function send() {
    if (!title.trim()) {
      showError('Missing title', 'Give it a short, clear title.');
      return;
    }
    if (audience === 'one' && !picked) {
      showError('Pick a member', 'Search for someone to send this to.');
      return;
    }
    const ok = await confirmAction(
      `Send to ${recipientCount} member${recipientCount === 1 ? '' : 's'}?`,
      'They’ll see it instantly in their notifications inbox.',
    );
    if (!ok) return;
    setBusy(true);

    let rows: { user_id: string; type: string; title: string; body: string | null }[] = [];
    if (audience === 'one' && picked) {
      rows = [{
        user_id: picked.id,
        type: 'announcement',
        title: title.trim(),
        body: body.trim() || null,
      }];
    } else {
      const filter = audienceFilter(audience);
      let q = supabase.from('profiles').select('id');
      if (filter.statuses) q = q.in('status', filter.statuses as MemberStatus[]);
      if (filter.tiers) q = q.in('tier', filter.tiers as MemberTier[]);
      const { data, error } = await q;
      if (error || !data) {
        setBusy(false);
        showError('Could not load recipients', error?.message ?? 'Unknown');
        return;
      }
      rows = (data as { id: string }[]).map((r) => ({
        user_id: r.id,
        type: 'announcement',
        title: title.trim(),
        body: body.trim() || null,
      }));
    }

    if (rows.length === 0) {
      setBusy(false);
      showError('No recipients', 'No members match this audience.');
      return;
    }

    const { error } = await supabase.from('notifications').insert(rows);
    setBusy(false);
    if (error) {
      showError('Could not send', error.message);
      return;
    }
    setTitle('');
    setBody('');
    setPicked(null);
    Alert.alert('Sent', `Announcement delivered to ${rows.length} member${rows.length === 1 ? '' : 's'}.`);
  }

  return (
    <Screen contentContainerStyle={{ paddingTop: 24, gap: 14 }}>
      <Stack.Screen options={{ title: 'Announcements', headerShown: true }} />

      <View>
        <Text variant="eyebrow" tone="terracotta">
          Founders only
        </Text>
        <Text variant="display" style={{ marginTop: 4 }}>
          Announce
        </Text>
        <Text variant="small" tone="muted" style={{ marginTop: 6 }}>
          Broadcast to a tier or DM-style to one member. Lands in their
          notifications inbox in real time.
        </Text>
      </View>

      <Card variant="raised">
        <Text variant="caption" tone="muted">
          AUDIENCE
        </Text>
        <View style={{ gap: 8, marginTop: 8 }}>
          {AUDIENCES.map((a) => (
            <Pressable
              key={a.key}
              onPress={() => setAudience(a.key)}
              style={({ pressed }) => [
                styles.audienceRow,
                {
                  borderColor:
                    audience === a.key ? colors.terracotta : colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.radio,
                  {
                    borderColor: colors.terracotta,
                    backgroundColor:
                      audience === a.key ? colors.terracotta : 'transparent',
                  },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text variant="bodyBold">{a.label}</Text>
                <Text variant="caption" tone="muted">
                  {a.hint}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {audience === 'one' ? (
          <View style={{ marginTop: 12, gap: 8 }}>
            {picked ? (
              <View style={styles.pickedRow}>
                <Avatar
                  url={picked.profile_photo_url}
                  name={picked.full_name}
                  size="sm"
                />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyBold">{picked.full_name ?? 'Member'}</Text>
                  <Text variant="caption" tone="muted">
                    {picked.email ?? '—'}
                  </Text>
                </View>
                <Button
                  label="Change"
                  variant="ghost"
                  size="sm"
                  onPress={() => setPicked(null)}
                />
              </View>
            ) : (
              <>
                <TextField
                  placeholder="Search by name, email, or app #"
                  value={search}
                  onChangeText={setSearch}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <View style={{ gap: 6 }}>
                  {filteredCandidates.map((m) => (
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
                          {m.email ?? '—'}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </View>
        ) : null}
      </Card>

      <Card variant="raised">
        <Text variant="caption" tone="muted">
          MESSAGE
        </Text>
        <TextField
          placeholder="Title (e.g. Saturday show is moving venues)"
          value={title}
          onChangeText={setTitle}
          style={{ marginTop: 8 }}
        />
        <TextField
          placeholder="Body (optional)"
          value={body}
          onChangeText={setBody}
          multiline
          numberOfLines={4}
          style={{ minHeight: 100, textAlignVertical: 'top', marginTop: 10 }}
        />
      </Card>

      <Text variant="small" tone="muted">
        Will deliver to {recipientCount.toLocaleString()} member
        {recipientCount === 1 ? '' : 's'}. Members can opt out of announcements
        from Edit Profile → Notifications.
      </Text>

      <Button
        label={busy ? 'Sending…' : 'Send Announcement'}
        size="lg"
        fullWidth
        loading={busy}
        onPress={send}
      />
    </Screen>
  );
}

function audienceFilter(a: Audience): {
  statuses?: MemberStatus[];
  tiers?: MemberTier[];
} {
  switch (a) {
    case 'approved_all':
      return { statuses: ['approved', 'paid'] };
    case 'drivers_plus':
      return { statuses: ['paid'], tiers: ['drivers', 'collector'] };
    case 'collector':
      return { statuses: ['paid'], tiers: ['collector'] };
    case 'one':
      return {};
  }
}

async function confirmAction(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return false;
    return window.confirm(`${title}\n\n${message}`);
  }
  return new Promise<boolean>((resolve) => {
    Alert.alert(title, message, [
      { text: 'Keep editing', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Send', onPress: () => resolve(true) },
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
  audienceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radii.md,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  pickedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
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
});
