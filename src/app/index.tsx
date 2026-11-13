import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/app';
import { Loading } from '@/components/ui';
export default function Index() {
  const { user, loading, recovering } = useAuth();
  if (loading) return <Loading />;
  return (
    <Redirect
      href={
        recovering
          ? '/reset-password'
          : !user
            ? '/login'
            : user.role === 'ADMIN'
              ? '/admin'
              : '/home'
      }
    />
  );
}
