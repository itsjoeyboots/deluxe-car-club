import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { router } from 'expo-router';
import {
  AchievementsGrid,
  Avatar,
  Button,
  Card,
  CarRow,
  Divider,
  MemberCard,
  PointsChip,
  Screen,
  Text,
  TierBadge,
  type Tier,
} from '@/components/dsc';
import { useAuth } from '@/lib/auth-context';
import { useMyCars } from '@/hooks/use-my-cars';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { AchievementKey } from '@/lib/achievements';
import { colors } from '@/lib/theme';

export default function ProfileScreen() {
  const { profile, session, signOut } = useAuth();
  const { cars, loading: carsLoading } = useMyCars();
  const [unlocked, setUnlocked] = useState<Set<AchievementKey>>(new Set());

  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured || !profile?.id) return;
    (async () => {
      const { data } = await supabase
        .from('achievements')
        .select('achievement_key')
        .eq('user_id', profile.id);
      if (!active) return;
      setUnlocked(
        new Set(((data ?? []) as { achievement_key: AchievementKey }[]).map((r) => r.achievement_key)),
      );
    })();
    return () => {
      active = false;
    };
  }, [profile?.id, profile?.points_balance]);

  const tier: Tier = mapTier(profile?.status, profile?.tier, profile?.role);
  const fullName = profile?.full_name ?? '—';
  const email = profile?.email ?? session?.user.email ?? '—';
  const appNumber = profile?.app_number;

  function confirmSignOut() {
    Alert.alert('Sign out?', 'You can come back any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  }

  return (
    <Screen contentContainerStyle={{ paddingTop: 24, gap: 18 }}>
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}
      >
        <Avatar
          url={profile?.profile_photo_url}
          name={profile?.full_name}
          size="lg"
        />
        <View style={{ flex: 1 }}>
          <Text variant="eyebrow" tone="terracotta">
            Member Card
          </Text>
          <Text variant="h1" numberOfLines={1} style={{ marginTop: 2 }}>
            {fullName}
          </Text>
        </View>
      </View>

      <Card variant="raised">
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <TierBadge tier={tier} />
          <PointsChip points={profile?.points_balance ?? 0} />
        </View>
        <Row label="Email" value={email} />
        {appNumber ? (
          <Row
            label="Member #"
            value={`#${String(appNumber).padStart(3, '0')}`}
          />
        ) : null}
        {profile?.city ? <Row label="City" value={profile.city} /> : null}
        {profile?.instagram_handle ? (
          <Row label="Instagram" value={`@${profile.instagram_handle}`} />
        ) : null}
        {profile?.approved_at ? (
          <Row
            label="Approved"
            value={new Date(profile.approved_at).toLocaleDateString()}
          />
        ) : null}
        <Button
          label="Edit Profile"
          variant="secondary"
          fullWidth
          style={{ marginTop: 14 }}
          onPress={() => router.push('/profile/edit')}
        />
      </Card>

      {profile && (profile.status === 'approved' || profile.status === 'paid') ? (
        <MemberCard profile={profile} tier={tier} />
      ) : null}

      <View style={{ gap: 10 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text variant="h3">Garage</Text>
          <Button
            label="Add Car"
            size="sm"
            variant="secondary"
            onPress={() => router.push('/cars/new')}
          />
        </View>

        {carsLoading ? (
          <Card variant="inset">
            <Text variant="small" tone="muted">
              Loading your garage…
            </Text>
          </Card>
        ) : cars.length === 0 ? (
          <Card variant="inset">
            <Text variant="bodyBold">No cars yet.</Text>
            <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
              Add your daily, weekend, or project car. Your primary car shows
              up across DCC.
            </Text>
          </Card>
        ) : (
          <View style={{ gap: 10 }}>
            {cars.map((car) => (
              <CarRow key={car.id} car={car} />
            ))}
          </View>
        )}
      </View>

      <Divider />

      {profile && (profile.status === 'approved' || profile.status === 'paid') ? (
        <AchievementsGrid unlockedKeys={unlocked} />
      ) : null}

      <Divider />

      {profile?.role === 'admin' ? (
        <Button
          label="Open Admin"
          variant="primary"
          fullWidth
          onPress={() => router.push('/admin')}
        />
      ) : null}

      {profile?.status === 'pending' ? (
        <Card variant="inset">
          <Text variant="eyebrow" tone="terracotta">
            Application Pending
          </Text>
          <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
            Founders are reading your application. You{'’'}ll get an email
            when a decision is made.
          </Text>
        </Card>
      ) : null}

      <Button
        label="Sign out"
        variant="secondary"
        fullWidth
        onPress={confirmSignOut}
      />
      <Text
        variant="caption"
        tone="muted"
        style={{ textAlign: 'center', marginTop: 4 }}
      >
        Deluxe Car Club · {new Date().getFullYear()}
      </Text>

      {/* keep colors import alive on web tree-shaking */}
      <View style={{ height: 0, backgroundColor: colors.sand }} />
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
      }}
    >
      <Text variant="caption" tone="muted">
        {label.toUpperCase()}
      </Text>
      <Text variant="bodyBold" numberOfLines={1} style={{ flexShrink: 1 }}>
        {value}
      </Text>
    </View>
  );
}

function mapTier(status?: string, tier?: string, role?: string): Tier {
  if (role === 'admin') return 'admin';
  if (status === 'paid' && tier === 'collector') return 'collector';
  if (status === 'paid' && tier === 'drivers') return 'drivers';
  if (status === 'approved') return 'approved';
  if (status === 'pending') return 'pending';
  return 'guest';
}
