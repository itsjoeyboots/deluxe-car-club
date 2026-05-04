import { useEffect, useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Button, PartnerForm, Screen, Text } from '@/components/dsc';

type SuggestionDefaults = {
  name?: string;
  contactInfo?: string;
  suggestionId?: string;
};

export default function NewPartnerScreen() {
  const { profile } = useAuth();
  const params = useLocalSearchParams<{ suggestion?: string }>();
  const suggestionId =
    typeof params.suggestion === 'string' ? params.suggestion : null;

  const [defaults, setDefaults] = useState<SuggestionDefaults | null>(null);
  const [resolved, setResolved] = useState(!suggestionId);

  useEffect(() => {
    if (!suggestionId || !isSupabaseConfigured) return;
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('partner_suggestions')
        .select('id, name, contact_info, why')
        .eq('id', suggestionId)
        .maybeSingle();
      if (!active) return;
      if (!error && data) {
        const why = data.why ? `\n\n${data.why}` : '';
        const contactInfo = data.contact_info
          ? `${data.contact_info}${why}`
          : why || undefined;
        setDefaults({
          name: data.name,
          contactInfo,
          suggestionId: data.id,
        });
      }
      setResolved(true);
    })();
    return () => {
      active = false;
    };
  }, [suggestionId]);

  if (profile?.role !== 'admin') {
    return (
      <Screen contentContainerStyle={{ paddingTop: 24, gap: 16 }}>
        <Stack.Screen options={{ title: 'New Partner', headerShown: true }} />
        <Text variant="display">Admins only.</Text>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }
  if (!resolved) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'New Partner', headerShown: true }} />
        <Text tone="muted">Loading suggestion…</Text>
      </Screen>
    );
  }
  return <PartnerForm mode="create" defaults={defaults ?? undefined} />;
}
