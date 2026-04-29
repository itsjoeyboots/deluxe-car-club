import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { pickAndUploadCarPhoto } from '@/lib/uploads';
import { colors, fonts, radii } from '@/lib/theme';
import type { CarPhoto } from '@/types/db';
import { Button } from './Button';
import { Card } from './Card';
import { Text } from './Text';

export function CarGallery({ carId }: { carId: string }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [photos, setPhotos] = useState<CarPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('car_photos')
      .select('*')
      .eq('car_id', carId)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) {
      Alert.alert('Could not load photos', error.message);
    } else {
      setPhotos((data as CarPhoto[]) ?? []);
    }
    setLoading(false);
  }, [carId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleAdd() {
    if (!userId) return;
    setBusy(true);
    const result = await pickAndUploadCarPhoto(userId, carId);
    setBusy(false);
    if (!result.ok) {
      if ('cancelled' in result) return;
      Alert.alert('Upload failed', result.error);
      return;
    }
    const nextOrder = photos.length;
    const { error } = await supabase.from('car_photos').insert({
      car_id: carId,
      url: result.publicUrl,
      display_order: nextOrder,
    });
    if (error) {
      Alert.alert('Saved file, but could not record', error.message);
      return;
    }
    await refresh();
  }

  function handleDelete(photo: CarPhoto) {
    Alert.alert('Remove photo?', 'This deletes the photo from this car.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('car_photos')
            .delete()
            .eq('id', photo.id);
          if (error) Alert.alert('Could not delete', error.message);
          else await refresh();
        },
      },
    ]);
  }

  async function handleSetCover(photo: CarPhoto) {
    const others = photos.filter((p) => p.id !== photo.id);
    const updates = [
      { id: photo.id, display_order: 0 },
      ...others.map((p, i) => ({ id: p.id, display_order: i + 1 })),
    ];
    const results = await Promise.all(
      updates.map((u) =>
        supabase
          .from('car_photos')
          .update({ display_order: u.display_order })
          .eq('id', u.id),
      ),
    );
    const firstError = results.find((r) => r.error);
    if (firstError?.error) {
      Alert.alert('Could not set cover', firstError.error.message);
    } else {
      await refresh();
    }
  }

  return (
    <Card>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text variant="eyebrow" tone="muted">
            Photos
          </Text>
          <Text variant="bodyBold" style={{ marginTop: 2 }}>
            {photos.length === 0
              ? 'No photos yet'
              : `${photos.length} photo${photos.length === 1 ? '' : 's'}`}
          </Text>
        </View>
        <Button
          label={busy ? 'Uploading…' : 'Add Photo'}
          size="sm"
          variant="secondary"
          loading={busy}
          onPress={handleAdd}
        />
      </View>

      {loading ? (
        <Text variant="small" tone="muted" style={{ marginTop: 12 }}>
          Loading photos…
        </Text>
      ) : photos.length === 0 ? (
        <Text variant="small" tone="muted" style={{ marginTop: 12 }}>
          The first photo you add becomes your cover. Tap “Make Cover” later to
          switch.
        </Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 14, marginHorizontal: -4 }}
          contentContainerStyle={{ gap: 10, paddingHorizontal: 4 }}
        >
          {photos.map((p, idx) => (
            <View key={p.id} style={styles.tile}>
              <Image
                source={{ uri: p.url }}
                style={styles.image}
                contentFit="cover"
                transition={120}
              />
              {idx === 0 ? (
                <View style={styles.coverBadge}>
                  <Text variant="caption" tone="onDark">
                    COVER
                  </Text>
                </View>
              ) : null}
              <View style={styles.tileActions}>
                {idx !== 0 ? (
                  <Pressable
                    onPress={() => handleSetCover(p)}
                    style={({ pressed }) => [
                      styles.tileBtn,
                      { opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    <Text style={styles.tileBtnText}>Make Cover</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={() => handleDelete(p)}
                  style={({ pressed }) => [
                    styles.tileBtn,
                    {
                      borderColor: colors.danger,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.tileBtnText, { color: colors.danger }]}>
                    Remove
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </Card>
  );
}

const TILE_W = 220;
const TILE_H = 165;

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tile: {
    width: TILE_W,
  },
  image: {
    width: TILE_W,
    height: TILE_H,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.sand,
  },
  coverBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.terracottaDeep,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  tileActions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  tileBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.terracottaDeep,
    borderRadius: radii.sm,
    paddingVertical: 6,
    alignItems: 'center',
  },
  tileBtnText: {
    color: colors.terracottaDeep,
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
