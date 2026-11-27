import React, { useEffect, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Modal as PaperModal } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/contexts/appearance';
import { useMotionReduced } from './motion';

type Props = React.ComponentProps<typeof PaperModal>;

export function AppModal(props: Props) {
  return Platform.OS === 'web' ? <WebModal {...props} /> : <PaperModal {...props} />;
}

function WebModal({
  visible,
  onDismiss,
  children,
  contentContainerStyle,
  style,
  dismissable = true,
  dismissableBackButton = dismissable,
  overlayAccessibilityLabel = 'Close modal',
  testID = 'modal',
}: Props) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const reduced = useMotionReduced();
  const [mounted, setMounted] = useState(visible);
  const [opacity] = useState(() => new Animated.Value(0));
  if (visible && !mounted) setMounted(true);
  useEffect(() => {
    // Paper's Modal always requests a native driver, which browsers lack.
    const animation = Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: reduced ? 0 : visible ? 220 : 145,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
      isInteraction: false,
    });
    animation.start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
    return () => animation.stop();
  }, [visible, reduced, opacity]);
  useEffect(() => {
    if (!visible || !(dismissable || dismissableBackButton)) return;
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onDismiss?.();
      }
    };
    window.addEventListener('keydown', dismissOnEscape);
    return () => window.removeEventListener('keydown', dismissOnEscape);
  }, [visible, dismissable, dismissableBackButton, onDismiss]);
  if (!mounted) return null;
  return (
    <View
      testID={testID}
      accessibilityViewIsModal
      accessibilityLiveRegion="polite"
      onAccessibilityEscape={onDismiss}
      pointerEvents={visible ? 'auto' : 'none'}
      style={StyleSheet.absoluteFill}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.ink + '66', opacity }]}>
        <Pressable
          testID={`${testID}-backdrop`}
          accessibilityRole="button"
          accessibilityLabel={overlayAccessibilityLabel}
          disabled={!dismissable || !visible}
          onPress={onDismiss}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <View
        testID={`${testID}-wrapper`}
        pointerEvents="box-none"
        style={[
          StyleSheet.absoluteFill,
          { justifyContent: 'center', marginTop: insets.top, marginBottom: insets.bottom },
          style,
        ]}
      >
        <Animated.View testID={`${testID}-surface`} style={[{ opacity }, contentContainerStyle]}>
          {children}
        </Animated.View>
      </View>
    </View>
  );
}
