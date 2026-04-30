import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import {
  Button,
  Card,
  EventCard,
  Screen,
  Text,
} from '@/components/dsc';
import { useAuth } from '@/lib/auth-context';
import { useEvents } from '@/hooks/use-events';
import { colors, fonts, radii } from '@/lib/theme';

type Range = 'upcoming' | 'past';

export default function EventsScreen() {
  const { profile } = useAuth();
  const [range, setRange] = useState<Range>('upcoming');
  const { events, loading, refresh } = useEvents(range);

  const isApproved =
    profile?.status === 'approved' || profile?.status === 'paid';

  return (
    <Screen contentContainerStyle={{ paddingTop: 24, gap: 18 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text variant="eyebrow" tone="terracotta">
            Schedule
          </Text>
          <Text variant="display" style={{ marginTop: 4 }}>
            Events
          </Text>
          <Text variant="small" tone="muted" style={{ marginTop: 8 }}>
            Cars & coffee, rallies, garage hangs, tech nights, shop tours.
          </Text>
        </View>
        {profile?.role === 'admin' ? (
          <Button
            label="New Event"
            size="sm"
            onPress={() => router.push('/admin/events/new')}
          />
        ) : null}
      </View>

      <View style={styles.toggleRow}>
        <ToggleTab
          active={range === 'upcoming'}
          label="Upcoming"
          onPress={() => setRange('upcoming')}
        />
        <ToggleTab
          active={range === 'past'}
          label="Past"
          onPress={() => setRange('past')}
        />
        <Pressable onPress={() => refresh()} style={styles.refreshBtn}>
          <Text style={styles.refreshText}>↻</Text>
        </Pressable>
      </View>

      {!isApproved ? (
        <Card variant="inset">
          <Text variant="bodyBold">You need approval to RSVP.</Text>
          <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
            You can browse events here, but RSVPs unlock once your application
            is approved.
          </Text>
        </Card>
      ) : null}

      {loading ? (
        <Card variant="inset">
          <Text variant="small" tone="muted">
            Loading events…
          </Text>
        </Card>
      ) : events.length === 0 ? (
        <Card variant="inset">
          <Text variant="bodyBold">
            No {range === 'upcoming' ? 'upcoming' : 'past'} events.
          </Text>
          <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
            {range === 'upcoming'
              ? 'Check back after the founders post the next rally schedule.'
              : 'Past events will show up here once we’ve had some.'}
          </Text>
        </Card>
      ) : (
        <View style={{ gap: 14 }}>
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function ToggleTab({
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
        styles.toggle,
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
          fontSize: 12,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  toggle: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1.5,
  },
  refreshBtn: {
    marginLeft: 'auto',
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
});
