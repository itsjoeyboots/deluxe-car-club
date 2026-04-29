import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Screen, Text, TextField, Divider } from '@/components/dsc';
import { useAuth } from '@/lib/auth-context';
import { MEMBERSHIP } from '@/lib/membership';

export default function SignUpScreen() {
  const { signUpWithPassword, configured } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSignUp() {
    if (!fullName.trim() || !email.trim() || !password) {
      Alert.alert('Missing info', 'Name, email, and password are required.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters.');
      return;
    }
    setSubmitting(true);
    const { error } = await signUpWithPassword(
      email.trim(),
      password,
      fullName.trim(),
    );
    setSubmitting(false);
    if (error) Alert.alert('Could not create account', error);
    else {
      Alert.alert(
        'Account created',
        'Check your email to verify, then complete your application from the home tab.',
      );
      router.replace('/(tabs)');
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <Screen contentContainerStyle={{ paddingTop: 32, gap: 24 }}>
        <View>
          <Text variant="eyebrow" tone="terracotta">
            New to the club
          </Text>
          <Text variant="display" style={{ marginTop: 4 }}>
            Start your application.
          </Text>
          <Text variant="small" tone="muted" style={{ marginTop: 8 }}>
            We’ll create your account first. You’ll fill out your application
            details and pay the ${MEMBERSHIP.applicationFeeUsd} fee on the next
            screen — only {MEMBERSHIP.approvedCap} approved spots exist.
          </Text>
        </View>

        {!configured ? (
          <View
            style={{
              backgroundColor: '#FFF4E0',
              borderColor: '#C8982A',
              borderWidth: 1,
              borderRadius: 12,
              padding: 14,
            }}
          >
            <Text variant="small" tone="terracotta">
              Supabase isn’t configured yet. The form will look right but
              account creation won’t actually persist until you add the
              EXPO_PUBLIC_SUPABASE_* env vars.
            </Text>
          </View>
        ) : null}

        <View style={{ gap: 14 }}>
          <TextField
            label="Full name"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            autoComplete="name"
          />
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            helperText="At least 8 characters."
          />
        </View>

        <Button
          label={submitting ? 'Creating account…' : 'Create Account'}
          fullWidth
          size="lg"
          loading={submitting}
          onPress={handleSignUp}
        />

        <Divider />

        <Button
          label="Already a member? Sign in"
          variant="ghost"
          fullWidth
          onPress={() => router.replace('/(auth)/sign-in')}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}
