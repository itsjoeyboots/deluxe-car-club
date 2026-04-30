import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  AchievementsGrid,
  Avatar,
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
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { colors, fonts, radii } from '@/lib/theme';
import type { AchievementKey } from '@/lib/achievements';
import type { Profile, Car, CarPhoto } from '@/types/db';

const SELECT = `
  id, full_name, profile_photo_url, instagram_handle, city, tier, status, role,
  app_number, approved_at, points_balance,
  cars(id, year, make, model, nickname, status, is_primary, car_photos(url, display_order))
` as const;

type CarWithPhotos = Pick<
  Car,
  'id' | 'year' | 'make' | 'model' | 'nickname' | 'status' | 'is_primary'
> & {
  car_photos: Pick<CarPhoto, 'url' | 'display_order'>[];
};

type Raw = Pick<
  Profile,
  | 'id'
  | 'full_name'
  | 'profile_photo_url'
  | 'instagram_handle'
  | 'city'
  | 'tier'
  | 'status'
  | 'role'
  | 'app_number'
  | 'approved_at'
  | 'points_balance'
> & { cars: CarWithPhotos[] };

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile: viewer } = useAuth();
  const [data, setData] = useState<Raw | null>(null);
  const [unlocked, setUnlocked] = useState<Set<AchievementKey>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!id || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    (async () => {
      const [pRes, aRes] = await Promise.all([
        supabase
          .from('profiles')
          .select(SELECT)
          .eq('id', id)
          .maybeSingle(),
        supabase
          .from('achievements')
          .select('achievement_key')
          .eq('user_id', id),
      ]);
      if (!active) return;
      if (pRes.error || !pRes.data) {
        setError(pRes.error?.message ?? 'Member not found');
        setData(null);
      } else {
        setError(null);
        setData(pRes.data as unknown as Raw);
      }
      if (aRes.data) {
        setUnlocked(
          new Set(
            (aRes.data as { achievement_key: AchievementKey }[]).map((r) => r.achievement_key),
          ),
        );
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const isSelf = viewer?.id === id;

  if (loading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Member', headerShown: true }} />
        <Text tone="muted">Loading…</Text>
      </Screen>
    );
  }
  if (error || !data) {
    return (
      <Screen contentContainerStyle={{ gap: 14 }}>
        <Stack.Screen options={{ title: 'Member', headerShown: true }} />
        <Text variant="display">Member not found</Text>
        <Text tone="muted">{error ?? 'They may have left or been removed.'}</Text>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const tier = mapTier(data.status, data.tier, data.role);
  const since = data.approved_at
    ? new Date(data.approved_at).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      })
    : null;
  const number = data.app_number
    ? `#${String(data.app_number).padStart(3, '0')}`
    : null;
  const cars = (data.cars ?? []).slice().sort((a, b) =>
    a.is_primary ? -1 : b.is_primary ? 1 : 0,
  );

  function openInstagram() {
    if (!data?.instagram_handle) return;
    const handle = data.instagram_handle.replace(/^@/, '');
    Linking.openURL(`https://instagram.com/${handle}`).catch(() => {});
  }

  return (
    <Screen contentContainerStyle={{ paddingTop: 16, gap: 18 }}>
      <Stack.Screen
        options={{
          title: data.full_name ?? 'Member',
          headerShown: true,
        }}
      />

      <View style={styles.headerRow}>
        <Avatar
          url={data.profile_photo_url}
          name={data.full_name}
          size="xl"
        />
        <View style={{ flex: 1, gap: 6 }}>
          {number ? (
            <Text variant="eyebrow" tone="terracotta">
              MEMBER {number}
            </Text>
          ) : null}
          <Text variant="display" numberOfLines={2}>
            {data.full_name ?? 'Member'}
          </Text>
          {data.city ? (
            <Text variant="small" tone="muted">
              {data.city}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <TierBadge tier={tier} />
        <PointsChip points={data.points_balance ?? 0} />
        {since ? (
          <Text variant="caption" tone="muted">
            MEMBER SINCE {since.toUpperCase()}
          </Text>
        ) : null}
      </View>

      {data.instagram_handle ? (
        <Pressable onPress={openInstagram}>
          <Card>
            <Text variant="eyebrow" tone="muted">
              Instagram
            </Text>
            <Text variant="bodyBold" tone="terracotta" style={{ marginTop: 4 }}>
              @{data.instagram_handle.replace(/^@/, '')}
            </Text>
            <Text variant="caption" tone="muted" style={{ marginTop: 4 }}>
              TAP TO OPEN
            </Text>
          </Card>
        </Pressable>
      ) : null}

      <Divider />

      <View style={{ gap: 10 }}>
        <Text variant="h3">Garage</Text>
        {cars.length === 0 ? (
          <Card variant="inset">
            <Text tone="muted">No cars yet.</Text>
          </Card>
        ) : (
          cars.map((car) => <PublicCarCard key={car.id} car={car} />)
        )}
      </View>

      <Divider />

      <AchievementsGrid unlockedKeys={unlocked} />

      {isSelf ? (
        <View style={{ marginTop: 20 }}>
          <Button
            label="Edit My Profile"
            variant="secondary"
            fullWidth
            onPress={() => router.push('/profile/edit')}
          />
        </View>
      ) : null}
    </Screen>
  );
}

function PublicCarCard({ car }: { car: CarWithPhotos }) {
  const photos = [...(car.car_photos ?? [])].sort(
    (a, b) => a.display_order - b.display_order,
  );
  const title = [car.year, car.make, car.model].filter(Boolean).join(' ');
  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/cars/[id]', params: { id: car.id } })
      }
    >
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text variant="bodyBold" style={{ flex: 1 }} numberOfLines={1}>
          {title || 'Untitled'}
        </Text>
        {car.is_primary ? (
          <View style={styles.primaryDot}>
            <Text style={styles.primaryDotText}>PRIMARY</Text>
          </View>
        ) : null}
      </View>
      {car.nickname ? (
        <Text variant="small" tone="muted">
          “{car.nickname}”
        </Text>
      ) : null}
      <Text variant="caption" tone="muted" style={{ marginTop: 4 }}>
        {car.status === 'complete' ? 'BUILD COMPLETE' : 'BUILD IN PROGRESS'}
      </Text>
      {photos.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 10, marginHorizontal: -2 }}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
        >
          {photos.map((p, idx) => (
            <Image
              key={`${car.id}-${idx}`}
              source={{ uri: p.url }}
              style={styles.thumb}
              contentFit="cover"
              transition={120}
            />
          ))}
        </ScrollView>
      ) : null}
    </Card>
    </Pressable>
  );
}

function mapTier(
  status: string | null | undefined,
  tier: string | null | undefined,
  role: string | null | undefined,
): Tier {
  if (role === 'admin') return 'admin';
  if (status === 'paid' && tier === 'collector') return 'collector';
  if (status === 'paid' && tier === 'drivers') return 'drivers';
  if (status === 'approved') return 'approved';
  if (status === 'pending') return 'pending';
  return 'guest';
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  thumb: {
    width: 180,
    height: 120,
    borderRadius: radii.md,
    backgroundColor: colors.sand,
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryDot: {
    backgroundColor: colors.terracottaDeep,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  primaryDotText: {
    color: colors.sandLight,
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1,
  },
});
