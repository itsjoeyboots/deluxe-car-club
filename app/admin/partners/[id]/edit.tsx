import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { Button, PartnerForm, Screen, Text } from '@/components/dsc';

export default function EditPartnerScreen() {
  const { profile } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  if (profile?.role !== 'admin') {
    return (
      <Screen contentContainerStyle={{ paddingTop: 24, gap: 16 }}>
        <Text variant="display">Admins only.</Text>
        <Button label="Back" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }
  if (!id) return null;
  return <PartnerForm mode="edit" partnerId={id} />;
}
