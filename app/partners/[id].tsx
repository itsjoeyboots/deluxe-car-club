import { useState } from 'react';
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
  Button,
  Card,
  Divider,
  MemberCard,
  Screen,
  Text,
  type Tier,
} from '@/components/dsc';
import { useAuth } from '@/lib/auth-context';
import { usePartner, PARTNER_CATEGORY_LABEL, type PartnerCategory } from '@/hooks/use-partners';
import { colors, fonts, radii } from '@/lib/theme';

export default function PartnerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const { partner, loading, error } = usePartner(id);
  const [showCard, setShowCard] = useState(false);

  if (loading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Partner', headerShown: true }} />
        <Text tone="muted">Loading…</Text>
      </Screen>
    );
  }
  if (error || !partner) {
    return (
      <Screen contentContainerStyle={{ gap: 14 }}>
        <Stack.Screen options={{ title: 'Partner', headerShown: true }} />
        <Text variant="display">Partner not found</Text>
        <Text tone="muted">{error ?? 'Removed or never published.'}</Text>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const cats = (partner.service_categories ?? []) as PartnerCategory[];
  const isApproved =
    profile?.status === 'approved' || profile?.status === 'paid';

  function openMap() {
    if (!partner?.location_name && !partner?.address) return;
    const query = encodeURIComponent(
      [partner?.location_name, partner?.address].filter(Boolean).join(', '),
    );
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?q=${query}`
        : `https://maps.google.com/?q=${query}`;
    Linking.openURL(url).catch(() => {});
  }

  function openLink(value: string) {
    if (!value) return;
    let url = value;
    if (!/^https?:\/\//i.test(url) && !/^mailto:|^tel:/i.test(url)) {
      url = `https://${url}`;
    }
    Linking.openURL(url).catch(() => {});
  }

  const contactEntries = Object.entries(partner.contact_info ?? {});

  return (
    <Screen contentContainerStyle={{ gap: 16, paddingTop: 8 }}>
      <Stack.Screen
        options={{ title: partner.name, headerShown: true }}
      />

      {partner.hero_image_url ? (
        <Image
          source={{ uri: partner.hero_image_url }}
          style={styles.hero}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <View style={[styles.hero, styles.heroPlaceholder]}>
          <Text style={styles.heroLetter}>
            {partner.name.slice(0, 1).toUpperCase()}
          </Text>
        </View>
      )}

      <View>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Text variant="display" style={{ flex: 1 }}>
            {partner.name}
          </Text>
          {partner.featured ? (
            <View style={styles.featuredPill}>
              <Text style={styles.featuredText}>FEATURED</Text>
            </View>
          ) : null}
        </View>
        {partner.location_name ? (
          <Text variant="bodyBold" tone="secondary" style={{ marginTop: 4 }}>
            {partner.location_name}
          </Text>
        ) : null}
      </View>

      {cats.length > 0 ? (
        <View style={styles.cats}>
          {cats.map((c) => (
            <View key={c} style={styles.catTag}>
              <Text style={styles.catTagText}>
                {PARTNER_CATEGORY_LABEL[c] ?? c}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {partner.discount_terms ? (
        <Card style={{ borderLeftWidth: 4, borderLeftColor: colors.terracotta }}>
          <Text variant="eyebrow" tone="terracotta">
            Member discount
          </Text>
          <Text variant="bodyBold" style={{ marginTop: 6 }}>
            {partner.discount_terms}
          </Text>
        </Card>
      ) : null}

      {partner.description ? (
        <Card>
          <Text variant="eyebrow" tone="muted">
            About
          </Text>
          <Text style={{ marginTop: 6 }}>{partner.description}</Text>
        </Card>
      ) : null}

      {partner.location_name || partner.address ? (
        <Pressable onPress={openMap}>
          <Card>
            <Text variant="eyebrow" tone="muted">
              Location
            </Text>
            {partner.location_name ? (
              <Text variant="bodyBold" style={{ marginTop: 4 }}>
                {partner.location_name}
              </Text>
            ) : null}
            {partner.address ? (
              <Text variant="small" tone="muted" style={{ marginTop: 2 }}>
                {partner.address}
              </Text>
            ) : null}
            <Text variant="caption" tone="terracotta" style={{ marginTop: 6 }}>
              TAP TO OPEN IN MAPS
            </Text>
          </Card>
        </Pressable>
      ) : null}

      {contactEntries.length > 0 ? (
        <Card>
          <Text variant="eyebrow" tone="muted">
            Contact
          </Text>
          <View style={{ marginTop: 8, gap: 8 }}>
            {contactEntries.map(([key, value]) => (
              <Pressable key={key} onPress={() => openLink(String(value ?? ''))}>
                <View style={styles.contactRow}>
                  <Text variant="caption" tone="muted">
                    {key.toUpperCase()}
                  </Text>
                  <Text variant="bodyBold" tone="terracotta">
                    {String(value)}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </Card>
      ) : null}

      <Divider />

      {isApproved && profile ? (
        <Button
          label="Show My Card"
          size="lg"
          fullWidth
          onPress={() => setShowCard(true)}
        />
      ) : (
        <Card variant="inset">
          <Text variant="bodyBold">Members only</Text>
          <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
            Get approved to redeem this discount in-store.
          </Text>
        </Card>
      )}

      {profile?.role === 'admin' ? (
        <Button
          label="Edit Partner"
          variant="secondary"
          fullWidth
          onPress={() =>
            router.push({
              pathname: '/admin/partners/[id]/edit',
              params: { id: partner.id },
            })
          }
        />
      ) : null}

      <Modal
        visible={showCard}
        animationType="fade"
        transparent
        onRequestClose={() => setShowCard(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowCard(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={{ alignItems: 'flex-end' }}>
              <Pressable
                onPress={() => setShowCard(false)}
                style={styles.closeBtn}
              >
                <Text style={styles.closeText}>×</Text>
              </Pressable>
            </View>
            <Text variant="eyebrow" tone="muted" style={{ textAlign: 'center' }}>
              Show this to the shop
            </Text>
            {profile ? (
              <View style={{ marginTop: 12 }}>
                <MemberCard
                  profile={profile}
                  tier={mapTier(profile.status, profile.tier, profile.role)}
                />
              </View>
            ) : null}
            <Text
              variant="caption"
              tone="muted"
              style={{ textAlign: 'center', marginTop: 14 }}
            >
              Shops scan the QR or note your member number to apply the
              discount.
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function mapTier(
  status: string | null | undefined,
  tier: string | null | undefined,
  role: string | null | undefined,
): Tier {
  if (role === 'admin') return 'admin';
  if (status === 'paid' && tier === 'collector') return 'collector';
  if (status === 'paid' && tier === 'drivers') return 'drivers';
  if (status === 'approved') return 'approved';
  if (status === 'pending') return 'pending';
  return 'guest';
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
  heroLetter: {
    color: colors.terracotta,
    fontFamily: fonts.serif,
    fontSize: 64,
    letterSpacing: 2,
  },
  featuredPill: {
    backgroundColor: colors.terracotta,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  featuredText: {
    color: colors.ink,
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1,
  },
  cats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  catTag: {
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catTagText: {
    color: colors.textSecondary,
    fontFamily: fonts.sansBold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeText: {
    color: colors.textPrimary,
    fontSize: 22,
    lineHeight: 22,
  },
});
