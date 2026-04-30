import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import {
  Button,
  Card,
  Screen,
  Text,
  TextField,
} from '@/components/dsc';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { pickAndUploadEventHero } from '@/lib/uploads';
import { colors, fonts, radii } from '@/lib/theme';
import type { EventTier } from '@/types/db';

const TIERS: { value: EventTier; label: string }[] = [
  { value: 'approved', label: 'All approved' },
  { value: 'drivers', label: 'Drivers+' },
  { value: 'collector', label: 'Collector only' },
];

export default function NewEventScreen() {
  const { profile, session } = useAuth();
  const userId = session?.user.id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(defaultLocalDate());
  const [time, setTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [locationName, setLocationName] = useState('');
  const [address, setAddress] = useState('');
  const [capacity, setCapacity] = useState('');
  const [tier, setTier] = useState<EventTier>('approved');
  const [guestPasses, setGuestPasses] = useState(false);
  const [heroUrl, setHeroUrl] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  if (profile?.role !== 'admin') {
    return (
      <Screen contentContainerStyle={{ paddingTop: 24, gap: 16 }}>
        <Stack.Screen options={{ title: 'New Event', headerShown: true }} />
        <Text variant="display">Admins only.</Text>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  async function handlePickHero() {
    setUploading(true);
    const result = await pickAndUploadEventHero();
    setUploading(false);
    if (!result.ok) {
      if ('cancelled' in result) return;
      showError('Upload failed', result.error);
      return;
    }
    setHeroUrl(result.publicUrl);
  }

  async function handleSave() {
    if (!userId) return;
    if (!title.trim()) {
      showError('Missing info', 'Title is required.');
      return;
    }
    const startsAt = combineDateTime(date, time);
    if (!startsAt) {
      showError('Invalid date/time', 'Use YYYY-MM-DD and HH:MM (24h).');
      return;
    }
    const endsAt = endTime ? combineDateTime(date, endTime) : null;
    const cap = capacity.trim() ? Number(capacity.trim()) : null;
    if (capacity.trim() && (!Number.isFinite(cap) || (cap as number) < 1)) {
      showError('Invalid capacity', 'Use a positive whole number, or leave blank.');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          hero_image_url: heroUrl,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt?.toISOString() ?? null,
          location_name: locationName.trim() || null,
          address: address.trim() || null,
          capacity: cap,
          tier_required: tier,
          guest_passes_allowed: guestPasses,
          status: 'upcoming',
          created_by: userId,
        })
        .select('id')
        .single();
      if (error || !data) {
        console.error('[admin/events/new] insert failed', error);
        showError('Could not create event', error?.message ?? 'Unknown error');
        return;
      }
      router.replace({ pathname: '/events/[id]', params: { id: data.id } });
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <Stack.Screen options={{ title: 'New Event', headerShown: true }} />
      <Screen contentContainerStyle={{ paddingTop: 16, gap: 18 }}>
        <View>
          <Text variant="eyebrow" tone="terracotta">
            Founders only
          </Text>
          <Text variant="display" style={{ marginTop: 4 }}>
            Create Event
          </Text>
        </View>

        <Card>
          <Text variant="eyebrow" tone="muted">
            Hero image
          </Text>
          {heroUrl ? (
            <Image
              source={{ uri: heroUrl }}
              style={styles.hero}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.hero, styles.heroPlaceholder]}>
              <Text variant="caption" tone="onDark">
                NO HERO YET
              </Text>
            </View>
          )}
          <Button
            label={uploading ? 'Uploading…' : heroUrl ? 'Replace Image' : 'Upload Image'}
            variant="secondary"
            size="sm"
            loading={uploading}
            onPress={handlePickHero}
            style={{ marginTop: 10 }}
          />
        </Card>

        <View style={{ gap: 14 }}>
          <TextField
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="Saturday Cars & Coffee"
          />
          <TextField
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="What's the vibe? What should members bring?"
            multiline
            numberOfLines={4}
            style={{ minHeight: 90, textAlignVertical: 'top' }}
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <TextField
                label="Date (YYYY-MM-DD)"
                value={date}
                onChangeText={setDate}
                placeholder="2026-05-10"
                autoCapitalize="none"
              />
            </View>
            <View style={{ width: 100 }}>
              <TextField
                label="Start"
                value={time}
                onChangeText={setTime}
                placeholder="09:00"
                autoCapitalize="none"
              />
            </View>
            <View style={{ width: 100 }}>
              <TextField
                label="End"
                value={endTime}
                onChangeText={setEndTime}
                placeholder="11:00"
                autoCapitalize="none"
              />
            </View>
          </View>
          <TextField
            label="Location name"
            value={locationName}
            onChangeText={setLocationName}
            placeholder="Schnepf Farms"
          />
          <TextField
            label="Address"
            value={address}
            onChangeText={setAddress}
            placeholder="24810 S Rittenhouse Rd, Queen Creek, AZ"
          />
          <TextField
            label="Capacity (blank = unlimited)"
            value={capacity}
            onChangeText={setCapacity}
            keyboardType="number-pad"
            placeholder="50"
          />
        </View>

        <Card>
          <Text variant="eyebrow" tone="muted">
            Access
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {TIERS.map((t) => (
              <Pill
                key={t.value}
                active={tier === t.value}
                label={t.label}
                onPress={() => setTier(t.value)}
              />
            ))}
          </View>
          <Pressable
            onPress={() => setGuestPasses((v) => !v)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 }}
          >
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: guestPasses ? colors.terracottaDeep : 'transparent',
                  borderColor: guestPasses ? colors.terracottaDeep : colors.border,
                },
              ]}
            >
              {guestPasses ? (
                <Text style={{ color: colors.sandLight, fontWeight: '700' }}>✓</Text>
              ) : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyBold">Allow guest passes</Text>
              <Text variant="small" tone="muted">
                Collector members can use a monthly guest pass on this event.
              </Text>
            </View>
          </Pressable>
        </Card>

        <View style={{ gap: 10 }}>
          <Button
            label={saving ? 'Creating…' : 'Create Event'}
            size="lg"
            fullWidth
            loading={saving}
            onPress={handleSave}
          />
          <Button
            label="Cancel"
            variant="ghost"
            fullWidth
            onPress={() => router.back()}
          />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function Pill({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: active ? colors.terracottaDeep : 'transparent',
          borderColor: active ? colors.terracottaDeep : colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: active ? colors.sandLight : colors.textSecondary,
          fontFamily: fonts.sansBold,
          fontSize: 11,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function defaultLocalDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

function combineDateTime(date: string, time: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const t = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m || !t) return null;
  const yr = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const dy = Number(m[3]);
  const hr = Number(t[1]);
  const mi = Number(t[2]);
  if (
    !Number.isFinite(yr) ||
    !Number.isFinite(mo) ||
    !Number.isFinite(dy) ||
    !Number.isFinite(hr) ||
    !Number.isFinite(mi) ||
    hr > 23 ||
    mi > 59
  )
    return null;
  return new Date(yr, mo, dy, hr, mi, 0, 0);
}

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
    borderRadius: radii.md,
    marginTop: 8,
    backgroundColor: colors.ink,
  },
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1.5,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
