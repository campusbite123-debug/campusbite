import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/app';
import { Loading } from '@/components/ui';
import { WelcomeScreen } from '@/components/welcome-screen';
export default function Index() {
  const { user, loading, recovering } = useAuth();
  if (loading) return <Loading />;
  if (recovering) return <Redirect href="/reset-password" />;
  if (!user) return <WelcomeScreen />;
  return <Redirect href={user.role === 'ADMIN' ? '/admin' : '/home'} />;
}
