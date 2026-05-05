import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Link, router } from 'expo-router';
import {
  Button,
  Screen,
  Text,
  Divider,
} from '@/components/dsc';
import { colors } from '@/lib/theme';
import { MEMBERSHIP } from '@/lib/membership';

const logo = require('@/assets/images/dcc-logo.jpg');

export default function WelcomeScreen() {
  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Image source={logo} style={styles.logo} contentFit="contain" />
        <Text variant="eyebrow" tone="terracotta" style={{ textAlign: 'center' }}>
          Luxury · Community · Excellence
        </Text>
        <Text variant="body" tone="secondary" style={styles.tagline}>
          A members-only automotive lifestyle club. Curated meets, partner
          shop discounts, and a community of builders, drivers, and collectors.
        </Text>
      </View>

      <View style={styles.scarcity}>
        <Text variant="eyebrow" tone="muted">
          How it works
        </Text>
        <Text variant="h2" style={{ marginTop: 6 }}>
          Free to apply · ${MEMBERSHIP.base.annual}/yr after acceptance
        </Text>
        <Text variant="small" tone="muted" style={{ marginTop: 6 }}>
          Add the Marketplace (${MEMBERSHIP.marketplaceAddon.annual}/yr) for
          partner shop discounts. Add the Season Pass ($
          {MEMBERSHIP.seasonPass.monthly}/mo) for full access to every event.
          Cap is {MEMBERSHIP.approvedCap} approved members.
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
          Application is free. Founders review every applicant by hand.
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
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 200,
    height: 200,
    borderRadius: 24,
    marginBottom: 4,
  },
  tagline: {
    marginTop: 8,
    maxWidth: 360,
    textAlign: 'center',
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
