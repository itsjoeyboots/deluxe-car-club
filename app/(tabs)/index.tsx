import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  Avatar,
  Button,
  Card,
  Divider,
  EventListItem,
  MembershipStatus,
  PointsChip,
  ProgressBar,
  ScarcityCounter,
  Screen,
  Text,
  TierBadge,
  type Tier,
} from '@/components/dsc';
import { useAuth } from '@/lib/auth-context';
import { useMyCars } from '@/hooks/use-my-cars';
import { useEvents } from '@/hooks/use-events';
import type { Partner } from '@/types/db';
import { MEMBERSHIP } from '@/lib/membership';
import {
  profileChecklist,
  profileCompletion,
} from '@/lib/profile-completeness';
import { colors } from '@/lib/theme';

type FeaturedBuild = {
  id: string;
  car_id: string;
  content: string;
  photo_urls: string[];
  created_at: string;
  car: {
    id: string;
    year: number | null;
    make: string | null;
    model: string | null;
  } | null;
  author: {
    full_name: string | null;
    profile_photo_url: string | null;
  } | null;
};

export default function HomeScreen() {
  const { profile, session } = useAuth();
  const { cars } = useMyCars();
  const { events: upcomingEvents } = useEvents('upcoming');
  const [counts, setCounts] = useState<{ approved: number; paid: number }>({
    approved: 0,
    paid: 0,
  });
  const [featured, setFeatured] = useState<FeaturedBuild[]>([]);
  const [featuredPartners, setFeaturedPartners] = useState<Partner[]>([]);

  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured) return;
    (async () => {
      const { data, error } = await supabase.rpc('membership_counts');
      if (!active || error || !data) return;
      const row = (data as { approved_count: number; paid_count: number }[])[0];
      if (row) setCounts({ approved: row.approved_count, paid: row.paid_count });
    })();
    return () => {
      active = false;
    };
  }, [profile?.status]);

  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured) return;
    (async () => {
      const { data, error } = await supabase
        .from('build_updates')
        .select(
          'id, car_id, content, photo_urls, created_at, car:cars!build_updates_car_id_fkey(id, year, make, model), author:profiles!build_updates_user_id_fkey(full_name, profile_photo_url)',
        )
        .order('is_featured', { ascending: false })
        .order('featured_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(5);
      if (!active || error || !data) return;
      setFeatured(data as unknown as FeaturedBuild[]);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!isSupabaseConfigured) return;
    (async () => {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('featured', true)
        .order('name', { ascending: true })
        .limit(6);
      if (!active || error || !data) return;
      setFeaturedPartners(data as Partner[]);
    })();
    return () => {
      active = false;
    };
  }, []);

  const displayName =
    profile?.full_name?.split(' ')[0] ??
    session?.user.email?.split('@')[0] ??
    'Member';

  const tier: Tier = mapTier(
    profile?.status,
    profile?.tier,
    profile?.role,
  );
  const points = profile?.points_balance ?? 0;

  const checklist = profileChecklist(
    profile,
    cars.some((c) => c.is_primary),
  );
  const completion = profileCompletion(checklist);
  const firstIncomplete = checklist.find((i) => i.required && !i.done);
  const finishHref =
    firstIncomplete?.key === 'primary_car' ? '/cars/new' : '/profile/edit';

  return (
    <Screen contentContainerStyle={{ paddingTop: 24, gap: 20 }}>
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <Avatar
            url={profile?.profile_photo_url}
            name={profile?.full_name}
            size="md"
          />
          <View style={{ flex: 1 }}>
            <Text variant="eyebrow" tone="terracotta">
              Deluxe Car Club
            </Text>
            <Text variant="display" style={{ marginTop: 2 }}>
              Hey {displayName}.
            </Text>
          </View>
        </View>
        <TierBadge tier={tier} />
      </View>

      {!completion.isComplete ? (
        <Card variant="raised" style={{ borderLeftWidth: 4, borderLeftColor: colors.gold }}>
          <Text variant="eyebrow" style={{ color: colors.gold }}>
            Finish your profile
          </Text>
          <Text variant="h2" style={{ marginTop: 4 }}>
            {Math.round(completion.pctRequired * 100)}% complete
          </Text>
          <View style={{ marginTop: 10 }}>
            <ProgressBar
              value={completion.pctRequired}
              max={1}
              tone="gold"
            />
          </View>
          <View style={{ marginTop: 12, gap: 4 }}>
            {checklist
              .filter((i) => !i.done && i.required)
              .slice(0, 3)
              .map((item) => (
                <Text key={item.key} variant="small" tone="secondary">
                  · {item.label}
                </Text>
              ))}
          </View>
          <Button
            label={
              firstIncomplete?.key === 'primary_car'
                ? 'Add Your Car'
                : 'Finish Setup'
            }
            size="md"
            fullWidth
            style={{ marginTop: 14 }}
            onPress={() => router.push(finishHref)}
          />
        </Card>
      ) : null}

      <Card variant="raised">
        <View style={styles.spaceBetween}>
          <Text variant="eyebrow" tone="muted">
            Your Points
          </Text>
          <PointsChip points={points} />
        </View>
        <Text variant="display" style={{ marginTop: 8 }}>
          {points.toLocaleString()}
        </Text>
        <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
          {nextRewardLine(points)}
        </Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <View style={{ flex: 1 }}>
            <Button
              label="Browse Rewards"
              size="sm"
              fullWidth
              onPress={() => router.push('/rewards')}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="History"
              variant="secondary"
              size="sm"
              fullWidth
              onPress={() => router.push('/points')}
            />
          </View>
        </View>
      </Card>

      <View style={{ gap: 8 }}>
        <Text variant="eyebrow" tone="muted">
          Spots in the club
        </Text>
        <ScarcityCounter
          approved={counts.approved}
          approvedCap={MEMBERSHIP.approvedCap}
          paid={counts.paid}
          paidCap={MEMBERSHIP.paidCap}
        />
      </View>

      <MembershipStatus profile={profile} variant="compact" />

      <Divider tone="gold" />

      <Section
        title="Upcoming Events"
        action={
          upcomingEvents.length > 3
            ? {
                label: 'See all',
                onPress: () => router.push('/(tabs)/events'),
              }
            : undefined
        }
      >
        {upcomingEvents.length === 0 ? (
          <Card variant="inset">
            <Text variant="small" tone="muted">
              No events on the books yet. Check back after the founders post the
              next rally schedule.
            </Text>
          </Card>
        ) : (
          <View style={{ gap: 8 }}>
            {upcomingEvents.slice(0, 3).map((event) => (
              <EventListItem key={event.id} event={event} />
            ))}
          </View>
        )}
      </Section>

      <Section title="Featured Builds">
        {featured.length === 0 ? (
          <Card variant="inset">
            <Text variant="small" tone="muted">
              Member builds will rotate through here. Post a build update from
              your car page to be eligible.
            </Text>
          </Card>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -2 }}
            contentContainerStyle={{ gap: 10, paddingHorizontal: 2 }}
          >
            {featured.map((b) => (
              <FeaturedBuildCard key={b.id} build={b} />
            ))}
          </ScrollView>
        )}
      </Section>

      <Section title="Partner Deals">
        {featuredPartners.length === 0 ? (
          <Card variant="inset">
            <Text variant="small" tone="muted">
              DCC partner shops, discounts, and tour days will live here.
            </Text>
          </Card>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -2 }}
            contentContainerStyle={{ gap: 10, paddingHorizontal: 2 }}
          >
            {featuredPartners.map((p) => (
              <FeaturedPartnerCard key={p.id} partner={p} />
            ))}
          </ScrollView>
        )}
      </Section>

      <View style={{ alignItems: 'center', paddingTop: 12 }}>
        <Text variant="caption" tone="muted">
          Deluxe Car Club · {new Date().getFullYear()}
        </Text>
      </View>
    </Screen>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: { label: string; onPress: () => void };
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 10 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text variant="h3" tone="primary">
          {title}
        </Text>
        {action ? (
          <Pressable onPress={action.onPress}>
            <Text variant="caption" tone="terracotta">
              {action.label.toUpperCase()} ›
            </Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function FeaturedPartnerCard({ partner }: { partner: Partner }) {
  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/partners/[id]', params: { id: partner.id } })
      }
      style={({ pressed }) => [
        featuredStyles.card,
        { opacity: pressed ? 0.9 : 1 },
      ]}
    >
      {partner.hero_image_url ? (
        <Image
          source={{ uri: partner.hero_image_url }}
          style={featuredStyles.cover}
          contentFit="cover"
          transition={120}
        />
      ) : (
        <View style={[featuredStyles.cover, featuredStyles.coverPlaceholder]}>
          <Text variant="caption" tone="onDark">
            {partner.name.slice(0, 1).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={featuredStyles.body}>
        <Text variant="bodyBold" numberOfLines={1}>
          {partner.name}
        </Text>
        {partner.location_name ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {partner.location_name}
          </Text>
        ) : null}
        {partner.discount_terms ? (
          <Text variant="small" tone="terracotta" numberOfLines={2} style={{ marginTop: 4 }}>
            {partner.discount_terms}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function FeaturedBuildCard({ build }: { build: FeaturedBuild }) {
  const cover = build.photo_urls?.[0];
  const title = build.car
    ? [build.car.year, build.car.make, build.car.model].filter(Boolean).join(' ')
    : 'Untitled';
  return (
    <Pressable
      onPress={() =>
        build.car
          ? router.push({
              pathname: '/cars/[id]',
              params: { id: build.car.id },
            })
          : null
      }
      style={({ pressed }) => [
        featuredStyles.card,
        { opacity: pressed ? 0.9 : 1 },
      ]}
    >
      {cover ? (
        <Image
          source={{ uri: cover }}
          style={featuredStyles.cover}
          contentFit="cover"
          transition={120}
        />
      ) : (
        <View style={[featuredStyles.cover, featuredStyles.coverPlaceholder]}>
          <Text variant="caption" tone="onDark">
            DCC
          </Text>
        </View>
      )}
      <View style={featuredStyles.body}>
        <Text variant="bodyBold" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {build.author?.full_name ?? 'Member'}
        </Text>
        <Text variant="small" tone="secondary" numberOfLines={2} style={{ marginTop: 4 }}>
          {build.content}
        </Text>
      </View>
    </Pressable>
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

function nextRewardLine(points: number): string {
  const tiers = [
    { cost: 500, name: 'Sticker Pack' },
    { cost: 1500, name: 'Branded Tee' },
    { cost: 3000, name: 'Hat or Hoodie' },
    { cost: 5000, name: 'Free Guest Pass' },
    { cost: 10000, name: 'Free Month' },
    { cost: 25000, name: 'Featured Build' },
    { cost: 50000, name: 'Free Annual Renewal' },
  ];
  const next = tiers.find((t) => t.cost > points);
  if (!next) return 'Top of the rewards ladder. Talk to the founders.';
  const remaining = next.cost - points;
  return `${remaining.toLocaleString()} pts to ${next.name}`;
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  spaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

const featuredStyles = StyleSheet.create({
  card: {
    width: 240,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cover: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: colors.ink,
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 12,
  },
});
