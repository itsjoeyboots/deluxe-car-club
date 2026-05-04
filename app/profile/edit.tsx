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
import type { NotificationPrefs, NotificationType, PrivacyPrefs } from '@/types/db';

const NOTIFICATION_CHANNELS: { key: NotificationType; label: string; hint: string }[] = [
  { key: 'event_new', label: 'New events', hint: 'When founders post a new event.' },
  { key: 'event_reminder', label: 'Event reminders', hint: '24-hour heads-up for events you RSVP’d to.' },
  { key: 'message', label: 'Direct messages', hint: 'When another paid member or admin DMs you.' },
  { key: 'application_status', label: 'Application updates', hint: 'Approved, rejected, waitlisted.' },
  { key: 'achievement', label: 'Achievements', hint: 'When you unlock a new badge.' },
  { key: 'build_like', label: 'Build likes', hint: 'When someone hearts your build update.' },
  { key: 'build_comment', label: 'Build comments', hint: 'When someone comments on your build.' },
  { key: 'partner_new', label: 'New partners', hint: 'When DCC adds a new partner shop.' },
  { key: 'announcement', label: 'Founder announcements', hint: 'Broadcasts from the founders.' },
  { key: 'points_milestone', label: 'Points milestones', hint: 'When you cross a reward threshold.' },
];

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
  const initialPrefs: PrivacyPrefs = profile?.privacy_prefs ?? {};
  const [showPhone, setShowPhone] = useState(!!initialPrefs.show_phone);
  const [showEmail, setShowEmail] = useState(!!initialPrefs.show_email);
  const [hideInstagram, setHideInstagram] = useState(!!initialPrefs.hide_instagram);
  const initialNotifPrefs: NotificationPrefs = profile?.notification_prefs ?? {};
  const [notifPrefs, setNotifPrefs] =
    useState<NotificationPrefs>(initialNotifPrefs);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
    setCity(profile?.city ?? '');
    setPhone(profile?.phone ?? '');
    setInstagram(profile?.instagram_handle ?? '');
    setPhotoUrl(profile?.profile_photo_url ?? null);
    const prefs: PrivacyPrefs = profile?.privacy_prefs ?? {};
    setShowPhone(!!prefs.show_phone);
    setShowEmail(!!prefs.show_email);
    setHideInstagram(!!prefs.hide_instagram);
    setNotifPrefs(profile?.notification_prefs ?? {});
  }, [profile]);

  function toggleNotif(key: NotificationType) {
    setNotifPrefs((cur) => ({
      ...cur,
      [key]: cur[key] === false ? true : false,
    }));
  }
  function isNotifOn(key: NotificationType): boolean {
    return notifPrefs[key] !== false;
  }

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
    const privacy_prefs: PrivacyPrefs = {
      show_phone: showPhone,
      show_email: showEmail,
      hide_instagram: hideInstagram,
    };
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        city: city.trim() || null,
        phone: phone.trim() || null,
        instagram_handle: instagram.trim().replace(/^@/, '') || null,
        privacy_prefs,
        notification_prefs: notifPrefs,
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

        <Card>
          <Text variant="eyebrow" tone="muted">
            Privacy
          </Text>
          <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
            Phone and email are hidden by default. Toggle these on if you want
            other approved members to see them on your profile.
          </Text>
          <View style={{ gap: 10, marginTop: 14 }}>
            <PrivacyToggle
              label="Show phone publicly"
              hint={phone ? phone : 'No phone on file yet'}
              value={showPhone}
              onToggle={() => setShowPhone((v) => !v)}
            />
            <PrivacyToggle
              label="Show email publicly"
              hint="Other members can see your sign-up email."
              value={showEmail}
              onToggle={() => setShowEmail((v) => !v)}
            />
            <PrivacyToggle
              label="Hide Instagram"
              hint={
                instagram
                  ? `Currently @${instagram.replace(/^@/, '')} on your profile`
                  : 'No handle on file'
              }
              value={hideInstagram}
              onToggle={() => setHideInstagram((v) => !v)}
            />
          </View>
        </Card>

        <Card>
          <Text variant="eyebrow" tone="muted">
            Notifications
          </Text>
          <Text variant="small" tone="muted" style={{ marginTop: 4 }}>
            Pick which channels DCC alerts you on. All on by default.
          </Text>
          <View style={{ gap: 10, marginTop: 14 }}>
            {NOTIFICATION_CHANNELS.map((c) => (
              <PrivacyToggle
                key={c.key}
                label={c.label}
                hint={c.hint}
                value={isNotifOn(c.key)}
                onToggle={() => toggleNotif(c.key)}
              />
            ))}
          </View>
        </Card>

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

function PrivacyToggle({
  label,
  hint,
  value,
  onToggle,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [
        styles.toggleRow,
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text variant="bodyBold">{label}</Text>
        {hint ? (
          <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>
            {hint}
          </Text>
        ) : null}
      </View>
      <View
        style={[
          styles.switchTrack,
          {
            backgroundColor: value ? colors.terracotta : 'rgba(255,255,255,0.10)',
          },
        ]}
      >
        <View
          style={[
            styles.switchThumb,
            {
              transform: [{ translateX: value ? 18 : 0 }],
              backgroundColor: value ? colors.ink : colors.textSecondary,
            },
          ]}
        />
      </View>
    </Pressable>
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 3,
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
});
