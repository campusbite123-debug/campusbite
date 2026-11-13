import React, { useState } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Linking from 'expo-linking';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, useToast } from '@/contexts/app';
import { configurationError, supabase } from '@/services/supabase';
import { errorMessage, registrationSchema } from '@/utils/domain';
import { colors as c, fonts } from '@/constants/theme';
import { Brand } from './shell';
import { Button, Icon, Input, T } from './ui';
const loginSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});
export function AuthScreen({
  register = false,
  forgot = false,
}: {
  register?: boolean;
  forgot?: boolean;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const auth = useAuth();
  const toast = useToast();
  const [error, setError] = useState('');
  const {
    control,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<any>({
    resolver: zodResolver(
      register
        ? registrationSchema
        : forgot
          ? z.object({ email: z.email('Enter a valid email address.') })
          : loginSchema,
    ),
    defaultValues: { full_name: '', email: '', password: '', confirm_password: '' },
  });
  async function submit(values: any) {
    setError('');
    try {
      if (forgot) {
        if (!supabase)
          throw new Error('Password recovery is currently unavailable. Please try again later.');
        const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
          redirectTo: Linking.createURL('/reset-password'),
        });
        if (error) throw error;
        toast('If this email is registered, a recovery link will arrive shortly.');
        router.push('/login');
      } else if (register) {
        const message = await auth.register(values);
        toast(message);
        router.replace('/');
      } else {
        await auth.login(values.email, values.password);
        router.replace('/');
      }
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  const fields = register
    ? [
        ['full_name', 'Full name', 'Juan Dela Cruz'],
        ['email', 'Campus email', 'you@campus.edu.ph'],
        ['password', 'Password', 'At least 8 characters'],
        ['confirm_password', 'Confirm password', 'Re-enter your password'],
      ]
    : forgot
      ? [['email', 'Campus email', 'you@campus.edu.ph']]
      : [
          ['email', 'Campus email', 'you@campus.edu.ph'],
          ['password', 'Password', 'Your password'],
        ];
  if (auth.user && !forgot)
    return (
      <Redirect
        href={auth.recovering ? '/reset-password' : auth.user.role === 'ADMIN' ? '/admin' : '/home'}
      />
    );
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ flexGrow: 1, backgroundColor: c.cream, paddingTop: insets.top }}
    >
      <View style={{ flex: 1, flexDirection: width > 900 ? 'row' : 'column' }}>
        {width > 900 && (
          <View
            style={{
              width: '45%',
              padding: 60,
              backgroundColor: '#FEE9D8',
              justifyContent: 'space-between',
            }}
          >
            <Brand />
            <View>
              <Icon name="silverware-fork-knife" color={c.orange} size={72} />
              <T
                style={{
                  fontFamily: fonts.display,
                  fontSize: 55,
                  lineHeight: 65,
                  letterSpacing: -2,
                  marginTop: 28,
                }}
              >
                Good food.{'\n'}Better campus{'\n'}
                <T style={{ color: c.orangeDark, fontSize: 55, fontFamily: fonts.display }}>
                  days.
                </T>
              </T>
              <T
                style={{
                  color: '#93765F',
                  fontSize: 15,
                  lineHeight: 26,
                  marginTop: 25,
                  maxWidth: 350,
                }}
              >
                Your campus favorites, without the wait. Pre-order a meal and make the most of every
                break.
              </T>
            </View>
            <T style={{ color: '#A3836A', fontSize: 11 }}>
              Freshly prepared. Fairly priced. Made for you.
            </T>
          </View>
        )}
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: width > 900 ? 55 : 26,
          }}
        >
          <View style={{ width: '100%', maxWidth: 410 }}>
            {width <= 900 && (
              <View style={{ marginBottom: 45 }}>
                <Brand />
              </View>
            )}
            <T muted style={{ fontSize: 10, letterSpacing: 1.8, marginBottom: 12 }}>
              YOUR NEXT GOOD MEAL AWAITS
            </T>
            <T style={{ fontFamily: fonts.display, fontSize: 32, letterSpacing: -1 }}>
              {register ? 'Join the table.' : forgot ? 'Let’s get you back in.' : 'Welcome back.'}
            </T>
            <T muted style={{ fontSize: 13, lineHeight: 21, marginTop: 12, marginBottom: 29 }}>
              {register
                ? 'Create a student account. Good food is just a few taps away.'
                : forgot
                  ? 'We’ll send a link to reset your password.'
                  : 'Sign in for your daily dose of delicious.'}
            </T>
            {(configurationError || auth.authError) && (
              <T style={{ color: c.red, marginBottom: 18, lineHeight: 21 }}>
                {configurationError || auth.authError}
              </T>
            )}
            <>
              {fields.map(([name, label, placeholder]) => (
                <Controller
                  key={name}
                  name={name}
                  control={control}
                  render={({ field: { value, onChange, onBlur } }) => (
                    <Input
                      label={label}
                      placeholder={placeholder}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      secureTextEntry={name.includes('password')}
                      autoCapitalize={name === 'full_name' ? 'words' : 'none'}
                      keyboardType={name === 'email' ? 'email-address' : 'default'}
                      autoComplete={
                        name === 'email'
                          ? 'email'
                          : name.includes('password')
                            ? register
                              ? 'new-password'
                              : 'current-password'
                            : 'off'
                      }
                      error={errors[name]?.message as string | undefined}
                    />
                  )}
                />
              ))}
              {!register && !forgot && (
                <Pressable
                  onPress={() => router.push('/forgot-password')}
                  style={{ alignSelf: 'flex-end', marginBottom: 20 }}
                >
                  <T style={{ color: c.orange, fontSize: 12 }}>Forgot password?</T>
                </Pressable>
              )}
              <Button loading={isSubmitting} onPress={handleSubmit(submit)}>
                {register ? 'Create student account' : forgot ? 'Send recovery link' : 'Sign in'} →
              </Button>
            </>
            {!!error && (
              <T
                accessibilityRole="alert"
                style={{ color: c.red, marginTop: 18, fontSize: 12, lineHeight: 21 }}
              >
                {error}
              </T>
            )}
            <Pressable
              onPress={() => router.push(register || forgot ? '/login' : '/register')}
              style={{ alignItems: 'center', marginTop: 27 }}
            >
              <T muted style={{ fontSize: 12 }}>
                {register || forgot ? 'Back to sign in' : 'New to campusbite?'}{' '}
                <T bold style={{ color: c.orange, fontSize: 12 }}>
                  {!register && !forgot ? 'Create an account' : ''}
                </T>
              </T>
            </Pressable>
            <T muted style={{ fontSize: 10, textAlign: 'center', marginTop: 45 }}>
              Your campus account. Your daily favorites.{'\n'}Sign in to access your account.
            </T>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
