import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
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

type AdminApplication = {
  id: string;
  user_id: string;
  primary_car: string | null;
  motivation_text: string | null;
  heard_via: string | null;
  notes: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'waitlisted';
  payment_status: 'pending' | 'paid' | 'refunded' | 'failed';
  created_at: string;
  applicant: {
    full_name: string | null;
    email: string | null;
    city: string | null;
    instagram_handle: string | null;
    phone: string | null;
  } | null;
};

export default function AdminApplicationsScreen() {
  const { profile, loading: authLoading } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [pending, setPending] = useState<AdminApplication[]>([]);
  const [counts, setCounts] = useState<{ approved: number; paid: number }>({
    approved: 0,
    paid: 0,
  });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured || !isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [appsRes, countsRes] = await Promise.all([
      supabase
        .from('applications')
        .select(
          'id, user_id, primary_car, motivation_text, heard_via, notes, status, payment_status, created_at, applicant:profiles!applications_user_id_fkey(full_name,email,city,instagram_handle,phone)',
        )
        .eq('status', 'pending')
        .order('created_at', { ascending: true }),
      supabase.rpc('membership_counts'),
    ]);
    if (!appsRes.error && appsRes.data) {
      setPending(appsRes.data as unknown as AdminApplication[]);
    }
    if (!countsRes.error && countsRes.data) {
      const row = (countsRes.data as { approved_count: number; paid_count: number }[])[0];
      if (row) setCounts({ approved: row.approved_count, paid: row.paid_count });
    }
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (authLoading) {
    return (
      <Screen>
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

  async function approve(id: string) {
    setBusyId(id);
    const { error } = await supabase.rpc('approve_application', { app_id: id });
    setBusyId(null);
    if (error) {
      console.error('[admin] approve failed', error);
      showError('Could not approve', error.message);
      return;
    }
    await refresh();
  }

  async function reject(id: string) {
    const reason = await promptReason();
    if (reason === null) return;
    setBusyId(id);
    const { error } = await supabase.rpc('reject_application', {
      app_id: id,
      reason: reason || null,
    });
    setBusyId(null);
    if (error) {
      console.error('[admin] reject failed', error);
      showError('Could not reject', error.message);
      return;
    }
    await refresh();
  }

  return (
    <Screen contentContainerStyle={{ paddingTop: 24, gap: 18 }}>
      <Stack.Screen options={{ title: 'Applications', headerShown: true }} />

      <View>
        <Text variant="eyebrow" tone="terracotta">
          Founders only
        </Text>
        <Text variant="display" style={{ marginTop: 4 }}>
          Application Queue
        </Text>
      </View>

      <View style={{ gap: 8 }}>
        <ScarcityCounter
          approved={counts.approved}
          approvedCap={MEMBERSHIP.approvedCap}
          paid={counts.paid}
          paidCap={MEMBERSHIP.paidCap}
        />
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button
            label="New Event"
            variant="secondary"
            fullWidth
            onPress={() => router.push('/admin/events/new')}
          />
        </View>
      </View>

      <Divider />

      {loading ? (
        <Text tone="muted">Loading queue…</Text>
      ) : pending.length === 0 ? (
        <Card variant="inset">
          <Text variant="bodyBold">No pending applications.</Text>
          <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
            New applications will appear here as they come in.
          </Text>
        </Card>
      ) : (
        <View style={{ gap: 14 }}>
          {pending.map((app) => (
            <ApplicationCard
              key={app.id}
              app={app}
              busy={busyId === app.id}
              onApprove={() => approve(app.id)}
              onReject={() => reject(app.id)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

function ApplicationCard({
  app,
  busy,
  onApprove,
  onReject,
}: {
  app: AdminApplication;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const submitted = new Date(app.created_at).toLocaleDateString();
  return (
    <Card variant="raised">
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text variant="eyebrow" tone="muted">
            Submitted {submitted}
          </Text>
          <Text variant="h2" style={{ marginTop: 2 }}>
            {app.applicant?.full_name ?? 'Unnamed applicant'}
          </Text>
          <Text variant="small" tone="muted">
            {app.applicant?.city ?? '—'} ·{' '}
            {app.applicant?.email ?? '—'}
          </Text>
        </View>
        <PaymentPill status={app.payment_status} />
      </View>

      <View style={{ marginTop: 12, gap: 6 }}>
        <Field label="Primary car" value={app.primary_car ?? '—'} />
        {app.applicant?.phone ? (
          <Field label="Phone" value={app.applicant.phone} />
        ) : null}
        {app.applicant?.instagram_handle ? (
          <Field label="Instagram" value={`@${app.applicant.instagram_handle}`} />
        ) : null}
        {app.heard_via ? <Field label="Heard via" value={app.heard_via} /> : null}
        {app.notes ? <Field label="Notes" value={app.notes} /> : null}
      </View>

      {app.motivation_text ? (
        <View style={{ marginTop: 10 }}>
          <Text variant="eyebrow" tone="muted">
            Why DCC
          </Text>
          <Text variant="small" style={{ marginTop: 4 }}>
            {app.motivation_text}
          </Text>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <View style={{ flex: 1 }}>
          <Button
            label={busy ? 'Working…' : 'Approve'}
            fullWidth
            loading={busy}
            onPress={onApprove}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Reject"
            variant="danger"
            fullWidth
            onPress={onReject}
            disabled={busy}
          />
        </View>
      </View>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text variant="caption" tone="muted">
        {label.toUpperCase()}
      </Text>
      <Text variant="bodyBold" numberOfLines={2} style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </Text>
    </View>
  );
}

function PaymentPill({ status }: { status: AdminApplication['payment_status'] }) {
  const isPaid = status === 'paid';
  const bg = isPaid ? colors.success : colors.gold;
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={styles.pillText}>
        {isPaid ? 'PAID' : status.toUpperCase()}
      </Text>
    </View>
  );
}

async function promptReason(): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return null;
    const input = window.prompt('Reason for rejection? (optional)');
    return input;
  }
  return new Promise<string | null>((resolve) => {
    Alert.alert(
      'Reject application?',
      'A short note helps us track repeat offenders. Optional.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => resolve(''),
        },
      ],
    );
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  pillText: {
    color: colors.sandLight,
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1,
  },
});
