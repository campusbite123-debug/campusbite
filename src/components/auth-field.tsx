import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import { colors as c, fonts } from '@/constants/theme';
import { useLayout } from '@/hooks/use-layout';
import { Icon, IconButton, T } from './ui';

export function AuthField({
  label,
  icon,
  error,
  secureTextEntry,
  onFocus,
  onBlur,
  ...props
}: TextInputProps & { label: string; icon: string; error?: string }) {
  const { isPhone } = useLayout();
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  return (
    <View style={{ gap: 8, marginBottom: 17 }}>
      <T style={styles.label}>{label}</T>
      <View style={[styles.field, { borderColor: error ? c.red : focused ? c.orange : '#ECE7DF' }]}>
        <View pointerEvents="none" aria-hidden>
          <Icon name={icon} size={19} color={focused ? c.orangeDark : '#8B8C7E'} />
        </View>
        <TextInput
          {...props}
          accessibilityLabel={label}
          secureTextEntry={secureTextEntry && !showPassword}
          placeholderTextColor="#929487"
          underlineColorAndroid="transparent"
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[styles.input, { fontSize: isPhone ? 16 : 14 }]}
        />
        {secureTextEntry && (
          <IconButton
            label={`${showPassword ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
            icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
            color="#8B8C7E"
            onPress={() => setShowPassword((shown) => !shown)}
          />
        )}
      </View>
      {error && (
        <T accessibilityRole="alert" style={{ color: c.red, fontSize: 12, lineHeight: 18 }}>
          {error}
        </T>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: fonts.medium, color: '#5C6357', fontSize: 12 },
  field: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingLeft: 16,
    paddingRight: 5,
    backgroundColor: '#F4F1EA',
    borderWidth: 1,
    borderRadius: 15,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 52,
    paddingVertical: 14,
    fontFamily: fonts.regular,
    color: c.ink,
    outlineWidth: 0,
  },
});
