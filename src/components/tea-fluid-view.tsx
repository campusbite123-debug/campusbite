import React, { useEffect, useId, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Image as SvgImage,
  LinearGradient,
  Pattern,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { fonts } from '@/constants/theme';
import { useColors } from '@/contexts/appearance';
import { useLayout } from '@/hooks/use-layout';
import {
  smooth,
  teaDroplet,
  teaEnergy,
  teaIce,
  teaJet,
  teaSurface,
} from '@/utils/tea-fluid-motion';
import { useMotionReduced } from './motion';
import { T } from './ui';

const FluidPath = Animated.createAnimatedComponent(Path);
const FluidEllipse = Animated.createAnimatedComponent(Ellipse);
const FluidGroup = Animated.createAnimatedComponent(G);
const ICE = require('../../assets/ingredients/tea-ice.webp');
const GLASS = require('../../assets/ingredients/tea-glass.webp');
const TEA = require('../../assets/ingredients/tea-brewed-tea.webp');
const REFRACTION = require('../../assets/ingredients/tea-splash.webp');
const DROPLETS = Array.from({ length: 24 }, (_, index) => index);
const STRANDS = [1, 2, 3, 4];

function Droplet({
  time,
  index,
  fill,
}: {
  time: SharedValue<number>;
  index: number;
  fill: string;
}) {
  const props = useAnimatedProps(() => {
    const p = teaDroplet(time.value * 3.2, index);
    return { cx: p.x, cy: p.y, rx: p.radius, ry: p.radius * p.stretch, opacity: p.opacity };
  });
  return <FluidEllipse testID={`tea-droplet-${index}`} animatedProps={props} fill={fill} />;
}

function Strand({ time, index, fill }: { time: SharedValue<number>; index: number; fill: string }) {
  const props = useAnimatedProps(() => ({ d: teaJet(time.value * 3.2, index) }));
  return <FluidPath animatedProps={props} fill={fill} stroke="#F8C86E" strokeWidth={0.7} />;
}

function IceCube({
  time,
  index,
  scaleX,
  scaleY,
  id,
}: {
  time: SharedValue<number>;
  index: number;
  scaleX: number;
  scaleY: number;
  id: string;
}) {
  const positions = [
    { x: 209, y: 209, size: 43, angle: -9 },
    { x: 253, y: 223, size: 39, angle: 14 },
    { x: 229, y: 249, size: 45, angle: -15 },
  ];
  const cube = positions[index];
  const motion = useAnimatedStyle(() => {
    const p = teaIce(time.value * 3.2, index);
    return {
      transform: [
        { translateX: p.x * scaleX },
        { translateY: p.y * scaleY },
        { rotate: `${cube.angle + p.rotation}deg` },
      ],
    };
  });
  return (
    <Animated.View
      testID={`tea-ice-${index}`}
      style={[
        {
          position: 'absolute',
          left: (cube.x - 198) * scaleX,
          top: (cube.y - 200) * scaleY,
          width: cube.size * scaleX,
          height: cube.size * scaleY,
        },
        motion,
      ]}
    >
      <Svg width="100%" height="100%" viewBox="190 0 385 340">
        <Defs>
          {/* The rigid ice uses one isolated cube, not a floating ice cluster. */}
          <ClipPath id={id}>
            <Path d="M211 80 Q214 64 235 56 L375 5 Q398 -3 417 8 L495 33 Q524 48 535 70 L560 227 Q566 248 550 262 L406 329 Q388 336 368 328 L245 284 Q232 280 227 259 Z" />
          </ClipPath>
        </Defs>
        <SvgImage href={ICE} x={0} y={0} width={780} height={604} clipPath={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

export function TeaFluidView() {
  const c = useColors();
  const styles = useComponentStyles();

  const reduced = useMotionReduced();
  const { contentWidth, height, fontScale } = useLayout();
  const [width, setWidth] = useState(Math.min(550, contentWidth));
  const stageHeight = Math.round(
    Math.min(width * 1.4, height * 0.6) * Math.max(1, fontScale / 1.2),
  );
  const sx = width / 360;
  const sy = stageHeight / 480;
  const id = `tea${useId().replace(/[^a-z0-9]/gi, '')}`;
  const fillId = `${id}fill`;
  const jetId = `${id}jet`;
  const clipId = `${id}clip`;
  const dropId = `${id}drop`;
  const shadowId = `${id}shadow`;
  const textureId = `${id}texture`;
  const surfaceId = `${id}surface`;
  const flowId = `${id}flow`;
  const time = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    cancelAnimation(time);
    time.value = reduced ? 1 : 0;
    if (!reduced)
      time.value = withDelay(700, withTiming(1, { duration: 3200, easing: Easing.linear }));
    return () => cancelAnimation(time);
  }, [reduced, time]);

  const body = useAnimatedProps(() => ({ d: teaSurface(time.value * 3.2, false) }));
  const surface = useAnimatedProps(() => ({ d: teaSurface(time.value * 3.2) }));
  const jet = useAnimatedProps(() => {
    const t = time.value * 3.2;
    return { d: teaJet(t), opacity: smooth(0, 0.12, t) * (1 - smooth(1.55, 1.8, t)) };
  });
  const spray = useAnimatedProps(() => {
    const t = time.value * 3.2;
    return { opacity: smooth(0, 0.12, t) * (1 - smooth(2.1, 2.5, t)) };
  });
  const branches = useAnimatedProps(() => {
    const t = time.value * 3.2;
    return { opacity: smooth(0.15, 0.4, t) * (1 - smooth(1.3, 1.8, t)) };
  });
  const glint = useAnimatedProps(() => {
    const t = time.value * 3.2;
    const e = teaEnergy(t);
    const y = 245 + e * 12;
    const h = e * 172;
    const bend = Math.sin(t * 5.1) * 19 * e;
    return {
      d: `M239 ${y - 4} C${234 - bend} ${y - h * 0.43} ${244 + bend} ${y - h * 0.55} ${230 + bend} ${y - h + 13}`,
      opacity: smooth(0, 0.12, t) * (1 - smooth(1.5, 1.8, t)) * 0.75,
    };
  });
  const ripple = useAnimatedProps(() => {
    const t = time.value * 3.2;
    const u = Math.max(0, t - 1.7);
    return {
      cx: 247,
      cy: 239,
      rx: 12 + 48 * smooth(0, 1.2, u),
      ry: 2 + 9 * smooth(0, 1.2, u),
      opacity: smooth(0, 0.1, u) * (1 - smooth(0.2, 1.3, u)) * 0.7,
    };
  });
  const labels = useAnimatedStyle(() => ({ opacity: smooth(0.78, 1, time.value) }));
  const labelHeight = 36 * Math.max(1, fontScale);

  return (
    <View
      testID="ingredient-stage"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[styles.stage, { height: stageHeight }]}
    >
      <View
        testID="ingredient-layer-1"
        style={{
          position: 'absolute',
          left: 176 * sx,
          top: 174 * sy,
          width: 142 * sx,
          height: 274 * sy,
        }}
      >
        <Image
          source={GLASS}
          cachePolicy="memory-disk"
          transition={0}
          contentFit="fill"
          style={StyleSheet.absoluteFill}
          accessible={false}
        />
      </View>
      <View
        testID="ingredient-layer-0"
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 188 * sx,
          top: 225 * sy,
          width: 119 * sx,
          height: 204 * sy,
        }}
      />
      <Svg
        pointerEvents="none"
        width="100%"
        height="100%"
        viewBox="0 0 360 480"
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          {/* Refraction detail is mapped inside the deforming contours; no
              splash image is translated or scaled as a single object. */}
          <Pattern
            id={textureId}
            width={1}
            height={1}
            viewBox="80 155 700 230"
            preserveAspectRatio="none"
          >
            <SvgImage href={TEA} x={0} y={0} width={862} height={472} />
          </Pattern>
          <Pattern
            id={surfaceId}
            width={1}
            height={1}
            viewBox="0 0 862 165"
            preserveAspectRatio="none"
          >
            <SvgImage href={TEA} x={0} y={0} width={862} height={472} />
          </Pattern>
          <Pattern
            id={flowId}
            width={1}
            height={1}
            viewBox="178 272 113 281"
            preserveAspectRatio="none"
          >
            <SvgImage href={REFRACTION} x={0} y={0} width={480} height={559} />
          </Pattern>
          <LinearGradient id={fillId} x1="0%" y1="0%" x2="100%" y2="9%">
            <Stop offset="0" stopColor="#763706" stopOpacity={0.9} />
            <Stop offset="0.16" stopColor="#C97B16" stopOpacity={0.9} />
            <Stop offset="0.36" stopColor="#F4B447" stopOpacity={0.83} />
            <Stop offset="0.65" stopColor="#B66108" stopOpacity={0.96} />
            <Stop offset="0.88" stopColor="#E69927" stopOpacity={0.88} />
            <Stop offset="1" stopColor="#713504" stopOpacity={0.9} />
          </LinearGradient>
          <LinearGradient id={jetId} x1="0%" y1="0%" x2="100%" y2="14%">
            <Stop offset="0" stopColor="#99500B" stopOpacity={0.9} />
            <Stop offset="0.21" stopColor="#F2A92D" stopOpacity={0.94} />
            <Stop offset="0.4" stopColor="#FFE1A0" stopOpacity={0.65} />
            <Stop offset="0.6" stopColor="#B7690C" stopOpacity={0.94} />
            <Stop offset="0.8" stopColor="#ED9E25" stopOpacity={0.85} />
            <Stop offset="1" stopColor="#9E5007" stopOpacity={0.98} />
          </LinearGradient>
          <RadialGradient id={dropId} cx="30%" cy="24%" r="75%">
            <Stop offset="0" stopColor="#FFF5DB" />
            <Stop offset="0.28" stopColor="#F5BF62" stopOpacity={0.8} />
            <Stop offset="0.8" stopColor="#B66610" stopOpacity={0.9} />
            <Stop offset="1" stopColor="#864108" />
          </RadialGradient>
          <RadialGradient id={shadowId}>
            <Stop offset="0" stopColor={c.ink} stopOpacity={0.13} />
            <Stop offset="1" stopColor={c.ink} stopOpacity={0} />
          </RadialGradient>
          <ClipPath id={clipId}>
            <Path d="M180 188 Q247 169 314 188 L301 420 Q247 444 193 420 Z" />
          </ClipPath>
        </Defs>
        <Ellipse cx={247} cy={450} rx={87} ry={13} fill={`url(#${shadowId})`} />
        <G clipPath={`url(#${clipId})`}>
          <FluidPath testID="tea-fill" animatedProps={body} fill={`url(#${fillId})`} />
          <FluidPath animatedProps={body} fill={`url(#${textureId})`} opacity={0.8} />
          <FluidPath
            testID="tea-surface"
            animatedProps={surface}
            fill={`url(#${surfaceId})`}
            stroke="#92520C"
            strokeWidth={0.8}
          />
          <FluidEllipse animatedProps={ripple} fill="none" stroke="#FFE2A1" strokeWidth={1.5} />
          <Path
            d="M187 255 L198 413 Q247 434 298 414 L308 254"
            fill="none"
            stroke="#FFF4CD"
            strokeOpacity={0.35}
            strokeWidth={2}
          />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
            <Circle
              key={index}
              cx={204 + ((index * 31) % 86)}
              cy={292 + ((index * 37) % 112)}
              r={0.7 + (index % 3) * 0.4}
              fill="#FFE5AA"
              opacity={0.35}
            />
          ))}
        </G>
        <FluidGroup testID="tea-splash" animatedProps={spray}>
          <FluidGroup animatedProps={branches}>
            {STRANDS.map((index) => (
              <Strand key={index} time={time} index={index} fill={`url(#${jetId})`} />
            ))}
          </FluidGroup>
          <FluidPath
            testID="tea-jet"
            animatedProps={jet}
            fill={`url(#${flowId})`}
            stroke="#C78624"
            strokeWidth={0.65}
          />
          <FluidPath
            animatedProps={glint}
            fill="none"
            stroke="#FFF0BF"
            strokeWidth={2.2}
            strokeLinecap="round"
          />
          {DROPLETS.map((index) => (
            <Droplet key={index} time={time} index={index} fill={`url(#${dropId})`} />
          ))}
        </FluidGroup>
      </Svg>
      <View
        testID="ingredient-layer-2"
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 198 * sx,
          top: 200 * sy,
          width: 106 * sx,
          height: 98 * sy,
        }}
      >
        {[0, 1, 2].map((index) => (
          <IceCube
            key={index}
            time={time}
            index={index}
            scaleX={sx}
            scaleY={sy}
            id={`${id}ice${index}`}
          />
        ))}
      </View>
      <Svg
        pointerEvents="none"
        width="100%"
        height="100%"
        viewBox="0 0 360 480"
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFill}
      >
        {/* Glass reflections are in front of the liquid and ice. */}
        <SvgImage href={GLASS} x={176} y={174} width={142} height={274} opacity={0.22} />
        <Path
          d="M180 188 C186 203 303 203 314 188"
          fill="none"
          stroke="#768481"
          strokeOpacity={0.65}
          strokeWidth={1.8}
        />
        <Path
          d="M183 209 L196 411 M303 211 L293 410"
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity={0.65}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <Path
          d="M195 424 Q247 446 300 423"
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity={0.8}
          strokeWidth={2}
        />
      </Svg>
      <View
        testID="tea-rim"
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 245 * sx,
          top: 186 * sy,
          width: 4 * sx,
          height: 4 * sy,
        }}
      />
      {[
        { index: 2, label: 'Ice', x: 230, y: 233 },
        { index: 0, label: 'Brewed tea', x: 239, y: 333 },
      ].map((label) => (
        <Animated.View
          key={label.index}
          testID={`ingredient-callout-${label.index}`}
          pointerEvents="none"
          style={[
            styles.callout,
            {
              top: label.y * sy - labelHeight / 2,
              width: label.x * sx - 16 + 2.5,
              height: labelHeight,
            },
            labels,
          ]}
        >
          <T style={[styles.label, { width: Math.min(104, width * 0.28) }]}>{label.label}</T>
          <View style={styles.leader} />
          <View testID={`ingredient-anchor-${label.index}`} style={styles.anchor} />
        </Animated.View>
      ))}
    </View>
  );
}

function useComponentStyles() {
  const c = useColors();
  return React.useMemo(
    () =>
      StyleSheet.create({
        stage: {
          backgroundColor: c.white,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: c.line,
          overflow: 'hidden',
        },
        callout: {
          position: 'absolute',
          left: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
        },
        label: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 17, color: c.ink },
        leader: { flex: 1, height: 1, backgroundColor: c.muted + '65' },
        anchor: {
          width: 5,
          height: 5,
          borderRadius: 3,
          backgroundColor: c.teal,
          borderWidth: 1,
          borderColor: c.white,
        },
      }),
    [c],
  );
}
