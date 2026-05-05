import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fonts, radii } from '@/lib/theme';
import type { EventWithRsvp } from '@/hooks/use-events';
import { Text } from './Text';

/**
 * Compact event row for the home dashboard. A date tile on the left,
 * tight title + meta on the right. Much shorter than the full EventCard.
 */
export function EventListItem({ event }: { event: EventWithRsvp }) {
  const start = new Date(event.starts_at);
  const month = start
    .toLocaleString(undefined, { month: 'short' })
    .toUpperCase();
  const day = start.getDate();
  const weekday = start
    .toLocaleString(undefined, { weekday: 'short' })
    .toUpperCase();
  const timeLine = start.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  const cap = event.capacity;
  const full = cap != null && event.going_count >= cap;
  const meta = [
    timeLine,
    event.location_name,
    cap != null
      ? `${event.going_count}/${cap}${full ? ' · full' : ''}`
      : `${event.going_count} going`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/events/[id]', params: { id: event.id } })
      }
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={styles.dateTile}>
        <Text style={styles.month}>{month}</Text>
        <Text style={styles.day}>{day}</Text>
        <Text style={styles.weekday}>{weekday}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text variant="bodyBold" numberOfLines={1} style={{ flexShrink: 1 }}>
            {event.title}
          </Text>
          {event.my_rsvp ? (
            <View style={styles.rsvpDot}>
              <Text style={styles.rsvpDotText}>
                {event.my_rsvp.status === 'waitlist' ? 'WAITLIST' : 'GOING'}
              </Text>
            </View>
          ) : null}
        </View>
        <Text variant="caption" tone="muted" numberOfLines={1} style={{ marginTop: 4 }}>
          {meta}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  dateTile: {
    width: 56,
    paddingVertical: 8,
    backgroundColor: colors.ink,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.terracottaDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  month: {
    color: colors.terracotta,
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  day: {
    color: colors.textPrimary,
    fontFamily: fonts.serif,
    fontSize: 22,
    lineHeight: 26,
    marginTop: 2,
  },
  weekday: {
    color: colors.textMuted,
    fontFamily: fonts.sansMedium,
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 2,
  },
  rsvpDot: {
    backgroundColor: colors.terracottaDeep,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  rsvpDotText: {
    color: colors.textOnDark,
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 1,
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 22,
  },
});
