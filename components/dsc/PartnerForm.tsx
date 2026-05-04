import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { pickAndUploadPartnerHero } from '@/lib/uploads';
import {
  PARTNER_CATEGORIES,
  PARTNER_CATEGORY_LABEL,
  type PartnerCategory,
} from '@/hooks/use-partners';
import { colors, fonts, radii } from '@/lib/theme';
import type { Partner } from '@/types/db';
import { Button } from './Button';
import { Card } from './Card';
import { Screen } from './Screen';
import { Text } from './Text';
import { TextField } from './TextField';

type Props =
  | {
      mode: 'create';
      partnerId?: undefined;
      defaults?: { name?: string; contactInfo?: string; suggestionId?: string };
    }
  | { mode: 'edit'; partnerId: string; defaults?: undefined };

type ContactPair = { key: string; value: string };

export function PartnerForm(props: Props) {
  const initialName = props.mode === 'create' ? props.defaults?.name ?? '' : '';
  const initialContacts: ContactPair[] =
    props.mode === 'create' && props.defaults?.contactInfo
      ? [{ key: 'note', value: props.defaults.contactInfo }]
      : [{ key: 'website', value: '' }];

  const [name, setName] = useState(initialName);
  const [locationName, setLocationName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [discountTerms, setDiscountTerms] = useState('');
  const [heroUrl, setHeroUrl] = useState<string | null>(null);
  const [categories, setCategories] = useState<Set<PartnerCategory>>(new Set());
  const [contacts, setContacts] = useState<ContactPair[]>(initialContacts);
  const [featured, setFeatured] = useState(false);

  const [loading, setLoading] = useState(props.mode === 'edit');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (props.mode !== 'edit') return;
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('id', props.partnerId)
        .maybeSingle();
      if (!active) return;
      if (error || !data) {
        showError('Could not load', error?.message ?? 'Not found');
        router.back();
        return;
      }
      const p = data as Partner;
      setName(p.name);
      setLocationName(p.location_name ?? '');
      setAddress(p.address ?? '');
      setDescription(p.description ?? '');
      setDiscountTerms(p.discount_terms ?? '');
      setHeroUrl(p.hero_image_url);
      setCategories(new Set((p.service_categories ?? []) as PartnerCategory[]));
      const ci = p.contact_info ?? {};
      setContacts(
        Object.keys(ci).length === 0
          ? [{ key: 'website', value: '' }]
          : Object.entries(ci).map(([k, v]) => ({ key: k, value: String(v ?? '') })),
      );
      setFeatured(p.featured);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [props]);

  function toggleCategory(cat: PartnerCategory) {
    setCategories((cur) => {
      const next = new Set(cur);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  function setContact(idx: number, field: 'key' | 'value', val: string) {
    setContacts((cur) =>
      cur.map((c, i) => (i === idx ? { ...c, [field]: val } : c)),
    );
  }

  function addContactRow() {
    setContacts((cur) => [...cur, { key: '', value: '' }]);
  }

  function removeContactRow(idx: number) {
    setContacts((cur) => cur.filter((_, i) => i !== idx));
  }

  async function handlePickHero() {
    setUploading(true);
    const result = await pickAndUploadPartnerHero();
    setUploading(false);
    if (!result.ok) {
      if ('cancelled' in result) return;
      showError('Upload failed', result.error);
      return;
    }
    setHeroUrl(result.publicUrl);
  }

  async function handleSave() {
    if (!name.trim()) {
      showError('Missing info', 'Name is required.');
      return;
    }
    const contact_info = contacts
      .filter((c) => c.key.trim() && c.value.trim())
      .reduce<Record<string, string>>((acc, c) => {
        acc[c.key.trim()] = c.value.trim();
        return acc;
      }, {});

    const payload = {
      name: name.trim(),
      location_name: locationName.trim() || null,
      address: address.trim() || null,
      description: description.trim() || null,
      discount_terms: discountTerms.trim() || null,
      hero_image_url: heroUrl,
      service_categories: Array.from(categories),
      contact_info,
      featured,
    };

    setSaving(true);
    try {
      if (props.mode === 'create') {
        const { data, error } = await supabase
          .from('partners')
          .insert(payload)
          .select('id')
          .single();
        if (error || !data) {
          console.error('[PartnerForm] insert failed', error, payload);
          showError('Could not save', error?.message ?? 'Unknown error');
          return;
        }
        if (props.defaults?.suggestionId) {
          await supabase
            .from('partner_suggestions')
            .update({ reviewed: true })
            .eq('id', props.defaults.suggestionId);
        }
        router.replace({ pathname: '/partners/[id]', params: { id: data.id } });
        return;
      }

      const { error } = await supabase
        .from('partners')
        .update(payload)
        .eq('id', props.partnerId);
      if (error) {
        console.error('[PartnerForm] update failed', error, payload);
        showError('Could not save', error.message);
        return;
      }
      router.back();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (props.mode !== 'edit') return;
    const ok = await confirmAction('Delete partner?', 'Removes the partner permanently.');
    if (!ok) return;
    const { error } = await supabase
      .from('partners')
      .delete()
      .eq('id', props.partnerId);
    if (error) showError('Could not delete', error.message);
    else router.replace('/(tabs)/marketplace');
  }

  if (loading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Partner', headerShown: true }} />
        <Text tone="muted">Loading…</Text>
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <Stack.Screen
        options={{
          title: props.mode === 'create' ? 'New Partner' : 'Edit Partner',
          headerShown: true,
        }}
      />
      <Screen contentContainerStyle={{ paddingTop: 16, gap: 18 }}>
        <View>
          <Text variant="eyebrow" tone="terracotta">
            Founders only
          </Text>
          <Text variant="display" style={{ marginTop: 4 }}>
            {props.mode === 'create' ? 'Add a Partner' : 'Edit Partner'}
          </Text>
        </View>

        <Card>
          <Text variant="eyebrow" tone="muted">
            Hero image
          </Text>
          {heroUrl ? (
            <Image source={{ uri: heroUrl }} style={styles.hero} contentFit="cover" />
          ) : (
            <View style={[styles.hero, styles.heroPlaceholder]}>
              <Text variant="caption" tone="onDark">
                NO HERO YET
              </Text>
            </View>
          )}
          <Button
            label={uploading ? 'Uploading…' : heroUrl ? 'Replace Image' : 'Upload Image'}
            variant="secondary"
            size="sm"
            loading={uploading}
            onPress={handlePickHero}
            style={{ marginTop: 10 }}
          />
        </Card>

        <View style={{ gap: 14 }}>
          <TextField label="Name" value={name} onChangeText={setName} />
          <TextField
            label="Location name"
            value={locationName}
            onChangeText={setLocationName}
            placeholder="Sandstorm Auto Spa"
          />
          <TextField
            label="Address"
            value={address}
            onChangeText={setAddress}
            placeholder="Street, city, state"
          />
          <TextField
            label="Description"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            style={{ minHeight: 90, textAlignVertical: 'top' }}
            placeholder="Who they are, what they specialize in"
          />
          <TextField
            label="Member discount terms"
            value={discountTerms}
            onChangeText={setDiscountTerms}
            placeholder="e.g. 15% off all detail packages for DCC members"
          />
        </View>

        <Card>
          <Text variant="eyebrow" tone="muted">
            Service categories
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {PARTNER_CATEGORIES.map((c) => {
              const active = categories.has(c);
              return (
                <Pressable
                  key={c}
                  onPress={() => toggleCategory(c)}
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
                    {PARTNER_CATEGORY_LABEL[c]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="eyebrow" tone="muted">
              Contact info
            </Text>
            <Pressable onPress={addContactRow}>
              <Text variant="caption" tone="terracotta">
                + ADD
              </Text>
            </Pressable>
          </View>
          <View style={{ marginTop: 10, gap: 8 }}>
            {contacts.map((c, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  value={c.key}
                  onChangeText={(v) => setContact(i, 'key', v)}
                  placeholder="Key"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { width: 110 }]}
                  autoCapitalize="none"
                />
                <TextInput
                  value={c.value}
                  onChangeText={(v) => setContact(i, 'value', v)}
                  placeholder="Value"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, { flex: 1 }]}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => removeContactRow(i)} style={styles.removeBtn}>
                  <Text style={{ color: colors.danger, fontSize: 18 }}>×</Text>
                </Pressable>
              </View>
            ))}
          </View>
          <Text variant="caption" tone="muted" style={{ marginTop: 6 }}>
            Common keys: website, instagram, phone, email
          </Text>
        </Card>

        <Pressable
          onPress={() => setFeatured((v) => !v)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
        >
          <View
            style={[
              styles.checkbox,
              {
                backgroundColor: featured ? colors.terracottaDeep : 'transparent',
                borderColor: featured ? colors.terracottaDeep : colors.border,
              },
            ]}
          >
            {featured ? <Text style={{ color: colors.ink, fontWeight: '700' }}>✓</Text> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyBold">Featured deal</Text>
            <Text variant="small" tone="muted">
              Highlights this partner on the home dashboard.
            </Text>
          </View>
        </Pressable>

        <View style={{ gap: 10 }}>
          <Button
            label={saving ? 'Saving…' : props.mode === 'create' ? 'Create Partner' : 'Save Changes'}
            size="lg"
            fullWidth
            loading={saving}
            onPress={handleSave}
          />
          {props.mode === 'edit' ? (
            <Button label="Delete Partner" variant="danger" fullWidth onPress={handleDelete} />
          ) : null}
          <Button label="Cancel" variant="ghost" fullWidth onPress={() => router.back()} />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

async function confirmAction(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return false;
    return window.confirm(`${title}\n\n${message}`);
  }
  return new Promise<boolean>((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Confirm', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

function showError(title: string, message: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

const styles = StyleSheet.create({
  hero: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radii.md,
    marginTop: 8,
    backgroundColor: colors.ink,
  },
  heroPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: colors.textPrimary,
    fontFamily: fonts.sans,
    fontSize: 13,
  },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
