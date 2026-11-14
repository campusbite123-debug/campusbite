import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Keyboard, Platform } from 'react-native';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { Portal } from 'react-native-paper';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as Crypto from 'expo-crypto';
import { supabase, configurationError } from '@/services/supabase';
import { loadSnapshot, subscribeChanges } from '@/services/repository';
import { errorMessage, registrationSchema } from '@/utils/domain';
import type { CartLine, DailyMenu, SessionUser } from '@/types';
import { AppToast, type ToastNotice, type ToastOptions } from '@/components/app-toast';
import { AuthLoading } from '@/components/auth-loading';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 10000 }, mutations: { retry: false } },
});
type AuthContextValue = {
  user: SessionUser | null;
  loading: boolean;
  authError: string | null;
  recovering: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (values: any) => Promise<string>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  finishRecovery: () => void;
};
const AuthContext = createContext<AuthContextValue>(null!);
const ToastContext = createContext<(message: string, options?: ToastOptions) => void>(() => {});
const CartContext = createContext<{
  lines: CartLine[];
  add: (menu: DailyMenu, quantity?: number) => void;
  setQuantity: (id: string, quantity: number) => void;
  clear: () => void;
}>(null!);
export const useAuth = () => useContext(AuthContext);
export const useToast = () => useContext(ToastContext);
export const useCart = () => useContext(CartContext);

