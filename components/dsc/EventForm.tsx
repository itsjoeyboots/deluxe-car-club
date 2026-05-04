import { useEffect, useState } from 'react';
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
import { supabase } from '@/lib/supabase';
import { pickAndUploadEventHero } from '@/lib/uploads';
import { colors, fonts, radii } from '@/lib/theme';
import type { Event, EventStatus, EventTier } from '@/types/db';
import { Button } from './Button';
import { Card } from './Card';
import { Screen } from './Screen';
import { Text } from './Text';
import { TextField } from './TextField';

const TIERS: { value: EventTier; label: string }[] = [
  { value: 'approved', label: 'All approved' },
  { value: 'drivers', label: 'Drivers+' },
  { value: 'collector', label: 'Collector only' },
];

type Props =
  | { mode: 'create'; userId: string | undefined }
  | { mode: 'edit'; eventId: string };

export function EventForm(props: Props) {
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
  const [status, setStatus] = useState<EventStatus>('upcoming');

  const [loading, setLoading] = useState(props.mode === 'edit');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyAction, setBusyAction] = useState<'cancel' | 'restore' | null>(null);

  useEffect(() => {
    if (props.mode !== 'edit') return;
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', props.eventId)
        .maybeSingle();
      if (!active) return;
      if (error || !data) {
        showError('Could not load event', error?.message ?? 'Not found');
        router.back();
        return;
      }
      const e = data as Event;
      setTitle(e.title);
      setDescription(e.description ?? '');
      const starts = new Date(e.starts_at);
      setDate(toDateField(starts));
      setTime(toTimeField(starts));
      setEndTime(e.ends_at ? toTimeField(new Date(e.ends_at)) : '');
      setLocationName(e.location_name ?? '');
      setAddress(e.address ?? '');
      setCapacity(e.capacity ? String(e.capacity) : '');
      setTier(e.tier_required);
      setGuestPasses(e.guest_passes_allowed);
      setHeroUrl(e.hero_image_url);
      setStatus(e.status);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [props]);

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

    const payload = {
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
    };

    setSaving(true);
    try {
      if (props.mode === 'create') {
        if (!props.userId) return;
        const { data, error } = await supabase
          .from('events')
          .insert({ ...payload, status: 'upcoming', created_by: props.userId })
          .select('id')
          .single();
        if (error || !data) {
          console.error('[EventForm] insert failed', error);
          showError('Could not create event', error?.message ?? 'Unknown error');
          return;
        }
        router.replace({ pathname: '/events/[id]', params: { id: data.id } });
        return;
      }

      const { error } = await supabase
        .from('events')
        .update(payload)
        .eq('id', props.eventId);
      if (error) {
        console.error('[EventForm] update failed', error);
        showError('Could not save', error.message);
        return;
      }
      router.back();
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(next: EventStatus) {
    if (props.mode !== 'edit') return;
    if (next === 'cancelled') {
      const ok = await confirmAction(
        'Cancel event?',
        'Members keep their RSVPs but the event will show as cancelled. You can restore it later.',
      );
      if (!ok) return;
    }
    setBusyAction(next === 'cancelled' ? 'cancel' : 'restore');
    const { error } = await supabase
      .from('events')
      .update({ status: next })
      .eq('id', props.eventId);
    setBusyAction(null);
    if (error) {
      showError('Could not update status', error.message);
      return;
    }
    setStatus(next);
  }

  if (loading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Event', headerShown: true }} />
        <Text tone="muted">Loading event…</Text>
      </Screen>
    );
  }

  const isEdit = props.mode === 'edit';
  const headerEyebrow = isEdit ? 'Edit event' : 'Founders only';
  const headerTitle = isEdit ? title || 'Edit Event' : 'Create Event';
  const ctaLabel = saving
    ? isEdit
      ? 'Saving…'
      : 'Creating…'
    : isEdit
      ? 'Save Changes'
      : 'Create Event';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <Stack.Screen
        options={{
          title: isEdit ? 'Edit Event' : 'New Event',
          headerShown: true,
        }}
      />
      <Screen contentContainerStyle={{ paddingTop: 16, gap: 18 }}>
        <View>
          <Text variant="eyebrow" tone="terracotta">
            {headerEyebrow}
          </Text>
          <Text variant="display" style={{ marginTop: 4 }} numberOfLines={2}>
            {headerTitle}
          </Text>
          {isEdit && status === 'cancelled' ? (
            <View style={[styles.statusBanner, { backgroundColor: colors.danger }]}>
              <Text style={styles.statusBannerText}>CANCELLED</Text>
            </View>
          ) : null}
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
            label={ctaLabel}
            size="lg"
            fullWidth
            loading={saving}
            onPress={handleSave}
          />
          {isEdit && status !== 'cancelled' ? (
            <Button
              label={busyAction === 'cancel' ? 'Cancelling…' : 'Cancel Event'}
              variant="danger"
              fullWidth
              loading={busyAction === 'cancel'}
              onPress={() => handleStatusChange('cancelled')}
            />
          ) : null}
          {isEdit && status === 'cancelled' ? (
            <Button
              label={busyAction === 'restore' ? 'Restoring…' : 'Restore Event'}
              variant="secondary"
              fullWidth
              loading={busyAction === 'restore'}
              onPress={() => handleStatusChange('upcoming')}
            />
          ) : null}
          <Button
            label="Close"
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

function toDateField(d: Date): string {
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dy = String(d.getDate()).padStart(2, '0');
  return `${yr}-${mo}-${dy}`;
}

function toTimeField(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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

async function confirmAction(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return false;
    return window.confirm(`${title}\n\n${message}`);
  }
  return new Promise<boolean>((resolve) => {
    Alert.alert(title, message, [
      { text: 'Keep', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Confirm', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
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
  statusBanner: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    marginTop: 10,
  },
  statusBannerText: {
    color: colors.textOnDark,
    fontFamily: fonts.sansBold,
    fontSize: 11,
    letterSpacing: 1.5,
  },
});
