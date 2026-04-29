import { useLocalSearchParams } from 'expo-router';
import { CarForm } from '@/components/dsc/CarForm';

export default function EditCarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CarForm mode="edit" carId={id} />;
}