function AuthProvider({ children }: React.PropsWithChildren) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(configurationError);
  const [recovering, setRecovering] = useState(false);
  const [authAction, setAuthAction] = useState<'login' | 'logout' | null>(null);
  const authRequest = useRef<Promise<void> | null>(null);
  const generation = useRef(0);
  const refreshUser = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const run = ++generation.current;
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!data.session) {
        if (run === generation.current) setUser(null);
        return;
      }
      const [p, r] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', data.session.user.id).single(),
        supabase.from('user_roles').select('role').eq('user_id', data.session.user.id).single(),
      ]);
      if (p.error || r.error)
        throw new Error('Your account profile could not be loaded. Please sign in again.');
      if (!['CUSTOMER', 'ADMIN'].includes(r.data.role))
        throw new Error('Your account does not have a valid role. Contact the canteen.');
      if (run === generation.current) {
        setUser({ ...p.data, role: r.data.role });
        setAuthError(null);
      }
    } finally {
      // Startup and Auth events can overlap. Only the latest profile lookup may
      // unlock routing, otherwise a saved session can briefly look signed out.
      if (run === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    Promise.resolve()
      .then(refreshUser)
      .catch((e) => setAuthError(errorMessage(e)));
    const sub = supabase?.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (!session) {
        generation.current++;
        setUser(null);
        setLoading(false);
        queryClient.clear();
      } else
        setTimeout(() => {
          // Login already waits for its profile before dismissing the loading screen.
          if (!authRequest.current) void refreshUser().catch((e) => setAuthError(errorMessage(e)));
        }, 0);
    });
    async function handleURL(url: string) {
      if (!supabase) return;
      try {
        const parsed = new URL(url);
        const code = parsed.searchParams.get('code');
        const hash = new URLSearchParams(parsed.hash.slice(1));
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (hash.get('access_token') && hash.get('refresh_token')) {
          const { error } = await supabase.auth.setSession({
            access_token: hash.get('access_token')!,
            refresh_token: hash.get('refresh_token')!,
          });
          if (error) throw error;
        }
        if (url.includes('reset-password') || hash.get('type') === 'recovery') setRecovering(true);
      } catch (e) {
        setAuthError(errorMessage(e));
      }
    }
    const link =
      Platform.OS !== 'web'
        ? Linking.addEventListener('url', (event) => {
            void handleURL(event.url);
          })
        : undefined;
    if (Platform.OS !== 'web')
      void Linking.getInitialURL().then((url) => {
        if (url) return handleURL(url);
      });
    return () => {
      sub?.data.subscription.unsubscribe();
      link?.remove();
    };
  }, [refreshUser]);
  function runAuthAction(action: 'login' | 'logout', request: () => Promise<void>) {
    if (authRequest.current) return authRequest.current;
    Keyboard.dismiss();
    setAuthAction(action);
    authRequest.current = request().finally(() => {
      authRequest.current = null;
      setAuthAction(null);
    });
    return authRequest.current;
  }
  function login(email: string, password: string) {
    return runAuthAction('login', async () => {
      if (!supabase) throw new Error(configurationError ?? 'Supabase is not configured.');
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      await refreshUser();
    });
  }
  async function register(values: any) {
    const clean = registrationSchema.parse(values);
    if (!supabase) throw new Error(configurationError!);
    const { error, data } = await supabase.auth.signUp({
      email: clean.email,
      password: clean.password,
      options: {
        data: {
          full_name: clean.full_name,
          // Existing databases require this legacy column. Store an internal reference,
          // never a student-supplied ID, so signup needs no database migration.
          student_id: Crypto.randomUUID().replaceAll('-', '').slice(0, 30).toUpperCase(),
        },
        // The Confirm signup email template sends users to the hosted confirmation
        // page. A device/local development URL must never be emailed to students.
      },
    });
    if (error)
      throw new Error(
        error.message.includes('Database error')
          ? 'Registration failed. Check your details or contact the canteen.'
          : error.message,
      );
    if (data.session) await refreshUser();
    return data.session
      ? 'Your account is ready.'
      : 'Check your email to confirm your account, then sign in.';
  }
  function logout() {
    return runAuthAction('logout', async () => {
      if (supabase) {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }
      generation.current++;
      queryClient.clear();
      setUser(null);
    });
  }
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        recovering,
        login,
        register,
        logout,
        refreshUser,
        finishRecovery: () => setRecovering(false),
      }}
    >
      {children}
      <AuthLoading action={authAction} />
    </AuthContext.Provider>
  );
}
function useSnapshotQuery() {
  const { user } = useAuth();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['canteen', user?.id, user?.role],
    queryFn: () => loadSnapshot(user!),
    enabled: !!user && !user.is_suspended,
    refetchInterval: 20000,
  });
  useEffect(() => {
    if (!user) return;
    const invalidate = () => {
      void client.invalidateQueries({ queryKey: ['canteen'] });
    };
    const stop = subscribeChanges(user, invalidate);
    const state = AppState.addEventListener('change', (value) => {
      if (value === 'active') invalidate();
    });
    return () => {
      stop();
      state.remove();
    };
  }, [user?.id, user?.role, client]); // eslint-disable-line react-hooks/exhaustive-deps
  const toast = useToast();
  const previous = useRef<Record<string, string>>({});
  useEffect(() => {
    if (!query.data || user?.role !== 'CUSTOMER') return;
    query.data.orders.forEach((order) => {
      if (
        order.status === 'Ready for Pickup' &&
        previous.current[order.id] &&
        previous.current[order.id] !== order.status
      ) {
        toast('Your food is ready! Show your pickup code at the canteen.');
        void import('@/services/media')
          .then((m) => m.notifyReady(order.order_number))
          .catch(() => toast('Your order is ready. Device notification could not be delivered.'));
      }
    });
    previous.current = Object.fromEntries(query.data.orders.map((o) => [o.id, o.status]));
  }, [query.data, user?.role, toast]);
  return query;
}
const SnapshotContext = createContext<ReturnType<typeof useSnapshotQuery>>(null!);
export const useSnapshot = () => useContext(SnapshotContext);
function DataProvider({ children }: React.PropsWithChildren) {
  const value = useSnapshotQuery();
  return <SnapshotContext.Provider value={value}>{children}</SnapshotContext.Provider>;
}
function CartProvider({ children }: React.PropsWithChildren) {
  const { user } = useAuth();
  return <UserCartProvider key={user?.id ?? 'guest'}>{children}</UserCartProvider>;
}
function UserCartProvider({ children }: React.PropsWithChildren) {
  const { user } = useAuth();
  const toast = useToast();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [owner, setOwner] = useState('');
  useEffect(() => {
    let active = true;
    if (user)
      void AsyncStorage.getItem(`cart-${user.id}`)
        .then((raw) => {
          if (active) {
            setLines(raw ? JSON.parse(raw) : []);
            setOwner(user.id);
          }
        })
        .catch(() => toast('Your saved cart could not be loaded.'));
    return () => {
      active = false;
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (user && owner === user.id)
      void AsyncStorage.setItem(`cart-${user.id}`, JSON.stringify(lines)).catch(() =>
        toast('Your cart could not be saved on this device.'),
      );
  }, [lines, owner, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const add = (menu: DailyMenu, quantity = 1) => {
    const current = lines.find((l) => l.daily_menu_id === menu.id)?.quantity ?? 0;
    if (!menu.is_available || quantity < 1 || current + quantity > Math.min(menu.quantity, 99)) {
      toast('There is not enough stock for that quantity.', {
        title: 'Check your bag',
        tone: 'error',
      });
      return;
    }
    setLines((old) => [
      ...old.filter((l) => l.daily_menu_id !== menu.id),
      { daily_menu_id: menu.id, quantity: current + quantity },
    ]);
    toast('Good choice! Your meal is in your bag.', {
      title: 'Added to your bag',
      tone: 'success',
      icon: 'shopping-outline',
      action: { label: 'View bag', onPress: () => router.push('/cart') },
    });
  };
  return (
    <CartContext.Provider
      value={{
        lines,
        add,
        setQuantity: (id, quantity) =>
          setLines((old) =>
            quantity <= 0
              ? old.filter((l) => l.daily_menu_id !== id)
              : old.map((l) =>
                  l.daily_menu_id === id ? { ...l, quantity: Math.min(99, quantity) } : l,
                ),
          ),
        clear: () => setLines([]),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
export function Providers({ children }: React.PropsWithChildren) {
  const [notice, setNotice] = useState<ToastNotice | null>(null);
  const nextNoticeId = useRef(0);
  const toast = useCallback((message: string, options: ToastOptions = {}) => {
    setNotice(message ? { ...options, message, id: ++nextNoticeId.current } : null);
  }, []);
  const dismiss = useCallback((id: number) => {
    setNotice((current) => (current?.id === id ? null : current));
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <ToastContext.Provider value={toast}>
        <AuthProvider>
          <DataProvider>
            <CartProvider>
              <Portal.Host>{children}</Portal.Host>
            </CartProvider>
          </DataProvider>
        </AuthProvider>
        <AppToast notice={notice} onDismiss={dismiss} />
      </ToastContext.Provider>
    </QueryClientProvider>
  );
}
