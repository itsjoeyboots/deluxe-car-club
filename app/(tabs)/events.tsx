import { View } from 'react-native';
import { Card, Screen, Text } from '@/components/dsc';

export default function EventsScreen() {
  return (
    <Screen contentContainerStyle={{ paddingTop: 24, gap: 16 }}>
      <View>
        <Text variant="eyebrow" tone="terracotta">
          Schedule
        </Text>
        <Text variant="display" style={{ marginTop: 4 }}>
          Events
        </Text>
        <Text variant="small" tone="muted" style={{ marginTop: 8 }}>
          Cars & coffee, rallies, garage hangs, tech nights, and shop tours.
          RSVP, get a unique QR for check-in, earn points on arrival.
        </Text>
      </View>
      <Card variant="inset">
        <Text variant="h3">Phase 4 — coming up</Text>
        <Text variant="small" tone="muted" style={{ marginTop: 6 }}>
          Calendar (list + month grid), event detail page, RSVP, capacity +
          waitlist, push reminders 24 hours out.
        </Text>
      </Card>
    </Screen>
  );
}
