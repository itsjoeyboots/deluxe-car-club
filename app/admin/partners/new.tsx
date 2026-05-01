import { router } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { Button, PartnerForm, Screen, Text } from '@/components/dsc';

export default function NewPartnerScreen() {
  const { profile } = useAuth();
  if (profile?.role !== 'admin') {
    return (
      <Screen contentContainerStyle={{ paddingTop: 24, gap: 16 }}>
        <Text variant="display">Admins only.</Text>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }
  return <PartnerForm mode="create" />;
}
