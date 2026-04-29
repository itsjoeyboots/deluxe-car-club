import { View, Alert } from 'react-native';
import {
  Button,
  Card,
  Divider,
  PointsChip,
  Screen,
  Text,
  TierBadge,
  type Tier,
} from '@/components/dsc';
import { useAuth } from '@/lib/auth-context';

export default function ProfileScreen() {
  const { profile, session, signOut } = useAuth();

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
      <View>
        <Text variant="eyebrow" tone="terracotta">
          Member Card
        </Text>
        <Text variant="display" style={{ marginTop: 4 }}>
          {fullName}
        </Text>
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
        {appNumber ? <Row label="Member #" value={`#${String(appNumber).padStart(3, '0')}`} /> : null}
        {profile?.city ? <Row label="City" value={profile.city} /> : null}
        {profile?.instagram_handle ? (
          <Row label="Instagram" value={`@${profile.instagram_handle}`} />
        ) : null}
        {profile?.approved_at ? (
          <Row label="Approved" value={new Date(profile.approved_at).toLocaleDateString()} />
        ) : null}
      </Card>

      <Card variant="inset">
        <Text variant="h3">Coming Soon</Text>
        <Text variant="small" tone="muted" style={{ marginTop: 6 }}>
          Profile editor (photo, primary car, Instagram), member QR card, build
          galleries, achievements wall.
        </Text>
      </Card>

      <Divider />

      <Button label="Sign out" variant="secondary" fullWidth onPress={confirmSignOut} />
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
      <Text variant="bodyBold">{value}</Text>
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
