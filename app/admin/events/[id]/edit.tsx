import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Button, EventForm, Screen, Text } from '@/components/dsc';
import { useAuth } from '@/lib/auth-context';

export default function EditEventScreen() {
  const { profile } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  if (profile?.role !== 'admin') {
    return (
      <Screen contentContainerStyle={{ paddingTop: 24, gap: 16 }}>
        <Stack.Screen options={{ title: 'Edit Event', headerShown: true }} />
        <Text variant="display">Admins only.</Text>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }
  if (!id) {
    return (
      <Screen contentContainerStyle={{ paddingTop: 24, gap: 16 }}>
        <Stack.Screen options={{ title: 'Edit Event', headerShown: true }} />
        <Text variant="display">Event not found.</Text>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }
  return <EventForm mode="edit" eventId={id} />;
}
