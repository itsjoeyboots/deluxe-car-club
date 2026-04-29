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
import {
  Avatar,
  Button,
  Card,
  Screen,
  Text,
  TextField,
} from '@/components/dsc';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { pickAndUploadAvatar } from '@/lib/uploads';
import { colors } from '@/lib/theme';

export default function ProfileEditScreen() {
  const { profile, session, refreshProfile } = useAuth();
  const userId = session?.user.id;

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [instagram, setInstagram] = useState(profile?.instagram_handle ?? '');
  const [photoUrl, setPhotoUrl] = useState<string | null>(
    profile?.profile_photo_url ?? null,
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
    setCity(profile?.city ?? '');
    setPhone(profile?.phone ?? '');
    setInstagram(profile?.instagram_handle ?? '');
    setPhotoUrl(profile?.profile_photo_url ?? null);
  }, [profile]);

  async function handlePickPhoto() {
    if (!userId) return;
    setUploading(true);
    const result = await pickAndUploadAvatar(userId);
    setUploading(false);
    if ('cancelled' in result) return;
    if (!result.ok) {
      Alert.alert('Upload failed', result.error);
      return;
    }
    setPhotoUrl(result.publicUrl);
    const { error } = await supabase
      .from('profiles')
      .update({ profile_photo_url: result.publicUrl })
      .eq('id', userId);
    if (error) Alert.alert('Saved photo, but', error.message);
    else await refreshProfile();
  }

  async function handleSave() {
    if (!userId) return;
    if (!fullName.trim()) {
      Alert.alert('Name required', 'Please add your full name.');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        city: city.trim() || null,
        phone: phone.trim() || null,
        instagram_handle: instagram.trim().replace(/^@/, '') || null,
      })
      .eq('id', userId);
    setSaving(false);
    if (error) {
      Alert.alert('Could not save', error.message);
      return;
    }
    await refreshProfile();
    router.back();
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <Stack.Screen options={{ title: 'Edit Profile', headerShown: true }} />
      <Screen contentContainerStyle={{ paddingTop: 16, gap: 22 }}>
        <View>
          <Text variant="eyebrow" tone="terracotta">
            Your Card
          </Text>
          <Text variant="display" style={{ marginTop: 4 }}>
            Edit Profile
          </Text>
        </View>

        <Card variant="raised" style={styles.avatarCard}>
          <View style={{ alignItems: 'center', gap: 14 }}>
            <Avatar url={photoUrl} name={fullName} size="xl" />
            <Pressable
              onPress={handlePickPhoto}
              disabled={uploading}
              style={({ pressed }) => [
                styles.photoBtn,
                { opacity: uploading ? 0.6 : pressed ? 0.85 : 1 },
              ]}
            >
              <Text
                style={{
                  color: colors.terracottaDeep,
                  fontWeight: '700',
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  fontSize: 12,
                }}
              >
                {uploading
                  ? 'Uploading…'
                  : photoUrl
                    ? 'Change Photo'
                    : 'Upload Photo'}
              </Text>
            </Pressable>
          </View>
        </Card>

        <View style={{ gap: 14 }}>
          <TextField
            label="Full name"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />
          <TextField
            label="City"
            value={city}
            onChangeText={setCity}
            placeholder="Queen Creek, Gilbert, Chandler…"
            autoCapitalize="words"
          />
          <TextField
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            placeholder="For the WhatsApp channel"
            keyboardType="phone-pad"
          />
          <TextField
            label="Instagram handle"
            value={instagram}
            onChangeText={setInstagram}
            placeholder="username (no @)"
            autoCapitalize="none"
          />
        </View>

        <View style={{ gap: 10 }}>
          <Button
            label={saving ? 'Saving…' : 'Save Changes'}
            fullWidth
            size="lg"
            loading={saving}
            onPress={handleSave}
          />
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

const styles = StyleSheet.create({
  avatarCard: {
    paddingVertical: 24,
  },
  photoBtn: {
    borderWidth: 1.5,
    borderColor: colors.terracottaDeep,
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
