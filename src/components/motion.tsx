import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  Pressable,
  type PressableProps,
  type ViewStyle,
} from 'react-native';

const ReducedMotion = createContext(true);
export const useMotionReduced = () => useContext(ReducedMotion);
const native = Platform.OS !== 'web';
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function MotionProvider({ children }: React.PropsWithChildren) {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let pending = true;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      pending = false;
      setReduced(value);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then(
      (value) => {
        if (pending) setReduced(value);
      },
      () => {},
    );
    return () => {
      pending = false;
      subscription.remove();
    };
  }, []);
  return <ReducedMotion.Provider value={reduced}>{children}</ReducedMotion.Provider>;
}

export function MotionPressable({
  style,
  onPressIn,
  onPressOut,
  onHoverIn,
  onHoverOut,
  disabled,
  ...props
}: PressableProps) {
  const reduced = useContext(ReducedMotion);
  const [scale] = useState(() => new Animated.Value(1));
  const [pressed, setPressed] = useState(false);
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    if (disabled || reduced) scale.setValue(1);
    return () => scale.stopAnimation();
  }, [scale, reduced, disabled]);
  function change(next: boolean) {
    setPressed(next);
    if (reduced || disabled) return;
    if (next) scale.setValue(0.985);
    Animated.timing(scale, {
      toValue: next ? 0.965 : 1,
      duration: next ? 85 : 170,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: native,
      isInteraction: false,
    }).start();
  }
  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      style={[
        typeof style === 'function' ? style({ pressed, hovered }) : style,
        { transform: [{ scale }] },
      ]}
      onHoverIn={(event) => {
        setHovered(true);
        onHoverIn?.(event);
      }}
      onHoverOut={(event) => {
        setHovered(false);
        onHoverOut?.(event);
      }}
      onPressIn={(event) => {
        change(true);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        change(false);
        onPressOut?.(event);
      }}
    />
  );
}

export function useReveal(visible: boolean, identity?: string) {
  const reduced = useContext(ReducedMotion);
  const [progress] = useState(() => new Animated.Value(visible ? 1 : 0));
  useLayoutEffect(() => {
    if (reduced) {
      progress.setValue(visible ? 1 : 0);
      return;
    }
    if (visible) progress.setValue(0);
    const transition = Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? 260 : 145,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: native,
      isInteraction: false,
    });
    transition.start();
    return () => transition.stop();
  }, [visible, identity, reduced, progress]);
  return progress;
}

export function Reveal({
  children,
  identity,
  style,
}: React.PropsWithChildren<{ identity?: string; style?: ViewStyle }>) {
  const progress = useReveal(true, identity);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
