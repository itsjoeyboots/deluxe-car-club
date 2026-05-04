import { useCallback, useEffect, useState } from 'react';
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

type AdminSuggestion = {
  id: string;
  name: string;
  why: string | null;
  contact_info: string | null;
  reviewed: boolean;
  created_at: string;
  suggested_by: string;
  suggester: {
    full_name: string | null;
    profile_photo_url: string | null;
  } | null;
};

type Mode = 'unreviewed' | 'all';

export default function AdminSuggestionsScreen() {
  const { profile, loading: authLoading } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [rows, setRows] = useState<AdminSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('unreviewed');
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured || !isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    let query = supabase
      .from('partner_suggestions')
      .select(
        'id, name, why, contact_info, reviewed, created_at, suggested_by, suggester:profiles!partner_suggestions_suggested_by_fkey(full_name, profile_photo_url)',
      )
      .order('reviewed', { ascending: true })
      .order('created_at', { ascending: false });
    if (mode === 'unreviewed') query = query.eq('reviewed', false);
    const { data, error } = await query;
    if (!error && data) setRows(data as unknown as AdminSuggestion[]);
    setLoading(false);
  }, [isAdmin, mode]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (authLoading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Partner Suggestions', headerShown: true }} />
        <Text tone="muted">Loading…</Text>
      </Screen>
    );
  }

  if (!isAdmin) {
    return (
      <Screen contentContainerStyle={{ paddingTop: 24, gap: 16 }}>
        <Stack.Screen options={{ title: 'Partner Suggestions', headerShown: true }} />
        <Text variant="display">Admins only.</Text>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  async function setReviewed(id: string, value: boolean) {
    setBusyId(id);
    const { error } = await supabase
      .from('partner_suggestions')
      .update({ reviewed: value })
      .eq('id', id);
    setBusyId(null);
    if (error) {
      showError('Could not update', error.message);
      return;
    }
    await refresh();
  }

  return (
    <Screen contentContainerStyle={{ paddingTop: 24, gap: 14 }}>
      <Stack.Screen options={{ title: 'Partner Suggestions', headerShown: true }} />

      <View>
        <Text variant="eyebrow" tone="terracotta">
          Founders only
        </Text>
        <Text variant="display" style={{ marginTop: 4 }}>
          Suggestions
        </Text>
        <Text variant="small" tone="muted" style={{ marginTop: 6 }}>
          Members nominate shops, you triage. Mark reviewed once you{'’'}ve
          decided yes/no.
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['unreviewed', 'all'] as Mode[]).map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            style={({ pressed }) => [
              styles.modePill,
              {
                backgroundColor: mode === m ? colors.terracotta : 'transparent',
                borderColor: mode === m ? colors.terracotta : colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text
              style={{
                color: mode === m ? colors.ink : colors.textSecondary,
                fontFamily: fonts.sansBold,
                fontSize: 12,
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
            >
              {m === 'unreviewed' ? 'Inbox' : 'All'}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ height: StyleSheet.hairlineWidth * 2, backgroundColor: colors.border, marginVertical: 4 }} />

      {loading ? (
        <Text tone="muted">Loading…</Text>
      ) : rows.length === 0 ? (
        <Card variant="inset">
          <Text variant="bodyBold">
            {mode === 'unreviewed' ? 'Inbox zero.' : 'No suggestions yet.'}
          </Text>
          <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
            {mode === 'unreviewed'
              ? 'Switch to All to see triaged suggestions.'
              : 'Approved members can nominate shops from the Marketplace tab.'}
          </Text>
        </Card>
      ) : (
        <View style={{ gap: 12 }}>
          {rows.map((s) => (
            <SuggestionCard
              key={s.id}
              s={s}
              busy={busyId === s.id}
              onMarkReviewed={() => setReviewed(s.id, !s.reviewed)}
              onCreate={() =>
                router.push({
                  pathname: '/admin/partners/new',
                  params: { suggestion: s.id },
                })
              }
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

function SuggestionCard({
  s,
  busy,
  onMarkReviewed,
  onCreate,
}: {
  s: AdminSuggestion;
  busy: boolean;
  onMarkReviewed: () => void;
  onCreate: () => void;
}) {
  const submitted = new Date(s.created_at).toLocaleDateString();
  return (
    <Card variant="raised">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar
          url={s.suggester?.profile_photo_url}
          name={s.suggester?.full_name}
          size="sm"
        />
        <View style={{ flex: 1 }}>
          <Text variant="caption" tone="muted">
            FROM {s.suggester?.full_name?.toUpperCase() ?? 'MEMBER'} · {submitted}
          </Text>
        </View>
        {s.reviewed ? (
          <View style={[styles.statusPill, { backgroundColor: colors.success }]}>
            <Text style={[styles.statusPillText, { color: colors.ink }]}>REVIEWED</Text>
          </View>
        ) : (
          <View style={[styles.statusPill, { backgroundColor: colors.gold }]}>
            <Text style={[styles.statusPillText, { color: colors.ink }]}>NEW</Text>
          </View>
        )}
      </View>

      <Text variant="h2" style={{ marginTop: 12 }}>
        {s.name}
      </Text>

      {s.why ? (
        <View style={{ marginTop: 12 }}>
          <Text variant="caption" tone="muted">
            WHY
          </Text>
          <Text variant="small" style={{ marginTop: 4 }}>
            {s.why}
          </Text>
        </View>
      ) : null}

      {s.contact_info ? (
        <View style={{ marginTop: 10 }}>
          <Text variant="caption" tone="muted">
            CONTACT
          </Text>
          <Text variant="small" style={{ marginTop: 4 }}>
            {s.contact_info}
          </Text>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <View style={{ flex: 1 }}>
          <Button
            label="Create Partner"
            fullWidth
            onPress={onCreate}
            disabled={busy}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label={s.reviewed ? 'Unreview' : 'Mark Reviewed'}
            variant="secondary"
            fullWidth
            loading={busy}
            onPress={onMarkReviewed}
          />
        </View>
      </View>
    </Card>
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
  modePill: {
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
});
