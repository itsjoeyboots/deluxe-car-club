import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Screen, Text, TextField, Divider } from '@/components/dsc';
import { useAuth } from '@/lib/auth-context';

export default function SignInScreen() {
  const { signInWithPassword, sendMagicLink, configured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [magicSubmitting, setMagicSubmitting] = useState(false);

  async function handleSignIn() {
    if (!email || !password) {
      Alert.alert('Missing info', 'Email and password are both required.');
      return;
    }
    setSubmitting(true);
    const { error } = await signInWithPassword(email.trim(), password);
    setSubmitting(false);
    if (error) Alert.alert('Could not sign in', error);
    else router.replace('/(tabs)');
  }

  async function handleMagicLink() {
    if (!email) {
      Alert.alert('Email required', 'Add your email and try again.');
      return;
    }
    setMagicSubmitting(true);
    const { error } = await sendMagicLink(email.trim());
    setMagicSubmitting(false);
    if (error) Alert.alert('Could not send link', error);
    else Alert.alert('Check your email', 'We sent you a sign-in link.');
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <Screen contentContainerStyle={{ paddingTop: 32, gap: 24 }}>
        <View>
          <Text variant="eyebrow" tone="terracotta">
            Returning member
          </Text>
          <Text variant="display" style={{ marginTop: 4 }}>
            Welcome back.
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
              Supabase isn’t configured yet. Add EXPO_PUBLIC_SUPABASE_URL and
              EXPO_PUBLIC_SUPABASE_ANON_KEY to .env.local and restart the dev
              server.
            </Text>
          </View>
        ) : null}

        <View style={{ gap: 14 }}>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="you@desertsocialclub.com"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
          />
        </View>

        <Button
          label={submitting ? 'Signing in…' : 'Sign In'}
          fullWidth
          size="lg"
          loading={submitting}
          onPress={handleSignIn}
        />

        <Divider />

        <Button
          label={magicSubmitting ? 'Sending link…' : 'Email me a magic link instead'}
          variant="ghost"
          fullWidth
          loading={magicSubmitting}
          onPress={handleMagicLink}
        />

        <Button
          label="New here? Apply to join"
          variant="secondary"
          fullWidth
          onPress={() => router.replace('/(auth)/sign-up')}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}
