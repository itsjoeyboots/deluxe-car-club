import { router, Stack } from 'expo-router';
import { Button, EventForm, Screen, Text } from '@/components/dsc';
import { useAuth } from '@/lib/auth-context';

export default function NewEventScreen() {
  const { profile, session } = useAuth();
  if (profile?.role !== 'admin') {
    return (
      <Screen contentContainerStyle={{ paddingTop: 24, gap: 16 }}>
        <Stack.Screen options={{ title: 'New Event', headerShown: true }} />
        <Text variant="display">Admins only.</Text>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }
  return <EventForm mode="create" userId={session?.user.id} />;
}
