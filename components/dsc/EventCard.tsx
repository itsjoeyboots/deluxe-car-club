import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { colors, fonts, radii } from '@/lib/theme';
import type { EventTier } from '@/types/db';
import type { EventWithRsvp } from '@/hooks/use-events';
import { Text } from './Text';

const tierLabel: Record<EventTier, string> = {
  approved: 'All approved',
  drivers: 'Drivers+',
  collector: 'Collector only',
};

export function EventCard({ event }: { event: EventWithRsvp }) {
  const start = new Date(event.starts_at);
  const dateLine = start.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeLine = start.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  const cap = event.capacity;
  const full =
    cap != null && event.going_count >= cap;

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/events/[id]', params: { id: event.id } })
      }
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.92 : 1 }]}
    >
      {event.hero_image_url ? (
        <Image
          source={{ uri: event.hero_image_url }}
          style={styles.hero}
          contentFit="cover"
          transition={120}
        />
      ) : (
        <View style={[styles.hero, styles.heroPlaceholder]}>
          <Text variant="eyebrow" tone="onDark">
            DSC
          </Text>
        </View>
      )}
      <View style={styles.body}>
        <Text variant="eyebrow" tone="terracotta">
          {dateLine} · {timeLine}
        </Text>
        <Text variant="h2" numberOfLines={2} style={{ marginTop: 4 }}>
          {event.title}
        </Text>
        {event.location_name ? (
          <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
            {event.location_name}
          </Text>
        ) : null}

        <View style={styles.footerRow}>
          <View style={styles.tierBadge}>
            <Text style={styles.tierBadgeText}>{tierLabel[event.tier_required]}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            {event.my_rsvp ? (
              <View style={styles.rsvpDot}>
                <Text style={styles.rsvpDotText}>
                  {event.my_rsvp.status === 'waitlist' ? 'WAITLIST' : 'GOING'}
                </Text>
              </View>
            ) : null}
            <Text variant="caption" tone="muted">
              {cap != null
                ? `${event.going_count}/${cap}${full ? ' · full' : ''}`
                : `${event.going_count} going`}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  hero: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.ink,
  },
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 16,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  tierBadge: {
    backgroundColor: colors.sand,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tierBadgeText: {
    color: colors.textSecondary,
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  rsvpDot: {
    backgroundColor: colors.terracottaDeep,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  rsvpDotText: {
    color: colors.sandLight,
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1,
  },
});
