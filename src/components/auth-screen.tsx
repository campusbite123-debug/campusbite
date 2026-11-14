import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Linking from 'expo-linking';
import { useAuth, useToast } from '@/contexts/app';
import { configurationError, supabase } from '@/services/supabase';
import { errorMessage, registrationSchema } from '@/utils/domain';
import { colors as c, fonts } from '@/constants/theme';
import { Button, T } from './ui';
import { AuthLayout } from './auth-layout';
import { AuthField } from './auth-field';
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
        router.replace('/login');
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
    <AuthLayout
      onBack={() => router.dismissTo(register || forgot ? '/login' : '/')}
      backLabel={register || forgot ? 'Return to sign in' : 'Back to welcome'}
    >
      <View style={styles.intro}>
        <View style={styles.eyebrow}>
          <T style={styles.eyebrowText}>YOUR NEXT GOOD MEAL AWAITS</T>
        </View>
        <T style={styles.heading}>
          {register ? 'Join the table.' : forgot ? 'Let’s get you back in.' : 'Welcome back.'}
        </T>
        <T style={styles.description}>
          {register
            ? 'Create a student account. Good food is just a few taps away.'
            : forgot
              ? 'We’ll send a link to reset your password.'
              : 'Sign in for your daily dose of delicious.'}
        </T>
      </View>
      {(configurationError || auth.authError) && (
        <T style={{ color: c.red, marginBottom: 18, lineHeight: 21 }}>
          {configurationError || auth.authError}
        </T>
      )}
      {fields.map(([name, label, placeholder]) => (
        <Controller
          key={name}
          name={name}
          control={control}
          render={({ field: { value, onChange, onBlur } }) => (
            <AuthField
              label={label}
              icon={
                name === 'email'
                  ? 'email-outline'
                  : name === 'full_name'
                    ? 'account-outline'
                    : 'lock-outline'
              }
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
          accessibilityRole="button"
          onPress={() => router.push('/forgot-password')}
          style={styles.recoveryLink}
        >
          <T style={{ color: c.orangeDark, fontSize: 12, fontFamily: fonts.medium }}>
            Forgot password?
          </T>
        </Pressable>
      )}
      <Button
        loading={isSubmitting}
        onPress={handleSubmit(submit)}
        icon="arrow-right"
        style={styles.submit}
      >
        {register ? 'Create student account' : forgot ? 'Send recovery link' : 'Sign in'}
      </Button>
      {!!error && (
        <T
          accessibilityRole="alert"
          style={{ color: c.red, marginTop: 18, fontSize: 12, lineHeight: 21 }}
        >
          {error}
        </T>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(register || forgot ? '/login' : '/register')}
        style={styles.accountLink}
      >
        <T style={{ color: '#7E8175', fontSize: 12, textAlign: 'center', lineHeight: 20 }}>
          {register || forgot ? 'Back to sign in' : 'New to campusbite?'}{' '}
          <T bold style={{ color: c.orangeDark, fontSize: 12 }}>
            {!register && !forgot ? 'Create an account' : ''}
          </T>
        </T>
      </Pressable>
      <View style={styles.footnote}>
        <T style={{ color: '#96978B', fontSize: 10, textAlign: 'center', lineHeight: 17 }}>
          Your campus account. Your daily favorites.{'\n'}Sign in to access your account.
        </T>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  intro: { alignItems: 'center', marginBottom: 28 },
  eyebrow: {
    backgroundColor: '#FFF0E4',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  eyebrowText: { fontFamily: fonts.semibold, fontSize: 8, letterSpacing: 1.3, color: c.orangeDark },
  heading: {
    fontFamily: fonts.display,
    fontSize: 32,
    lineHeight: 41,
    letterSpacing: -1,
    textAlign: 'center',
    marginTop: 15,
  },
  description: {
    color: '#8D9083',
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
  },
  recoveryLink: {
    alignSelf: 'flex-end',
    minHeight: 44,
    justifyContent: 'center',
    marginBottom: 12,
  },
  submit: { borderRadius: 28, minHeight: 52, boxShadow: '0px 5px 15px rgba(245, 107, 40, 0.16)' },
  accountLink: { alignItems: 'center', justifyContent: 'center', minHeight: 44, marginTop: 16 },
  footnote: { borderTopWidth: 1, borderColor: '#F0ECE5', marginTop: 25, paddingTop: 21 },
});
