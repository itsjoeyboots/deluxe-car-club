import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  Button,
  Card,
  Divider,
  Screen,
  Text,
} from '@/components/dsc';
import { useAuth } from '@/lib/auth-context';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { MEMBERSHIP } from '@/lib/membership';
import { colors } from '@/lib/theme';
import type { Application } from '@/types/db';

export default function ApplicationConfirmation() {
  const { app } = useLocalSearchParams<{ app?: string }>();
  const { profile, refreshProfile } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!app || !isSupabaseConfigured) return;
      const { data } = await supabase
        .from('applications')
        .select('*')
        .eq('id', app)
        .maybeSingle();
      if (!active) return;
      setApplication((data as Application | null) ?? null);
    })();
    refreshProfile();
    return () => {
      active = false;
    };
  }, [app, refreshProfile]);

  const submittedOn = application?.created_at
    ? new Date(application.created_at).toLocaleDateString()
    : new Date().toLocaleDateString();

  void application; // suppress unused-var lint when no fields are read

  return (
    <Screen contentContainerStyle={{ paddingTop: 24, gap: 18 }}>
      <Stack.Screen options={{ title: 'Application Submitted', headerShown: true }} />

      <View>
        <Text variant="eyebrow" tone="terracotta">
          You{'’'}re in line
        </Text>
        <Text variant="display" style={{ marginTop: 4 }}>
          Application submitted.
        </Text>
        <Text variant="body" tone="secondary" style={{ marginTop: 8 }}>
          {profile?.full_name?.split(' ')[0]
            ? `Thanks, ${profile.full_name.split(' ')[0]}.`
            : 'Thanks for applying.'}{' '}
          Founders read every application by hand. Expect a decision within a
          week or two.
        </Text>
      </View>

      <Card variant="raised" style={{ borderLeftWidth: 4, borderLeftColor: colors.gold }}>
        <Text variant="eyebrow" tone="muted">
          Receipt
        </Text>
        <Row label="Submitted" value={submittedOn} />
        <Row label="Cost" value="Free" />
        <Row
          label="Status"
          value={
            (application?.status ?? 'pending').replace(/^./, (c) => c.toUpperCase())
          }
        />
      </Card>

      <Card>
        <Text variant="bodyBold">What happens next</Text>
        <Bullet>You{'’'}ll get an email the moment a decision is made.</Bullet>
        <Bullet>
          If approved, activate your ${MEMBERSHIP.base.annual}/yr base
          membership to unlock the full app.
        </Bullet>
        <Bullet>
          Add the Marketplace (${MEMBERSHIP.marketplaceAddon.annual}/yr) or
          Season Pass (${MEMBERSHIP.seasonPass.monthly}/mo) whenever you want.
        </Bullet>
      </Card>

      <Divider />

      <Button
        label="Back to Home"
        size="lg"
        fullWidth
        onPress={() => router.replace('/(tabs)')}
      />
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
      }}
    >
      <Text variant="caption" tone="muted">
        {label.toUpperCase()}
      </Text>
      <Text variant="bodyBold">{value}</Text>
    </View>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
      <Text style={{ color: colors.terracottaDeep, fontWeight: '700' }}>·</Text>
      <Text variant="small" style={{ flex: 1 }}>
        {children}
      </Text>
    </View>
  );
}
