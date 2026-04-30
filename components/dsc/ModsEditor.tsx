import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radii } from '@/lib/theme';
import type { Mod, ModCategory } from '@/types/db';
import { Button } from './Button';
import { Card } from './Card';
import { Text } from './Text';

const CATEGORIES: { value: ModCategory; label: string }[] = [
  { value: 'engine', label: 'Engine' },
  { value: 'suspension', label: 'Suspension' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'interior', label: 'Interior' },
  { value: 'wheels', label: 'Wheels' },
  { value: 'audio', label: 'Audio' },
  { value: 'other', label: 'Other' },
];

export function ModsEditor({ carId }: { carId: string }) {
  const [mods, setMods] = useState<Mod[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<ModCategory>('engine');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('mods')
      .select('*')
      .eq('car_id', carId)
      .order('created_at', { ascending: true });
    if (!error && data) setMods(data as Mod[]);
    setLoading(false);
  }, [carId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function add() {
    if (!draft.trim()) {
      showError('Empty', 'Add a description first.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc('add_mod', {
      car_id_in: carId,
      category_in: category,
      description_in: draft.trim(),
    });
    setBusy(false);
    if (error) {
      console.error('[ModsEditor] add failed', error);
      showError('Could not add', error.message);
      return;
    }
    setDraft('');
    refresh();
  }

  async function remove(modId: string) {
    const { error } = await supabase.rpc('delete_mod', { mod_id: modId });
    if (error) {
      console.error('[ModsEditor] delete failed', error);
      showError('Could not delete', error.message);
      return;
    }
    refresh();
  }

  return (
    <Card>
      <Text variant="eyebrow" tone="muted">
        Mods
      </Text>
      <Text variant="bodyBold" style={{ marginTop: 2 }}>
        {mods.length} listed
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
        {CATEGORIES.map((c) => (
          <Pressable
            key={c.value}
            onPress={() => setCategory(c.value)}
            style={({ pressed }) => [
              styles.cat,
              {
                backgroundColor:
                  category === c.value ? colors.terracottaDeep : 'transparent',
                borderColor:
                  category === c.value ? colors.terracottaDeep : colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text
              style={{
                color: category === c.value ? colors.ink : colors.textSecondary,
                fontFamily: fonts.sansBold,
                fontSize: 11,
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}
            >
              {c.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="e.g. Garrett G35 turbo"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />
        <Button
          label={busy ? '...' : 'Add'}
          size="sm"
          loading={busy}
          onPress={add}
        />
      </View>

      {loading ? (
        <Text variant="small" tone="muted" style={{ marginTop: 12 }}>
          Loading…
        </Text>
      ) : mods.length === 0 ? (
        <Text variant="small" tone="muted" style={{ marginTop: 12 }}>
          No mods yet. Add the highlights — engine, suspension, wheels.
        </Text>
      ) : (
        <View style={{ gap: 6, marginTop: 12 }}>
          {mods.map((m) => (
            <View key={m.id} style={styles.row}>
              <View style={styles.catTag}>
                <Text style={styles.catTagText}>
                  {CATEGORIES.find((c) => c.value === m.category)?.label ?? m.category}
                </Text>
              </View>
              <Text variant="small" style={{ flex: 1 }}>
                {m.description}
              </Text>
              <Pressable
                onPress={() => remove(m.id)}
                style={({ pressed }) => [
                  styles.remove,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Text style={styles.removeText}>×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </Card>
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
  cat: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1.5,
  },
  input: {
    flex: 1,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  catTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catTagText: {
    color: colors.terracotta,
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 1,
  },
  remove: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  removeText: {
    color: colors.danger,
    fontSize: 22,
    fontFamily: fonts.sansBold,
    lineHeight: 22,
  },
});
