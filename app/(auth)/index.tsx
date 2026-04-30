import { View, StyleSheet } from 'react-native';
import { Link, router } from 'expo-router';
import {
  Button,
  Screen,
  Text,
  Divider,
} from '@/components/dsc';
import { colors } from '@/lib/theme';
import { MEMBERSHIP } from '@/lib/membership';

export default function WelcomeScreen() {
  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text variant="eyebrow" tone="terracotta">
          Luxury · Community · Excellence
        </Text>
        <Text variant="displayLg" tone="terracotta" style={styles.headline}>
          Deluxe{'\n'}Car{'\n'}Club
        </Text>
        <Text variant="body" tone="secondary" style={styles.tagline}>
          A members-only automotive lifestyle club. Curated meets, partner
          shop discounts, and a community of builders, drivers, and collectors.
        </Text>
      </View>

      <View style={styles.scarcity}>
        <Text variant="eyebrow" tone="muted">
          Strict caps · No gatekeeping
        </Text>
        <Text variant="h2" style={{ marginTop: 6 }}>
          {MEMBERSHIP.approvedCap} approved · {MEMBERSHIP.paidCap} paid spots.
        </Text>
        <Text variant="small" tone="muted" style={{ marginTop: 6 }}>
          When someone steps out, the next on the waitlist is in.
        </Text>
      </View>

      <Divider tone="gold" />

      <View style={{ gap: 12 }}>
        <Button
          label="Sign In"
          variant="primary"
          fullWidth
          size="lg"
          onPress={() => router.push('/(auth)/sign-in')}
        />
        <Button
          label="Apply to Join"
          variant="secondary"
          fullWidth
          size="lg"
          onPress={() => router.push('/(auth)/sign-up')}
        />
      </View>

      <View style={styles.footer}>
        <Text variant="caption" tone="muted">
          Application is ${MEMBERSHIP.applicationFeeUsd}, one-time, non-refundable.
        </Text>
        <Link href="/(auth)/sign-in" asChild>
          <Text variant="caption" style={{ color: colors.terracottaDeep, marginTop: 4 }}>
            Already a member? Sign in
          </Text>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 32,
    gap: 28,
  },
  hero: {
    gap: 12,
  },
  headline: {
    marginTop: 4,
  },
  tagline: {
    marginTop: 8,
    maxWidth: 360,
  },
  scarcity: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 16,
  },
});
