import { useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  Button,
  Card,
  Divider,
  QRCode,
  Screen,
  Text,
} from '@/components/dsc';
import { useAuth } from '@/lib/auth-context';
import { useEvent, rsvpToEvent, cancelRsvp } from '@/hooks/use-events';
import { supabase } from '@/lib/supabase';
import { colors, radii } from '@/lib/theme';
import { deriveMembershipState, type MembershipState } from '@/lib/membership';
import type { EventTier, MemberStatus } from '@/types/db';

const TIER_LABEL: Record<EventTier, string> = {
  approved: 'All approved members',
  drivers: 'Base members',
  collector: 'Season Pass holders',
};

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile, session } = useAuth();
  const { event, loading, error, refresh } = useEvent(id);
  const [busy, setBusy] = useState(false);

  const userId = session?.user.id;
  const status: MemberStatus = profile?.status ?? 'guest';
  const membership = deriveMembershipState(profile);

  if (loading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Event', headerShown: true }} />
        <Text tone="muted">Loading…</Text>
      </Screen>
    );
  }

  if (error || !event) {
    return (
      <Screen contentContainerStyle={{ gap: 14 }}>
        <Stack.Screen options={{ title: 'Event', headerShown: true }} />
        <Text variant="display">Event not found</Text>
        <Text tone="muted">{error ?? 'It may have been cancelled or removed.'}</Text>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const start = new Date(event.starts_at);
  const end = event.ends_at ? new Date(event.ends_at) : null;
  const dateLine = start.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const timeLine = `${start.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })}${end ? ' – ' + end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : ''}`;

  const cap = event.capacity;
  const full = cap != null && event.going_count >= cap;
  const isPast = start.getTime() < Date.now();
  const tierAllowed = tierMeetsRequirement(event.tier_required, status, membership);

  async function handleRsvp() {
    if (!userId) {
      showError('Not signed in', 'Sign in again before RSVP.');
      return;
    }
    if (!event) return;
    setBusy(true);
    const result = await rsvpToEvent(
      event.id,
      userId,
      event.capacity,
      event.going_count,
    );
    setBusy(false);
    if (!result.ok) {
      console.error('[event] rsvp failed', result.error);
      showError('Could not RSVP', result.error);
      return;
    }
    refresh();
  }

  async function handleCancel() {
    if (!event?.my_rsvp) return;
    setBusy(true);
    const result = await cancelRsvp(event.my_rsvp.id);
    setBusy(false);
    if (!result.ok) {
      showError('Could not cancel', result.error ?? 'Unknown error');
      return;
    }
    refresh();
  }

  async function handleDeleteEvent() {
    if (!event) return;
    const confirmed = await confirmAction(
      'Delete event?',
      'This removes the event and all RSVPs for it. This cannot be undone.',
    );
    if (!confirmed) return;
    setBusy(true);
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', event.id);
    setBusy(false);
    if (error) {
      console.error('[event] delete failed', error);
      showError('Could not delete', error.message);
      return;
    }
    router.replace('/(tabs)/events');
  }

  async function handleCancelEvent() {
    if (!event) return;
    const confirmed = await confirmAction(
      'Cancel event?',
      'Members will see it as cancelled but the record stays. Use Delete instead to wipe it entirely.',
    );
    if (!confirmed) return;
    setBusy(true);
    const { error } = await supabase
      .from('events')
      .update({ status: 'cancelled' })
      .eq('id', event.id);
    setBusy(false);
    if (error) {
      console.error('[event] cancel failed', error);
      showError('Could not cancel', error.message);
      return;
    }
    refresh();
  }

  function openMap() {
    if (!event?.location_name && !event?.address) return;
    const query = encodeURIComponent(
      [event?.location_name, event?.address].filter(Boolean).join(', '),
    );
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?q=${query}`
        : `https://maps.google.com/?q=${query}`;
    Linking.openURL(url).catch(() => {});
  }

  return (
    <Screen contentContainerStyle={{ gap: 16 }}>
      <Stack.Screen options={{ title: 'Event', headerShown: true }} />

      {event.hero_image_url ? (
        <Image
          source={{ uri: event.hero_image_url }}
          style={styles.hero}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View style={[styles.hero, styles.heroPlaceholder]}>
          <Text variant="eyebrow" tone="onDark">
            Deluxe Car Club
          </Text>
        </View>
      )}

      <View>
        <Text variant="eyebrow" tone="terracotta">
          {dateLine}
        </Text>
        <Text variant="display" style={{ marginTop: 4 }}>
          {event.title}
        </Text>
        <Text variant="bodyBold" tone="secondary" style={{ marginTop: 6 }}>
          {timeLine}
        </Text>
      </View>

      {event.location_name || event.address ? (
        <Pressable onPress={openMap}>
          <Card>
            <Text variant="eyebrow" tone="muted">
              Location
            </Text>
            {event.location_name ? (
              <Text variant="bodyBold" style={{ marginTop: 4 }}>
                {event.location_name}
              </Text>
            ) : null}
            {event.address ? (
              <Text variant="small" tone="muted" style={{ marginTop: 2 }}>
                {event.address}
              </Text>
            ) : null}
            <Text variant="caption" tone="terracotta" style={{ marginTop: 6 }}>
              TAP TO OPEN IN MAPS
            </Text>
          </Card>
        </Pressable>
      ) : null}

      {event.description ? (
        <Card>
          <Text variant="eyebrow" tone="muted">
            About
          </Text>
          <Text style={{ marginTop: 6 }}>{event.description}</Text>
        </Card>
      ) : null}

      <Card variant="inset">
        <View style={styles.metaRow}>
          <View>
            <Text variant="caption" tone="muted">
              ACCESS
            </Text>
            <Text variant="bodyBold" style={{ marginTop: 2 }}>
              {TIER_LABEL[event.tier_required]}
            </Text>
          </View>
          <View>
            <Text variant="caption" tone="muted">
              CAPACITY
            </Text>
            <Text variant="bodyBold" style={{ marginTop: 2 }}>
              {cap == null
                ? `${event.going_count} going`
                : `${event.going_count}/${cap}${full ? ' · full' : ''}`}
            </Text>
          </View>
          {event.guest_passes_allowed ? (
            <View>
              <Text variant="caption" tone="muted">
                GUEST PASSES
              </Text>
              <Text variant="bodyBold" style={{ marginTop: 2 }}>
                Allowed
              </Text>
            </View>
          ) : null}
        </View>
      </Card>

      <Divider />

      {event.my_rsvp && event.my_rsvp.status !== 'cancelled' ? (
        <View style={{ gap: 10 }}>
          <Card style={{ borderLeftWidth: 4, borderLeftColor: colors.gold }}>
            <Text variant="eyebrow" style={{ color: colors.gold }}>
              {event.my_rsvp.status === 'waitlist'
                ? 'You’re on the waitlist'
                : 'You’re going'}
            </Text>
            <Text variant="bodyBold" style={{ marginTop: 6 }}>
              Show this at check-in
            </Text>
            <View style={{ marginTop: 12, alignItems: 'center' }}>
              <QRCode value={event.my_rsvp.qr_code_token} size={200} />
            </View>
            {event.my_rsvp.checked_in_at ? (
              <Text variant="caption" tone="terracotta" style={{ marginTop: 10, textAlign: 'center' }}>
                CHECKED IN ·{' '}
                {new Date(event.my_rsvp.checked_in_at).toLocaleTimeString(
                  undefined,
                  { hour: 'numeric', minute: '2-digit' },
                )}
              </Text>
            ) : (
              <Text variant="caption" tone="muted" style={{ marginTop: 10, textAlign: 'center' }}>
                A founder will scan this when you arrive.
              </Text>
            )}
          </Card>
          <Button
            label={busy ? 'Cancelling…' : 'Cancel RSVP'}
            variant="danger"
            fullWidth
            loading={busy}
            onPress={handleCancel}
          />
        </View>
      ) : isPast ? (
        <Card variant="inset">
          <Text variant="bodyBold">This event has happened.</Text>
          <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
            Recap photos will land here in Phase 8.
          </Text>
        </Card>
      ) : !tierAllowed ? (
        <Card variant="inset" style={{ borderLeftWidth: 4, borderLeftColor: colors.danger }}>
          <Text variant="bodyBold">{TIER_LABEL[event.tier_required]} only.</Text>
          <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
            {gateCopy(event.tier_required, status, membership)}
          </Text>
        </Card>
      ) : (
        <Button
          label={
            busy
              ? 'Holding spot…'
              : full
                ? 'Join Waitlist'
                : 'RSVP'
          }
          size="lg"
          fullWidth
          loading={busy}
          onPress={handleRsvp}
        />
      )}

      {profile?.role === 'admin' ? (
        <View style={{ gap: 10, marginTop: 8 }}>
          <Divider />
          <Text variant="eyebrow" tone="muted">
            Admin actions
          </Text>
          <Button
            label="Edit Event"
            variant="secondary"
            fullWidth
            onPress={() =>
              router.push({
                pathname: '/admin/events/[id]/edit',
                params: { id: event.id },
              })
            }
            disabled={busy}
          />
          <Button
            label="Scan Attendees"
            fullWidth
            onPress={() =>
              router.push({
                pathname: '/admin/scan',
                params: { event: event.id, eventTitle: event.title },
              })
            }
            disabled={busy}
          />
          {event.status !== 'cancelled' ? (
            <Button
              label="Cancel Event"
              variant="secondary"
              fullWidth
              onPress={handleCancelEvent}
              disabled={busy}
            />
          ) : (
            <Card variant="inset">
              <Text variant="bodyBold">This event is cancelled.</Text>
              <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
                Members see it marked cancelled. Delete below to remove
                permanently.
              </Text>
            </Card>
          )}
          <Button
            label="Delete Event"
            variant="danger"
            fullWidth
            onPress={handleDeleteEvent}
            disabled={busy}
          />
        </View>
      ) : null}
    </Screen>
  );
}

function tierMeetsRequirement(
  required: EventTier,
  status: MemberStatus,
  membership: MembershipState,
): boolean {
  // Must be at least approved to RSVP at all.
  if (status !== 'approved' && status !== 'paid') return false;
  if (required === 'approved') return true;
  // 'drivers' (legacy) → requires active base membership
  if (required === 'drivers') return membership.hasActiveBase;
  // 'collector' (legacy) → requires Season Pass add-on
  if (required === 'collector') return membership.hasSeasonPass;
  return false;
}

function gateCopy(
  required: EventTier,
  status: MemberStatus,
  membership: MembershipState,
): string {
  if (status !== 'approved' && status !== 'paid') {
    return 'Application approval required before you can RSVP.';
  }
  if (required === 'drivers' && !membership.hasActiveBase) {
    return 'Activate your base membership to RSVP.';
  }
  if (required === 'collector' && !membership.hasSeasonPass) {
    return 'Season Pass holders only — rallies, garage hangs, exclusive events.';
  }
  return 'You don’t meet the membership requirement for this one.';
}

function showError(title: string, message: string) {
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
      { text: 'Confirm', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
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
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },
});
