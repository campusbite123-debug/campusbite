import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { Portal } from 'react-native-paper';
import { useColors } from './appearance';
import { useMotionReduced } from '@/components/motion';
import { foodImageSource } from '@/constants/food-images';

export type CartPoint = { x: number; y: number };
type Flight = { id: number; image: string; from: CartPoint; to: CartPoint };
type CartMotion = {
  targetRef: React.RefObject<View | null>;
  targetScale: Animated.Value;
  flyToCart: (image: string, from?: CartPoint) => void;
};
const CartMotionContext = createContext<CartMotion>(null!);
export const useCartMotion = () => useContext(CartMotionContext);

export function CartMotionProvider({ children }: React.PropsWithChildren) {
  const reduced = useMotionReduced();
  const { width, height } = useWindowDimensions();
  const targetRef = useRef<View>(null);
  const [targetScale] = useState(() => new Animated.Value(1));
  const [flights, setFlights] = useState<Flight[]>([]);
  const nextId = useRef(0);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      targetScale.stopAnimation();
    };
  }, [targetScale]);
  const finish = useCallback(
    (id: number, arrived: boolean) => {
      if (!active.current) return;
      setFlights((current) => current.filter((flight) => flight.id !== id));
      if (!arrived) return;
      targetScale.stopAnimation();
      targetScale.setValue(1);
      Animated.sequence([
        Animated.timing(targetScale, {
          toValue: 1.22,
          duration: 90,
          useNativeDriver: Platform.OS !== 'web',
          isInteraction: false,
        }),
        Animated.timing(targetScale, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: Platform.OS !== 'web',
          isInteraction: false,
        }),
      ]).start();
    },
    [targetScale],
  );
  function flyToCart(image: string, point?: CartPoint) {
    if (reduced) return;
    const from =
      point && Number.isFinite(point.x) && Number.isFinite(point.y) && (point.x > 0 || point.y > 0)
        ? point
        : { x: width / 2, y: height / 2 };
    targetRef.current?.measureInWindow((x, y, targetWidth, targetHeight) => {
      if (!active.current || targetWidth <= 0 || targetHeight <= 0) return;
      const flight = {
        id: ++nextId.current,
        image,
        from,
        to: { x: x + targetWidth / 2, y: y + targetHeight / 2 },
      };
      setFlights((current) => [...current.slice(-5), flight]);
    });
  }
  return (
    <CartMotionContext.Provider value={{ targetRef, targetScale, flyToCart }}>
      {children}
      <Portal>
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          aria-hidden
          style={StyleSheet.absoluteFill}
        >
          {flights.map((flight) => (
            <FlyingMeal key={flight.id} flight={flight} onFinish={finish} />
          ))}
        </View>
      </Portal>
    </CartMotionContext.Provider>
  );
}

export function CartAnimationTarget({ children }: React.PropsWithChildren) {
  const { targetRef, targetScale } = useCartMotion();
  return (
    <Animated.View
      ref={targetRef}
      collapsable={false}
      testID="cart-animation-target"
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ scale: targetScale }],
      }}
    >
      {children}
    </Animated.View>
  );
}

function FlyingMeal({
  flight,
  onFinish,
}: {
  flight: Flight;
  onFinish: (id: number, arrived: boolean) => void;
}) {
  const c = useColors();
  const reduced = useMotionReduced();
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduced) {
      onFinish(flight.id, false);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 720,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: Platform.OS !== 'web',
      isInteraction: false,
    });
    animation.start(({ finished }) => {
      if (finished) onFinish(flight.id, true);
    });
    return () => animation.stop();
  }, [flight.id, onFinish, progress, reduced]);
  const arcHeight = Math.min(130, 65 + Math.abs(flight.to.y - flight.from.y) * 0.2);
  const arc = Animated.multiply(
    Animated.multiply(progress, Animated.subtract(1, progress)),
    -4 * arcHeight,
  );
  return (
    <Animated.View
      testID="cart-flight"
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: flight.from.x - 32,
        top: flight.from.y - 32,
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 3,
        borderColor: c.white,
        backgroundColor: c.orange,
        overflow: 'hidden',
        boxShadow: `0px 6px 18px ${c.ink}35`,
        opacity: progress.interpolate({
          inputRange: [0, 0.08, 0.85, 1],
          outputRange: [0, 1, 1, 0],
        }),
        transform: [
          { translateX: Animated.multiply(progress, flight.to.x - flight.from.x) },
          {
            translateY: Animated.add(Animated.multiply(progress, flight.to.y - flight.from.y), arc),
          },
          { scale: progress.interpolate({ inputRange: [0, 0.3, 1], outputRange: [1, 1.1, 0.18] }) },
          { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '12deg'] }) },
        ],
      }}
    >
      <Image
        source={foodImageSource(flight.image)}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={0}
        accessible={false}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}
