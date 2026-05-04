import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
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

type AdminBuildUpdate = {
  id: string;
  car_id: string;
  user_id: string;
  content: string;
  photo_urls: string[];
  is_featured: boolean;
  featured_at: string | null;
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

type FilterMode = 'all' | 'featured' | 'recent';

export default function AdminBuildsScreen() {
  const { profile, loading: authLoading } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [builds, setBuilds] = useState<AdminBuildUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<FilterMode>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured || !isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('build_updates')
      .select(
        'id, car_id, user_id, content, photo_urls, is_featured, featured_at, created_at, car:cars!build_updates_car_id_fkey(id, year, make, model), author:profiles!build_updates_user_id_fkey(full_name, profile_photo_url)',
      )
      .order('is_featured', { ascending: false })
      .order('featured_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(60);
    if (!error && data) setBuilds(data as unknown as AdminBuildUpdate[]);
    setLoading(false);
  }, [isAdmin]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    let out = builds;
    if (mode === 'featured') out = out.filter((b) => b.is_featured);
    if (mode === 'recent') out = out.slice(0, 12);
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter((b) => {
        const carLine = b.car
          ? `${b.car.year ?? ''} ${b.car.make ?? ''} ${b.car.model ?? ''}`
          : '';
        return (
          (b.author?.full_name ?? '').toLowerCase().includes(q) ||
          carLine.toLowerCase().includes(q) ||
          b.content.toLowerCase().includes(q)
        );
      });
    }
    return out;
  }, [builds, mode, search]);

  const featuredCount = useMemo(
    () => builds.filter((b) => b.is_featured).length,
    [builds],
  );

  if (authLoading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Featured Builds', headerShown: true }} />
        <Text tone="muted">Loading…</Text>
      </Screen>
    );
  }

  if (!isAdmin) {
    return (
      <Screen contentContainerStyle={{ paddingTop: 24, gap: 16 }}>
        <Stack.Screen options={{ title: 'Featured Builds', headerShown: true }} />
        <Text variant="display">Admins only.</Text>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  async function toggleFeatured(id: string, value: boolean) {
    setBusyId(id);
    const { error } = await supabase.rpc('set_build_featured', {
      update_id: id,
      value,
    });
    setBusyId(null);
    if (error) {
      showError('Could not update', error.message);
      return;
    }
    await refresh();
  }

  return (
    <Screen contentContainerStyle={{ paddingTop: 24, gap: 14 }}>
      <Stack.Screen options={{ title: 'Featured Builds', headerShown: true }} />

      <View>
        <Text variant="eyebrow" tone="terracotta">
          Founders only
        </Text>
        <Text variant="display" style={{ marginTop: 4 }}>
          Featured Builds
        </Text>
        <Text variant="small" tone="muted" style={{ marginTop: 6 }}>
          {featuredCount} featured · drives the home carousel.
        </Text>
      </View>

      <TextField
        placeholder="Search by member, car, or caption"
        value={search}
        onChangeText={setSearch}
        autoCorrect={false}
      />

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['all', 'featured', 'recent'] as FilterMode[]).map((m) => (
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
              {m === 'all' ? 'All' : m === 'featured' ? 'Featured' : 'Recent'}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ height: StyleSheet.hairlineWidth * 2, backgroundColor: colors.border, marginVertical: 4 }} />

      {loading ? (
        <Text tone="muted">Loading…</Text>
      ) : filtered.length === 0 ? (
        <Card variant="inset">
          <Text variant="bodyBold">No build updates match.</Text>
          <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
            Members post these from their car page.
          </Text>
        </Card>
      ) : (
        <View style={{ gap: 12 }}>
          {filtered.map((b) => (
            <BuildAdminCard
              key={b.id}
              build={b}
              busy={busyId === b.id}
              onToggle={() => toggleFeatured(b.id, !b.is_featured)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

function BuildAdminCard({
  build,
  busy,
  onToggle,
}: {
  build: AdminBuildUpdate;
  busy: boolean;
  onToggle: () => void;
}) {
  const cover = build.photo_urls?.[0];
  const carLine = build.car
    ? [build.car.year, build.car.make, build.car.model].filter(Boolean).join(' ')
    : 'Untitled';
  return (
    <Card variant="raised">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar
          url={build.author?.profile_photo_url}
          name={build.author?.full_name}
          size="md"
        />
        <View style={{ flex: 1 }}>
          <Text variant="bodyBold" numberOfLines={1}>
            {build.author?.full_name ?? 'Member'}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {carLine} · {new Date(build.created_at).toLocaleDateString()}
          </Text>
        </View>
        {build.is_featured ? (
          <View style={styles.featuredPill}>
            <Text style={styles.featuredPillText}>FEATURED</Text>
          </View>
        ) : null}
      </View>

      {cover ? (
        <Image
          source={{ uri: cover }}
          style={styles.cover}
          contentFit="cover"
          transition={120}
        />
      ) : null}

      <Text
        variant="small"
        tone="secondary"
        numberOfLines={3}
        style={{ marginTop: cover ? 12 : 10 }}
      >
        {build.content}
      </Text>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <View style={{ flex: 1 }}>
          <Button
            label={build.is_featured ? 'Unfeature' : 'Feature'}
            variant={build.is_featured ? 'secondary' : 'primary'}
            fullWidth
            loading={busy}
            onPress={onToggle}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Open Car"
            variant="ghost"
            fullWidth
            onPress={() =>
              build.car
                ? router.push({
                    pathname: '/cars/[id]',
                    params: { id: build.car.id },
                  })
                : null
            }
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
  cover: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radii.md,
    marginTop: 12,
    backgroundColor: colors.ink,
  },
  featuredPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.terracotta,
  },
  featuredPillText: {
    color: colors.ink,
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1,
  },
});
