import { View } from 'react-native';
import { Card, Screen, Text } from '@/components/dsc';

export default function MarketplaceScreen() {
  return (
    <Screen contentContainerStyle={{ paddingTop: 24, gap: 16 }}>
      <View>
        <Text variant="eyebrow" tone="terracotta">
          Members-Only
        </Text>
        <Text variant="display" style={{ marginTop: 4 }}>
          Partner Shops
        </Text>
        <Text variant="small" tone="muted" style={{ marginTop: 8 }}>
          Wraps, performance, detailing, tints, audio — discounts and tour
          days from shops we trust. Show your card to redeem.
        </Text>
      </View>
      <Card variant="inset">
        <Text variant="h3">Phase 9 — coming up</Text>
        <Text variant="small" tone="muted" style={{ marginTop: 6 }}>
          Partner directory, deal carousel, “show your card” flow, suggestions.
        </Text>
      </Card>
    </Screen>
  );
}
