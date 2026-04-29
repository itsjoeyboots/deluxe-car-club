import { View } from 'react-native';
import { Card, Screen, Text } from '@/components/dsc';

export default function DirectoryScreen() {
  return (
    <Screen contentContainerStyle={{ paddingTop: 24, gap: 16 }}>
      <View>
        <Text variant="eyebrow" tone="terracotta">
          The Roster
        </Text>
        <Text variant="display" style={{ marginTop: 4 }}>
          Member Directory
        </Text>
        <Text variant="small" tone="muted" style={{ marginTop: 8 }}>
          Browse approved members, filter by car, city, and tier. Paid members
          can DM. Approved applicants see a limited view.
        </Text>
      </View>
      <Card variant="inset">
        <Text variant="h3">Phase 7 — coming up</Text>
        <Text variant="small" tone="muted" style={{ marginTop: 6 }}>
          Filters, profile cards, badges, build galleries, privacy controls.
        </Text>
      </Card>
    </Screen>
  );
}
