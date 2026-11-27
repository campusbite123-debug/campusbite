import { Catalog } from '@/components/catalog';
import { useLocalSearchParams } from 'expo-router';
export default function Menu() {
  const { category } = useLocalSearchParams<{ category?: string }>();
  return <Catalog key={category} initialCategory={category} />;
}
