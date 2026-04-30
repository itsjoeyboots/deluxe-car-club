import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import {
  Stack,
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';
import {
  Avatar,
  Button,
  BuildUpdateCard,
  type BuildUpdateWithMeta,
  type CommentRow,
  Card,
  Divider,
  ModsList,
  Screen,
  Text,
} from '@/components/dsc';
import { useAuth } from '@/lib/auth-context';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { pickAndUploadCarPhoto } from '@/lib/uploads';
import { colors, fonts, radii } from '@/lib/theme';
import type { Car, CarPhoto, Mod } from '@/types/db';

type Owner = {
  id: string;
  full_name: string | null;
  profile_photo_url: string | null;
  app_number: number | null;
};

export default function CarViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();

  const [car, setCar] = useState<Car | null>(null);
  const [owner, setOwner] = useState<Owner | null>(null);
  const [photos, setPhotos] = useState<CarPhoto[]>([]);
  const [mods, setMods] = useState<Mod[]>([]);
  const [updates, setUpdates] = useState<BuildUpdateWithMeta[]>([]);
  const [commentsByUpdate, setCommentsByUpdate] = useState<
    Record<string, CommentRow[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [draft, setDraft] = useState('');
  const [draftPhotoUrls, setDraftPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const isOwner = !!(profile?.id && car?.user_id === profile.id);

  const refresh = useCallback(async () => {
    if (!id || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [carRes, photosRes, modsRes, updatesRes] = await Promise.all([
      supabase
        .from('cars')
        .select(
          'id, user_id, year, make, model, nickname, status, is_primary, created_at, owner:profiles!cars_user_id_fkey(id, full_name, profile_photo_url, app_number)',
        )
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('car_photos')
        .select('*')
        .eq('car_id', id)
        .order('display_order', { ascending: true }),
      supabase
        .from('mods')
        .select('*')
        .eq('car_id', id)
        .order('created_at', { ascending: true }),
      supabase
        .from('build_updates')
        .select(
          'id, car_id, user_id, content, photo_urls, created_at, build_update_likes(user_id), build_update_comments(id)',
        )
        .eq('car_id', id)
        .order('created_at', { ascending: false }),
    ]);

    if (carRes.error || !carRes.data) {
      setError(carRes.error?.message ?? 'Car not found');
      setCar(null);
      setOwner(null);
      setLoading(false);
      return;
    }

    const raw = carRes.data as unknown as Car & { owner: Owner | Owner[] | null };
    const ownerProfile = Array.isArray(raw.owner) ? raw.owner[0] : raw.owner;
    const { owner: _drop, ...carRow } = raw;
    setCar(carRow as Car);
    setOwner(ownerProfile ?? null);

    if (photosRes.data) setPhotos(photosRes.data as CarPhoto[]);
    if (modsRes.data) setMods(modsRes.data as Mod[]);

    if (updatesRes.data) {
      const myId = profile?.id ?? null;
      const decorated: BuildUpdateWithMeta[] = (updatesRes.data as RawUpdateRow[]).map(
        (row) => {
          const likes = row.build_update_likes ?? [];
          const comments = row.build_update_comments ?? [];
          const { build_update_likes: _l, build_update_comments: _c, ...rest } = row;
          return {
            ...rest,
            like_count: likes.length,
            i_liked: !!myId && likes.some((l) => l.user_id === myId),
            comment_count: comments.length,
          };
        },
      );
      setUpdates(decorated);
    }

    setError(null);
    setLoading(false);
  }, [id, profile?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  async function handleToggleLike(updateId: string) {
    const { data, error: err } = await supabase.rpc('toggle_build_update_like', {
      update_id: updateId,
    });
    if (err) {
      console.error('[viewer] like failed', err);
      showError('Could not like', err.message);
      return;
    }
    setUpdates((cur) =>
      cur.map((u) =>
        u.id === updateId
          ? {
              ...u,
              like_count: typeof data === 'number' ? data : u.like_count,
              i_liked: !u.i_liked,
            }
          : u,
      ),
    );
  }

  async function loadComments(updateId: string) {
    const { data, error: err } = await supabase
      .from('build_update_comments')
      .select(
        'id, build_update_id, user_id, content, created_at, author:profiles!build_update_comments_user_id_fkey(full_name, profile_photo_url)',
      )
      .eq('build_update_id', updateId)
      .order('created_at', { ascending: true });
    if (err) {
      console.error('[viewer] load comments failed', err);
      return;
    }
    setCommentsByUpdate((cur) => ({
      ...cur,
      [updateId]: (data ?? []) as unknown as CommentRow[],
    }));
    setUpdates((cur) =>
      cur.map((u) =>
        u.id === updateId ? { ...u, comment_count: (data ?? []).length } : u,
      ),
    );
  }

  // Load comments for all updates lazily on first render after fetch.
  useEffect(() => {
    updates.forEach((u) => {
      if (!commentsByUpdate[u.id]) loadComments(u.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updates.length]);

  async function pickPhoto() {
    if (!profile?.id || !id) return;
    setUploading(true);
    const result = await pickAndUploadCarPhoto(profile.id, id);
    setUploading(false);
    if (!result.ok) {
      if ('cancelled' in result) return;
      showError('Upload failed', result.error);
      return;
    }
    setDraftPhotoUrls((cur) => [...cur, result.publicUrl]);
  }

  async function submitUpdate() {
    if (!id) return;
    if (!draft.trim()) {
      showError('Missing caption', 'Add a quick note about what changed.');
      return;
    }
    setPosting(true);
    const { error: err } = await supabase.rpc('post_build_update', {
      car_id_in: id,
      content_in: draft.trim(),
      photo_urls_in: draftPhotoUrls,
    });
    setPosting(false);
    if (err) {
      console.error('[viewer] post update failed', err);
      showError('Could not post', err.message);
      return;
    }
    setDraft('');
    setDraftPhotoUrls([]);
    await refresh();
  }

  if (loading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Car', headerShown: true }} />
        <Text tone="muted">Loading…</Text>
      </Screen>
    );
  }
  if (error || !car) {
    return (
      <Screen contentContainerStyle={{ gap: 14 }}>
        <Stack.Screen options={{ title: 'Car', headerShown: true }} />
        <Text variant="display">Car not found</Text>
        <Text tone="muted">{error ?? 'It may have been removed.'}</Text>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const title = [car.year, car.make, car.model].filter(Boolean).join(' ');
  const cover = photos[0]?.url;

  return (
    <Screen contentContainerStyle={{ gap: 16, paddingTop: 8 }}>
      <Stack.Screen
        options={{ title: title || 'Car', headerShown: true }}
      />

      {cover ? (
        <Image
          source={{ uri: cover }}
          style={styles.hero}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View style={[styles.hero, styles.heroPlaceholder]}>
          <Text style={styles.heroLetter}>
            {(car.make ?? '?').slice(0, 1).toUpperCase()}
          </Text>
        </View>
      )}

      <View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Text variant="display" style={{ flex: 1 }}>
            {title || 'Untitled'}
          </Text>
          {car.is_primary ? (
            <View style={styles.primaryDot}>
              <Text style={styles.primaryDotText}>PRIMARY</Text>
            </View>
          ) : null}
        </View>
        {car.nickname ? (
          <Text variant="bodyBold" tone="terracotta" style={{ marginTop: 4 }}>
            “{car.nickname}”
          </Text>
        ) : null}
        <Text variant="caption" tone="muted" style={{ marginTop: 4 }}>
          {car.status === 'complete' ? 'BUILD COMPLETE' : 'BUILD IN PROGRESS'}
        </Text>
      </View>

      {owner ? (
        <Pressable
          onPress={() =>
            router.push({ pathname: '/u/[id]', params: { id: owner.id } })
          }
        >
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar
                url={owner.profile_photo_url}
                name={owner.full_name}
                size="md"
              />
              <View style={{ flex: 1 }}>
                <Text variant="caption" tone="muted">
                  OWNED BY
                </Text>
                <Text variant="bodyBold">
                  {owner.full_name ?? 'Member'}
                  {owner.app_number
                    ? ` · #${String(owner.app_number).padStart(3, '0')}`
                    : ''}
                </Text>
              </View>
              <Text style={{ color: colors.textMuted, fontSize: 22 }}>›</Text>
            </View>
          </Card>
        </Pressable>
      ) : null}

      {photos.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -2 }}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
        >
          {photos.map((p) => (
            <Image
              key={p.id}
              source={{ uri: p.url }}
              style={styles.galleryThumb}
              contentFit="cover"
              transition={120}
            />
          ))}
        </ScrollView>
      ) : null}

      {isOwner ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button
              label="Edit Car"
              variant="secondary"
              fullWidth
              onPress={() =>
                router.push({ pathname: '/cars/[id]/edit', params: { id: car.id } })
              }
            />
          </View>
        </View>
      ) : null}

      <Divider />

      <View>
        <Text variant="h3">Mods</Text>
        <View style={{ marginTop: 10 }}>
          <ModsList mods={mods} />
        </View>
      </View>

      <Divider />

      <View>
        <Text variant="h3">Build Timeline</Text>

        {isOwner ? (
          <Card style={{ marginTop: 10 }}>
            <Text variant="eyebrow" tone="muted">
              Post update
            </Text>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="What changed? Engine swap, tune, paint, road trip…"
              placeholderTextColor={colors.textMuted}
              style={styles.composeInput}
              multiline
            />
            {draftPhotoUrls.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: 10, marginHorizontal: -2 }}
                contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
              >
                {draftPhotoUrls.map((url, idx) => (
                  <Image
                    key={`${url}-${idx}`}
                    source={{ uri: url }}
                    style={styles.draftThumb}
                    contentFit="cover"
                  />
                ))}
              </ScrollView>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <View style={{ flex: 1 }}>
                <Button
                  label={uploading ? 'Uploading…' : 'Add Photo'}
                  variant="secondary"
                  size="sm"
                  loading={uploading}
                  onPress={pickPhoto}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label={posting ? 'Posting…' : 'Post Update'}
                  size="sm"
                  loading={posting}
                  disabled={!draft.trim()}
                  onPress={submitUpdate}
                />
              </View>
            </View>
            <Text variant="caption" tone="muted" style={{ marginTop: 8 }}>
              +25 points for one update per week.
            </Text>
          </Card>
        ) : null}

        {updates.length === 0 ? (
          <Card variant="inset" style={{ marginTop: 10 }}>
            <Text variant="small" tone="muted">
              No build updates yet.
            </Text>
          </Card>
        ) : (
          <View style={{ gap: 12, marginTop: 10 }}>
            {updates.map((u) => (
              <BuildUpdateCard
                key={u.id}
                update={u}
                comments={commentsByUpdate[u.id] ?? []}
                onToggleLike={handleToggleLike}
                onCommentAdded={loadComments}
              />
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

type RawUpdateRow = {
  id: string;
  car_id: string;
  user_id: string;
  content: string;
  photo_urls: string[];
  created_at: string;
  build_update_likes: { user_id: string }[];
  build_update_comments: { id: string }[];
};

function showError(title: string, message: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

const styles = StyleSheet.create({
  hero: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radii.lg,
    backgroundColor: colors.ink,
  },
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLetter: {
    color: colors.terracotta,
    fontFamily: fonts.serif,
    fontSize: 64,
    letterSpacing: 2,
  },
  primaryDot: {
    backgroundColor: colors.terracottaDeep,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  primaryDotText: {
    color: colors.ink,
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1,
  },
  galleryThumb: {
    width: 220,
    height: 165,
    borderRadius: radii.md,
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: colors.border,
  },
  composeInput: {
    marginTop: 8,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: colors.ink,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontFamily: fonts.sans,
    fontSize: 14,
  },
  draftThumb: {
    width: 120,
    height: 90,
    borderRadius: radii.md,
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
