import { useColors } from '@/contexts/appearance';
import { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, type ScrollViewProps } from 'react-native';
import { T } from './ui';

// The browser version of React Native's RefreshControl has no gesture handling.
export function PageScrollView({ refreshControl, children, ...props }: ScrollViewProps) {
  const c = useColors();

  const start = useRef<{ x: number; y: number } | null>(null);
  const [ready, setReady] = useState(false);
  if (!refreshControl) return <ScrollView {...props}>{children}</ScrollView>;

  const { onRefresh, refreshing } = refreshControl.props;
  function reset() {
    start.current = null;
    setReady(false);
  }
  function isPull(x: number, y: number) {
    if (!start.current) return false;
    const down = y - start.current.y;
    return down >= 64 && down > Math.abs(x - start.current.x);
  }
  const scrollStyle = { flex: 1, overscrollBehaviorY: 'contain' } as const;
  return (
    <ScrollView
      {...props}
      style={[props.style, scrollStyle]}
      onTouchStart={({ currentTarget, nativeEvent: { touches } }) => {
        reset();
        if (
          !refreshing &&
          touches.length === 1 &&
          currentTarget instanceof HTMLElement &&
          currentTarget.scrollTop <= 0
        ) {
          start.current = { x: touches[0].pageX, y: touches[0].pageY };
        }
      }}
      onTouchMove={({ nativeEvent: { touches } }) => {
        if (!start.current || touches.length !== 1) return;
        const { pageX, pageY } = touches[0];
        const down = pageY - start.current.y;
        if (down < -8 || Math.abs(pageX - start.current.x) > Math.max(8, down)) reset();
        else setReady(isPull(pageX, pageY));
      }}
      onTouchCancel={reset}
      onTouchEnd={({ currentTarget, nativeEvent: { changedTouches } }) => {
        const touch = changedTouches[0];
        const pulled = touch && isPull(touch.pageX, touch.pageY);
        reset();
        if (
          pulled &&
          !refreshing &&
          currentTarget instanceof HTMLElement &&
          currentTarget.scrollTop <= 0
        )
          onRefresh?.();
      }}
    >
      {refreshing ? (
        <ActivityIndicator accessibilityLabel="Refreshing Home" color={c.ink} />
      ) : ready ? (
        <T style={{ textAlign: 'center', color: c.ink }}>Release to refresh</T>
      ) : null}
      {children}
    </ScrollView>
  );
}
