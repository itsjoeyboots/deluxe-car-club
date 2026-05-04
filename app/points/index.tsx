import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import {
  Card,
  Divider,
  PointsChip,
  Screen,
  Text,
} from '@/components/dsc';
import { useAuth } from '@/lib/auth-context';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { colors, fonts } from '@/lib/theme';
import type { PointsTransaction } from '@/types/db';

export default function PointsHistoryScreen() {
  const { profile } = useAuth();
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured || !profile?.id) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from('points_transactions')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(200);
      if (!active) return;
      if (!error && data) setTransactions(data as PointsTransaction[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [profile?.id]);

  const lifetime = transactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <Screen contentContainerStyle={{ paddingTop: 24, gap: 18 }}>
      <Stack.Screen options={{ title: 'Points History', headerShown: true }} />

      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text variant="eyebrow" tone="terracotta">
            Ledger
          </Text>
          <Text variant="display" style={{ marginTop: 4 }}>
            Points History
          </Text>
        </View>
        <PointsChip points={profile?.points_balance ?? 0} />
      </View>

      <Card variant="inset">
        <View style={styles.summary}>
          <View>
            <Text variant="caption" tone="muted">
              CURRENT BALANCE
            </Text>
            <Text variant="h2" style={{ marginTop: 2 }}>
              {(profile?.points_balance ?? 0).toLocaleString()}
            </Text>
          </View>
          <View>
            <Text variant="caption" tone="muted">
              LIFETIME (RECENT 200)
            </Text>
            <Text variant="h2" style={{ marginTop: 2 }}>
              {lifetime >= 0 ? '+' : ''}
              {lifetime.toLocaleString()}
            </Text>
          </View>
        </View>
      </Card>

      <Divider />

      {loading ? (
        <Text tone="muted">Loading…</Text>
      ) : transactions.length === 0 ? (
        <Card variant="inset">
          <Text variant="bodyBold">No transactions yet.</Text>
          <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
            Show up to a meet and you{'’'}ll see your first +100 here.
          </Text>
        </Card>
      ) : (
        <View style={{ gap: 10 }}>
          {transactions.map((t) => (
            <TxRow key={t.id} tx={t} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function TxRow({ tx }: { tx: PointsTransaction }) {
  const positive = tx.amount >= 0;
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text variant="bodyBold">{humanizeReason(tx.reason)}</Text>
        <Text variant="caption" tone="muted">
          {new Date(tx.created_at).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          })}
        </Text>
      </View>
      <Text
        style={[
          styles.amount,
          { color: positive ? colors.success : colors.danger },
        ]}
      >
        {positive ? '+' : ''}
        {tx.amount.toLocaleString()}
      </Text>
    </View>
  );
}

function humanizeReason(reason: string): string {
  const map: Record<string, string> = {
    event_checkin: 'Event check-in',
    event_checkin_first: 'First-event bonus',
    annual_renewal: 'Annual renewal',
    anniversary: 'Anniversary bonus',
    invite_approved: 'Referral approved',
    invite_upgraded: 'Referral upgraded',
    build_update: 'Build update',
    redemption_refund: 'Redemption refunded',
  };
  if (map[reason]) return map[reason];
  if (reason.startsWith('reward_redemption: ')) {
    return `Redeemed: ${reason.slice('reward_redemption: '.length)}`;
  }
  if (reason === 'manual_grant') return 'Manual grant';
  if (reason.startsWith('manual_grant: ')) {
    return `Manual grant — ${reason.slice('manual_grant: '.length)}`;
  }
  return reason
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  amount: {
    fontFamily: fonts.serif,
    fontSize: 22,
    letterSpacing: 0.5,
  },
});
