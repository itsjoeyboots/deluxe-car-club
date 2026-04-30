import { useCallback, useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import {
  Button,
  Card,
  Divider,
  PointsChip,
  Screen,
  Text,
} from '@/components/dsc';
import { useAuth } from '@/lib/auth-context';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { colors, fonts } from '@/lib/theme';
import type { Reward, RewardRedemption } from '@/types/db';

type RedemptionRow = RewardRedemption & {
  reward: Pick<Reward, 'name' | 'point_cost'> | null;
};

export default function RewardsScreen() {
  const { profile, refreshProfile } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const balance = profile?.points_balance ?? 0;
  const isApproved =
    profile?.status === 'approved' || profile?.status === 'paid';

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [r, rr] = await Promise.all([
      supabase
        .from('rewards')
        .select('*')
        .order('point_cost', { ascending: true }),
      profile
        ? supabase
            .from('reward_redemptions')
            .select('*, reward:rewards(name, point_cost)')
            .eq('user_id', profile.id)
            .order('redeemed_at', { ascending: false })
            .limit(10)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (r.data) setRewards(r.data as Reward[]);
    if (rr.data) setRedemptions(rr.data as RedemptionRow[]);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleRedeem(reward: Reward) {
    if (!isApproved) {
      showError('Approval required', 'Only approved members can redeem.');
      return;
    }
    const ok = await confirmAction(
      `Redeem ${reward.name}?`,
      `${reward.point_cost.toLocaleString()} points will be deducted from your balance.`,
    );
    if (!ok) return;

    setBusyId(reward.id);
    const { error } = await supabase.rpc('redeem_reward', {
      reward_id: reward.id,
    });
    setBusyId(null);
    if (error) {
      console.error('[rewards] redeem failed', error);
      showError('Could not redeem', error.message);
      return;
    }
    await refreshProfile();
    await refresh();
    showInfo('Redeemed', `Watch your email — founders ship rewards in batches.`);
  }

  return (
    <Screen contentContainerStyle={{ paddingTop: 24, gap: 18 }}>
      <Stack.Screen options={{ title: 'Rewards', headerShown: true }} />

      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text variant="eyebrow" tone="terracotta">
            Spend it
          </Text>
          <Text variant="display" style={{ marginTop: 4 }}>
            Rewards
          </Text>
        </View>
        <PointsChip points={balance} />
      </View>

      <Text variant="small" tone="muted">
        Earn points at events, on build updates, and through referrals. Redeem
        them for swag, guest passes, and the loud stuff.
      </Text>

      {loading ? (
        <Card variant="inset">
          <Text tone="muted">Loading catalog…</Text>
        </Card>
      ) : (
        <View style={{ gap: 12 }}>
          {rewards.map((r) => {
            const affordable = balance >= r.point_cost;
            return (
              <Card key={r.id} variant="raised">
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyBold">{r.name}</Text>
                    {r.description ? (
                      <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
                        {r.description}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.cost}>
                    <Text style={styles.costNumber}>
                      {r.point_cost.toLocaleString()}
                    </Text>
                    <Text style={styles.costLabel}>PTS</Text>
                  </View>
                </View>
                <Button
                  label={
                    !r.available
                      ? 'Sold out'
                      : busyId === r.id
                        ? 'Redeeming…'
                        : !affordable
                          ? `Need ${(r.point_cost - balance).toLocaleString()} more`
                          : 'Redeem'
                  }
                  fullWidth
                  size="sm"
                  variant={affordable && r.available ? 'primary' : 'secondary'}
                  loading={busyId === r.id}
                  disabled={!affordable || !r.available || busyId !== null}
                  onPress={() => handleRedeem(r)}
                  style={{ marginTop: 12 }}
                />
              </Card>
            );
          })}
        </View>
      )}

      <Divider />

      <View>
        <Text variant="h3">Recent Redemptions</Text>
        {redemptions.length === 0 ? (
          <Card variant="inset" style={{ marginTop: 10 }}>
            <Text variant="small" tone="muted">
              Nothing yet. Your first redemption will show up here.
            </Text>
          </Card>
        ) : (
          <View style={{ gap: 10, marginTop: 10 }}>
            {redemptions.map((row) => (
              <Card key={row.id}>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyBold">
                      {row.reward?.name ?? 'Reward'}
                    </Text>
                    <Text variant="caption" tone="muted">
                      {new Date(row.redeemed_at).toLocaleDateString()} ·{' '}
                      {row.status.toUpperCase()}
                    </Text>
                  </View>
                  <Text variant="bodyBold" tone="terracotta">
                    -{(row.reward?.point_cost ?? 0).toLocaleString()}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

function showError(title: string, message: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

function showInfo(title: string, message: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

async function confirmAction(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return false;
    return window.confirm(`${title}\n\n${message}`);
  }
  return new Promise<boolean>((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Confirm', onPress: () => resolve(true) },
    ]);
  });
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  cost: {
    alignItems: 'flex-end',
  },
  costNumber: {
    color: colors.terracottaDeep,
    fontFamily: fonts.serif,
    fontSize: 22,
    letterSpacing: 0.5,
  },
  costLabel: {
    color: colors.textMuted,
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1.5,
    marginTop: -2,
  },
});
