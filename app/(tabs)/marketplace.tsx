import { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import {
  Button,
  Card,
  Divider,
  PartnerCard,
  Screen,
  SkeletonCard,
  Text,
} from '@/components/dsc';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import {
  PARTNER_CATEGORIES,
  PARTNER_CATEGORY_LABEL,
  usePartners,
  type PartnerCategory,
} from '@/hooks/use-partners';
import { colors, fonts, radii } from '@/lib/theme';
import { MEMBERSHIP, deriveMembershipState, formatUntil } from '@/lib/membership';

type CategoryFilter = 'all' | PartnerCategory;

export default function MarketplaceScreen() {
  const { profile } = useAuth();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const { partners, total, loading, error } = usePartners({ search, category });

  const membership = deriveMembershipState(profile);
  const isAdmin = profile?.role === 'admin';
  const canBrowse = membership.hasMarketplaceAddon || isAdmin;

  if (!canBrowse) {
    return (
      <Screen contentContainerStyle={{ paddingTop: 24, gap: 16 }}>
        <View>
          <Text variant="eyebrow" tone="terracotta">
            Add-on Required
          </Text>
          <Text variant="display" style={{ marginTop: 4 }}>
            Marketplace
          </Text>
          <Text variant="small" tone="muted" style={{ marginTop: 8 }}>
            The Marketplace is a paid add-on. Unlock the full partner shop
            directory and DCC member discounts at every shop we work with.
          </Text>
        </View>

        <Card variant="raised">
          <Text variant="eyebrow" tone="terracotta">
            {MEMBERSHIP.marketplaceAddon.label}
          </Text>
          <Text variant="display" style={{ marginTop: 4 }}>
            ${MEMBERSHIP.marketplaceAddon.annual}
            <Text variant="small" tone="muted">
              {' '}/yr
            </Text>
          </Text>
          <Text variant="small" tone="secondary" style={{ marginTop: 8 }}>
            {MEMBERSHIP.marketplaceAddon.blurb}
          </Text>
          <Button
            label="Activate Marketplace"
            size="lg"
            fullWidth
            style={{ marginTop: 16 }}
            onPress={() => {
              if (typeof window !== 'undefined') {
                window.alert(
                  'Activation flow ships when Stripe is wired. Founders can grant access via the admin panel for now.',
                );
              }
            }}
          />
        </Card>

        <Card variant="inset">
          <Text variant="bodyBold">What you get</Text>
          <Text variant="small" tone="muted" style={{ marginTop: 6 }}>
            · Full partner shop directory{'\n'}
            · DCC member discounts at every shop{'\n'}
            · Show My Card for in-store verification{'\n'}
            · Featured deals + new partner alerts
          </Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={{ paddingTop: 24, gap: 16 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text variant="eyebrow" tone="terracotta">
            Marketplace · Active
          </Text>
          <Text variant="display" style={{ marginTop: 4 }}>
            Partner Shops
          </Text>
          <Text variant="small" tone="muted" style={{ marginTop: 8 }}>
            Wraps, performance, detailing, tints, audio — discounts and tour
            days from shops we trust. Show your card to redeem.
          </Text>
          {membership.marketplaceAddonUntil ? (
            <Text variant="caption" tone="muted" style={{ marginTop: 4 }}>
              ADD-ON RENEWS {formatUntil(membership.marketplaceAddonUntil)?.toUpperCase()}
            </Text>
          ) : null}
        </View>
        {isAdmin ? (
          <Button
            label="New Partner"
            size="sm"
            onPress={() => router.push('/admin/partners/new')}
          />
        ) : null}
      </View>

      <View style={styles.searchBox}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search shops, locations…"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -2 }}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
      >
        <Pill
          active={category === 'all'}
          label="All"
          onPress={() => setCategory('all')}
        />
        {PARTNER_CATEGORIES.map((c) => (
          <Pill
            key={c}
            active={category === c}
            label={PARTNER_CATEGORY_LABEL[c]}
            onPress={() => setCategory(c)}
          />
        ))}
      </ScrollView>

      {error ? (
        <Card variant="inset">
          <Text tone="muted">Couldn{'’'}t load partners: {error}</Text>
        </Card>
      ) : loading ? (
        <View style={{ gap: 14 }}>
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : partners.length === 0 ? (
        <Card variant="inset">
          <Text variant="bodyBold">
            {total === 0 ? 'No partner shops yet.' : 'No matches.'}
          </Text>
          <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
            {total === 0
              ? 'Founders are still onboarding the first round. Check back soon.'
              : 'Try a different search or category.'}
          </Text>
        </Card>
      ) : (
        <View style={{ gap: 14 }}>
          {partners.map((p) => (
            <PartnerCard key={p.id} partner={p} />
          ))}
        </View>
      )}

      <Divider />

      <SuggestPartner />
    </Screen>
  );
}

function SuggestPartner() {
  const { profile } = useAuth();
  const [name, setName] = useState('');
  const [why, setWhy] = useState('');
  const [contact, setContact] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isApproved =
    profile?.status === 'approved' || profile?.status === 'paid';

  if (submitted) {
    return (
      <Card variant="inset">
        <Text variant="bodyBold">Thanks for the tip.</Text>
        <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
          Founders will review the suggestion and reach out to the shop.
        </Text>
      </Card>
    );
  }

  if (!isApproved) {
    return (
      <Card variant="inset">
        <Text variant="bodyBold">Got a shop founders should partner with?</Text>
        <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
          Once your application is approved, you can suggest partners here.
        </Text>
      </Card>
    );
  }

  async function submit() {
    if (!profile?.id) return;
    if (!name.trim()) {
      showError('Name required', 'Tell us which shop.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.from('partner_suggestions').insert({
      suggested_by: profile.id,
      name: name.trim(),
      why: why.trim() || null,
      contact_info: contact.trim() || null,
    });
    setBusy(false);
    if (error) {
      console.error('[marketplace] suggestion failed', error);
      showError('Could not submit', error.message);
      return;
    }
    setName('');
    setWhy('');
    setContact('');
    setSubmitted(true);
  }

  return (
    <Card>
      <Text variant="eyebrow" tone="muted">
        Suggest a partner
      </Text>
      <Text variant="bodyBold" style={{ marginTop: 4 }}>
        Know a great shop?
      </Text>
      <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
        Drop a name and why members would dig it. Founders take it from there.
      </Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Shop name"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { marginTop: 12 }]}
      />
      <TextInput
        value={why}
        onChangeText={setWhy}
        placeholder="Why they're a fit (optional)"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { marginTop: 8, minHeight: 70, textAlignVertical: 'top' }]}
        multiline
      />
      <TextInput
        value={contact}
        onChangeText={setContact}
        placeholder="Contact (Instagram / phone / website, optional)"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { marginTop: 8 }]}
      />
      <Button
        label={busy ? 'Submitting…' : 'Submit suggestion'}
        size="sm"
        loading={busy}
        onPress={submit}
        style={{ marginTop: 12 }}
      />
    </Card>
  );
}

function Pill({
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
        styles.pill,
        {
          backgroundColor: active ? colors.terracottaDeep : 'transparent',
          borderColor: active ? colors.terracottaDeep : colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: active ? colors.ink : colors.textSecondary,
          fontFamily: fonts.sansBold,
          fontSize: 11,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function showError(title: string, message: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

const styles = StyleSheet.create({
  searchBox: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
  },
  searchInput: {
    color: colors.textPrimary,
    fontFamily: fonts.sans,
    fontSize: 15,
    paddingVertical: 12,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1.5,
  },
  input: {
    backgroundColor: colors.ink,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontFamily: fonts.sans,
    fontSize: 14,
  },
});
