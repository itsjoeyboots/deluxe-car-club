import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { colors, fonts, radii } from '@/lib/theme';
import {
  PARTNER_CATEGORY_LABEL,
  type PartnerCategory,
} from '@/hooks/use-partners';
import type { Partner } from '@/types/db';
import { Text } from './Text';

export function PartnerCard({ partner }: { partner: Partner }) {
  const cats = (partner.service_categories ?? []) as PartnerCategory[];
  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/partners/[id]', params: { id: partner.id } })
      }
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.92 : 1 }]}
    >
      {partner.hero_image_url ? (
        <Image
          source={{ uri: partner.hero_image_url }}
          style={styles.hero}
          contentFit="cover"
          transition={120}
        />
      ) : (
        <View style={[styles.hero, styles.heroPlaceholder]}>
          <Text style={styles.heroLetter}>
            {partner.name.slice(0, 1).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text variant="bodyBold" style={{ flex: 1 }} numberOfLines={1}>
            {partner.name}
          </Text>
          {partner.featured ? (
            <View style={styles.featuredPill}>
              <Text style={styles.featuredText}>FEATURED</Text>
            </View>
          ) : null}
        </View>
        {partner.location_name ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {partner.location_name}
          </Text>
        ) : null}
        {partner.discount_terms ? (
          <Text variant="small" tone="terracotta" style={{ marginTop: 6 }} numberOfLines={2}>
            {partner.discount_terms}
          </Text>
        ) : null}
        {cats.length > 0 ? (
          <View style={styles.cats}>
            {cats.slice(0, 4).map((c) => (
              <View key={c} style={styles.catTag}>
                <Text style={styles.catTagText}>
                  {PARTNER_CATEGORY_LABEL[c] ?? c}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
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
  heroLetter: {
    color: colors.terracotta,
    fontFamily: fonts.serif,
    fontSize: 48,
    letterSpacing: 1,
  },
  body: {
    padding: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featuredPill: {
    backgroundColor: colors.terracotta,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  featuredText: {
    color: colors.ink,
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 1,
  },
  cats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  catTag: {
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catTagText: {
    color: colors.textSecondary,
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
