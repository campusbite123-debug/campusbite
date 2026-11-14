import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { StyleProp, TextInputProps, ViewStyle } from 'react-native';
import { Modal, Portal } from 'react-native-paper';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors as c, fonts } from '@/constants/theme';
import { foodImageSource } from '@/constants/food-images';
import type { Status } from '@/types';
import { useLayout } from '@/hooks/use-layout';
export function T({
  children,
  style,
  muted,
  bold,
  ...props
}: React.ComponentProps<typeof Text> & { muted?: boolean; bold?: boolean }) {
  return (
    <Text
      {...props}
      style={[
        {
          fontFamily: bold ? fonts.bold : fonts.regular,
          fontSize: 14,
          color: muted ? c.muted : c.ink,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Icon({
  name,
  size = 22,
  color = c.ink,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  return <MaterialCommunityIcons name={name as any} size={size} color={color} />;
}
export function Button({
  children,
  onPress,
  secondary,
  disabled,
  loading,
  icon,
  style,
  small,
}: {
  children: React.ReactNode;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={React.Children.toArray(children)
        .filter((v) => typeof v === 'string' || typeof v === 'number')
        .join('')}
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        {
          minHeight: small ? 44 : 50,
          paddingHorizontal: small ? 14 : 20,
          backgroundColor: secondary ? c.white : c.orange,
          borderWidth: secondary ? 1 : 0,
          borderColor: c.line,
          opacity: disabled || loading ? 0.5 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? c.orange : c.white} />
      ) : (
        <>
          {icon && <Icon name={icon} size={18} color={secondary ? c.ink : c.white} />}
          <T
            bold
            style={{
              color: secondary ? c.ink : c.white,
              fontFamily: fonts.semibold,
              fontSize: small ? 13 : 14,
              flexShrink: 1,
              textAlign: 'center',
            }}
          >
            {children}
          </T>
        </>
      )}
    </Pressable>
  );
}
export function IconButton({
  icon,
  onPress,
  label,
  color = c.ink,
  style,
  disabled,
}: {
  icon: string;
  onPress: () => void;
  label: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: 36,
          height: 36,
          borderRadius: 11,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.35 : pressed ? 0.6 : 1,
        },
        style,
        { minWidth: 44, minHeight: 44 },
      ]}
    >
      <Icon name={icon} color={color} size={20} />
    </Pressable>
  );
}
export function Pill({
  children,
  selected,
  onPress,
  icon,
}: {
  children: React.ReactNode;
  selected?: boolean;
  onPress?: () => void;
  icon?: string;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={[
        s.pill,
        {
          backgroundColor: selected ? c.orange : c.white,
          borderColor: selected ? c.orange : c.line,
        },
      ]}
    >
      {icon && <Icon name={icon} size={18} color={selected ? c.white : c.ink} />}
      <T style={{ fontFamily: fonts.medium, fontSize: 12, color: selected ? c.white : c.ink }}>
        {children}
      </T>
    </Pressable>
  );
}
export function Input({
  label,
  error,
  style,
  ...props
}: TextInputProps & { label?: string; error?: string }) {
  const { isPhone } = useLayout();
  return (
    <View style={{ gap: 7, marginBottom: 15 }}>
      {label && (
        <T bold style={{ fontSize: 12 }}>
          {label}
        </T>
      )}
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.muted}
        {...props}
        style={[
          s.input,
          isPhone && { fontSize: 16, minHeight: 52 },
          props.multiline && { height: 90, textAlignVertical: 'top', paddingTop: 13 },
          style,
        ]}
      />
      {error && <T style={{ color: c.red, fontSize: 12 }}>{error}</T>}
    </View>
  );
}
export function Search({
  value,
  onChangeText,
  placeholder = 'Search for your next favorite meal…',
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
}) {
  const { isPhone } = useLayout();
  return (
    <View style={s.search}>
      <Icon name="magnify" size={21} color={c.muted} />
      <TextInput
        accessibilityLabel={placeholder}
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        value={value}
        onChangeText={onChangeText}
        style={
          {
            flex: 1,
            fontFamily: fonts.regular,
            fontSize: isPhone ? 16 : 14,
            color: c.ink,
            paddingVertical: 10,
            outlineWidth: 0,
          } as any
        }
      />
      {!!value && <IconButton icon="close" label="Clear search" onPress={() => onChangeText('')} />}
    </View>
  );
}
export function Quantity({
  value,
  onChange,
  max = 99,
}: {
  value: number;
  onChange: (q: number) => void;
  max?: number;
}) {
  return (
    <View style={s.quantity}>
      <IconButton
        label="Decrease quantity"
        icon={value === 1 ? 'trash-can-outline' : 'minus'}
        onPress={() => onChange(value - 1)}
        style={{ width: 29, height: 29 }}
      />
      <T bold style={{ minWidth: 18, textAlign: 'center', fontSize: 12 }}>
        {value}
      </T>
      <IconButton
        label="Increase quantity"
        icon="plus"
        color={c.orange}
        disabled={value >= max}
        onPress={() => onChange(value + 1)}
        style={{ width: 29, height: 29 }}
      />
    </View>
  );
}
export function StatusBadge({ status }: { status: Status }) {
  const color =
    status === 'Cancelled'
      ? c.red
      : status === 'Completed' || status === 'Ready for Pickup'
        ? c.green
        : c.orangeDark;
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 7,
        backgroundColor: color + '12',
        flexDirection: 'row',
        gap: 5,
        alignItems: 'center',
      }}
    >
      <View style={{ height: 5, width: 5, borderRadius: 3, backgroundColor: color }} />
      <T style={{ color, fontSize: 10, fontFamily: fonts.semibold }}>{status}</T>
    </View>
  );
}
export function Sheet({
  visible,
  onClose,
  title,
  children,
  footer,
}: React.PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
  title: string;
  footer?: React.ReactNode;
}>) {
  const { width, height, isPhone } = useLayout();
  const insets = useSafeAreaInsets();
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onClose}
        style={isPhone ? { justifyContent: 'flex-end', marginVertical: 0 } : undefined}
        contentContainerStyle={{
          backgroundColor: c.white,
          padding: isPhone ? 20 : 28,
          paddingBottom: isPhone ? Math.max(insets.bottom, 20) : 28,
          borderRadius: 24,
          borderBottomLeftRadius: isPhone ? 0 : 24,
          borderBottomRightRadius: isPhone ? 0 : 24,
          width: isPhone ? width : Math.min(width - 48, 640),
          alignSelf: 'center',
          maxHeight: Math.min(height - insets.top - 16, height * 0.92),
        }}
      >
        <View style={[s.row, { justifyContent: 'space-between', marginBottom: 18 }]}>
          <T style={[s.h2, { flex: 1 }]}>{title}</T>
          <IconButton icon="close" label="Close dialog" onPress={onClose} />
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          style={{ flexShrink: 1 }}
        >
          {children}
        </ScrollView>
        {footer && (
          <View style={{ paddingTop: 16, marginTop: 12, borderTopWidth: 1, borderColor: c.line }}>
            {footer}
          </View>
        )}
      </Modal>
    </Portal>
  );
}
export function Empty({
  icon = 'silverware-fork-knife',
  title,
  text,
  children,
}: React.PropsWithChildren<{ icon?: string; title: string; text: string }>) {
  const { isPhone } = useLayout();
  return (
    <View style={{ alignItems: 'center', padding: isPhone ? 20 : 36, gap: 13 }}>
      <View
        style={{
          width: 68,
          height: 68,
          borderRadius: 24,
          backgroundColor: c.peach,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={30} color={c.orange} />
      </View>
      <T bold style={{ fontSize: 19, textAlign: 'center' }}>
        {title}
      </T>
      <T muted style={{ textAlign: 'center', lineHeight: 22, maxWidth: 320 }}>
        {text}
      </T>
      {children}
    </View>
  );
}
export { Loading } from './loading-skeleton';
export function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return (
    <Empty icon="wifi-alert" title="We couldn't load that" text={message}>
      <Button onPress={retry} icon="refresh">
        Try again
      </Button>
    </Empty>
  );
}
export function FoodImage({ uri, style }: { uri: string; style?: StyleProp<ViewStyle> }) {
  const [failedUri, setFailedUri] = React.useState<string | null>(null);
  return failedUri === uri ? (
    <View
      style={[{ backgroundColor: c.peach, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      <Icon name="food-variant" color={c.orange} size={42} />
    </View>
  ) : (
    <Image
      source={foodImageSource(uri)}
      accessibilityLabel="Meal photograph"
      contentFit="cover"
      allowDownscaling
      cachePolicy="memory-disk"
      recyclingKey={uri}
      transition={0}
      onError={() => setFailedUri(uri)}
      style={style as any}
    />
  );
}
export const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  h1: {
    fontFamily: fonts.display,
    fontSize: 30,
    lineHeight: 39,
    letterSpacing: -0.8,
    color: c.ink,
  },
  h2: { fontFamily: fonts.display, fontSize: 20, lineHeight: 28, letterSpacing: -0.4 },
  card: {
    backgroundColor: c.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.line,
    padding: 20,
  },
  button: {
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 44,
  },
  input: {
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 11,
    minHeight: 48,
    paddingHorizontal: 14,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: c.ink,
    backgroundColor: '#FCFCFA',
  },
  search: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: c.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 47,
  },
  quantity: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.line,
    backgroundColor: '#FAFAF7',
  },
  divider: { height: 1, backgroundColor: c.line, marginVertical: 18 },
});
