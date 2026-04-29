import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { colors, fonts, radii } from '@/lib/theme';
import type { Car, BuildStatus } from '@/types/db';
import { Button } from './Button';
import { Card } from './Card';
import { CarGallery } from './CarGallery';
import { Screen } from './Screen';
import { Text } from './Text';
import { TextField } from './TextField';

type Props =
  | { mode: 'create'; carId?: undefined }
  | { mode: 'edit'; carId: string };

export function CarForm(props: Props) {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [year, setYear] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [nickname, setNickname] = useState('');
  const [status, setStatus] = useState<BuildStatus>('in_progress');
  const [isPrimary, setIsPrimary] = useState(false);
  const [loading, setLoading] = useState(props.mode === 'edit');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (props.mode !== 'edit') return;
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('cars')
        .select('*')
        .eq('id', props.carId)
        .maybeSingle();
      if (!active) return;
      if (error || !data) {
        Alert.alert('Could not load car', error?.message ?? 'Not found');
        router.back();
        return;
      }
      const car = data as Car;
      setYear(car.year ? String(car.year) : '');
      setMake(car.make ?? '');
      setModel(car.model ?? '');
      setNickname(car.nickname ?? '');
      setStatus(car.status);
      setIsPrimary(car.is_primary);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [props]);

  async function handleSave() {
    if (!userId) return;
    if (!make.trim() || !model.trim()) {
      Alert.alert('Missing info', 'Make and model are required.');
      return;
    }
    const yearNum = year.trim() ? Number(year.trim()) : null;
    if (year.trim() && (!yearNum || yearNum < 1900 || yearNum > 2100)) {
      Alert.alert('Invalid year', 'Use a four-digit year.');
      return;
    }
    setSaving(true);

    if (isPrimary) {
      // Make sure only one car is primary
      await supabase
        .from('cars')
        .update({ is_primary: false })
        .eq('user_id', userId)
        .eq('is_primary', true);
    }

    const payload = {
      user_id: userId,
      year: yearNum,
      make: make.trim(),
      model: model.trim(),
      nickname: nickname.trim() || null,
      status,
      is_primary: isPrimary,
    };

    if (props.mode === 'create') {
      const { data, error } = await supabase
        .from('cars')
        .insert(payload)
        .select('id')
        .single();
      setSaving(false);
      if (error || !data) {
        Alert.alert('Could not save', error?.message ?? 'Unknown error');
        return;
      }
      router.replace(`/cars/${data.id}`);
      return;
    }

    const { error } = await supabase
      .from('cars')
      .update(payload)
      .eq('id', props.carId);
    setSaving(false);
    if (error) {
      Alert.alert('Could not save', error.message);
      return;
    }
    router.back();
  }

  async function handleDelete() {
    if (props.mode !== 'edit') return;
    Alert.alert('Delete car?', 'This removes the car and its build updates.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('cars')
            .delete()
            .eq('id', props.carId);
          if (error) Alert.alert('Could not delete', error.message);
          else router.back();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <Screen>
        <Text variant="small" tone="muted">
          Loading…
        </Text>
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
          title: props.mode === 'create' ? 'Add a Car' : 'Edit Car',
          headerShown: true,
        }}
      />
      <Screen contentContainerStyle={{ paddingTop: 16, gap: 22 }}>
        <View>
          <Text variant="eyebrow" tone="terracotta">
            Garage
          </Text>
          <Text variant="display" style={{ marginTop: 4 }}>
            {props.mode === 'create' ? 'Add a Car' : 'Edit Car'}
          </Text>
          <Text variant="small" tone="muted" style={{ marginTop: 6 }}>
            One primary car shows up across the directory and the home
            spotlight. Add as many as you want — daily, weekend, project.
          </Text>
        </View>

        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ width: 120 }}>
              <TextField
                label="Year"
                value={year}
                onChangeText={setYear}
                keyboardType="number-pad"
                placeholder="2015"
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextField
                label="Make"
                value={make}
                onChangeText={setMake}
                placeholder="Toyota"
                autoCapitalize="words"
              />
            </View>
          </View>
          <TextField
            label="Model"
            value={model}
            onChangeText={setModel}
            placeholder="GR Corolla"
            autoCapitalize="words"
          />
          <TextField
            label="Nickname (optional)"
            value={nickname}
            onChangeText={setNickname}
            placeholder="Sandstorm"
          />
        </View>

        {props.mode === 'edit' ? <CarGallery carId={props.carId} /> : null}

        <Card>
          <Text variant="eyebrow" tone="muted">
            Build Status
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <StatusPill
              active={status === 'in_progress'}
              label="In Progress"
              onPress={() => setStatus('in_progress')}
            />
            <StatusPill
              active={status === 'complete'}
              label="Complete"
              onPress={() => setStatus('complete')}
            />
          </View>
        </Card>

        <Card>
          <Pressable
            onPress={() => setIsPrimary((v) => !v)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flex: 1, paddingRight: 14 }}>
              <Text variant="bodyBold">Primary car</Text>
              <Text variant="small" tone="muted" style={{ marginTop: 2 }}>
                Shown as your headline car across DSC.
              </Text>
            </View>
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: isPrimary
                    ? colors.terracottaDeep
                    : 'transparent',
                  borderColor: isPrimary
                    ? colors.terracottaDeep
                    : colors.border,
                },
              ]}
            >
              {isPrimary ? (
                <Text style={{ color: colors.sandLight, fontWeight: '700' }}>
                  ✓
                </Text>
              ) : null}
            </View>
          </Pressable>
        </Card>

        <View style={{ gap: 10 }}>
          <Button
            label={
              saving
                ? 'Saving…'
                : props.mode === 'create'
                  ? 'Add Car'
                  : 'Save Changes'
            }
            fullWidth
            size="lg"
            loading={saving}
            onPress={handleSave}
          />
          {props.mode === 'edit' ? (
            <Button
              label="Delete Car"
              variant="danger"
              fullWidth
              onPress={handleDelete}
            />
          ) : null}
          <Button
            label="Cancel"
            variant="ghost"
            fullWidth
            onPress={() => router.back()}
          />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function StatusPill({
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
          color: active ? colors.sandLight : colors.textSecondary,
          fontFamily: fonts.sansBold,
          fontSize: 12,
          letterSpacing: 1,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    borderWidth: 1.5,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
