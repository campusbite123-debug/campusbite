import React, { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { fonts } from '@/constants/theme';
import { useColors } from '@/contexts/appearance';
import { useLayout } from '@/hooks/use-layout';
import { T } from './ui';

export function PageHeading({
  title,
  subtitle,
  eyebrow,
  action,
  style,
  compact = false,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) {
  const c = useColors();
  const { isPhone, contentWidth } = useLayout();
  const [frameWidth, setFrameWidth] = useState(contentWidth);
  const horizontalInset = Math.max(28, frameWidth * 0.06);
  return (
    <View
      testID="page-heading"
      onLayout={(event) => setFrameWidth(event.nativeEvent.layout.width)}
      style={[styles.heading, compact && { minHeight: 100 }, style]}
    >
      <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%" viewBox="0 0 600 200" preserveAspectRatio="none">
          <Path
            d="M53 19 C170 10 405 9 526 17 Q580 20 584 57 L589 143 Q588 184 540 188 C393 196 211 190 63 188 Q15 186 13 145 L17 62 Q19 28 53 19 Z"
            fill={c.softAccent}
            opacity={0.65}
          />
          <Path
            d="M105 15 C232 3 414 4 511 15 Q567 20 573 58 L580 135 Q582 176 534 181 C389 192 210 184 68 182 Q20 180 18 142 L23 60"
            fill="none"
            stroke={c.orange}
            strokeWidth={3}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </Svg>
        <Svg
          width={compact ? 32 : 45}
          height={compact ? 30 : 42}
          viewBox="0 0 45 42"
          style={styles.quote}
        >
          <Path
            d="M8 3 C1 3 0 12 5 17 C8 20 11 19 11 23 C11 27 8 30 5 32 L8 36 C16 30 20 23 20 15 C20 7 15 3 8 3 Z M31 3 C24 3 23 12 28 17 C31 20 34 19 34 23 C34 27 31 30 28 32 L31 36 C39 30 43 23 43 15 C43 7 38 3 31 3 Z"
            fill={c.orange}
          />
        </Svg>
      </View>
      <View
        style={[
          styles.content,
          { paddingHorizontal: horizontalInset },
          compact && { paddingTop: 26, paddingBottom: 18 },
        ]}
      >
        {!!eyebrow && <T style={[styles.eyebrow, { color: c.muted }]}>{eyebrow}</T>}
        <View style={compact ? styles.compactTitleRow : undefined}>
          <T
            accessibilityRole="header"
            style={[
              styles.title,
              { color: c.ink, fontSize: isPhone ? 27 : 30, lineHeight: isPhone ? 35 : 39 },
              compact && { fontSize: 20, lineHeight: 28, letterSpacing: -0.4 },
            ]}
          >
            {title}
          </T>
          {compact && action}
        </View>
        {!!subtitle && <T style={[styles.subtitle, { color: c.muted }]}>{subtitle}</T>}
        {!!action && !compact && <View style={styles.action}>{action}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { width: '100%', minHeight: 148, marginBottom: 26 },
  quote: { position: 'absolute', left: 20, top: 0 },
  content: { paddingTop: 43, paddingBottom: 28, gap: 8 },
  eyebrow: { fontFamily: fonts.medium, fontSize: 10, lineHeight: 16, letterSpacing: 1.05 },
  title: { fontFamily: fonts.display, letterSpacing: -0.8 },
  subtitle: { fontSize: 13, lineHeight: 21 },
  action: { marginTop: 8, alignItems: 'flex-start' },
  compactTitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
});
