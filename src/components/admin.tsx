import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
  Circle,
  Line,
  Text as SvgText,
} from 'react-native-svg';
import { useQueryClient } from '@tanstack/react-query';
import { useSnapshot, useToast } from '@/contexts/app';
import type { Snapshot } from '@/types';
import { errorMessage, money } from '@/utils/domain';
import { colors as c, fonts } from '@/constants/theme';
import { Page } from './shell';
import { ErrorState, Icon, Loading, T, s } from './ui';
export function DataPage({ children }: { children: (data: Snapshot) => React.ReactNode }) {
  const { data, error, isLoading, refetch } = useSnapshot();
  if (isLoading) return <Loading />;
  if (error || !data)
    return <ErrorState message={errorMessage(error)} retry={() => void refetch()} />;
  return <Page>{children(data)}</Page>;
}
export function AdminHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={[s.row, { justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: 27 }]}>
      <View style={{ flexShrink: 1 }}>
        <T muted style={{ fontSize: 10, letterSpacing: 1.4, marginBottom: 7 }}>
          CANTEEN MANAGEMENT
        </T>
        <T style={s.h1}>{title}</T>
        <T muted style={{ fontSize: 12, marginTop: 8 }}>
          {subtitle}
        </T>
      </View>
      {action}
    </View>
  );
}
export function useAction() {
  const client = useQueryClient();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const run = async (
    action: () => Promise<unknown>,
    message = 'Changes saved.',
    after?: () => void,
  ) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await action();
      await client.invalidateQueries({ queryKey: ['canteen'] });
      toast(message);
      after?.();
    } catch (e) {
      void client.invalidateQueries({ queryKey: ['canteen'] });
      toast(errorMessage(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return { busy, run };
}
export function Metric({
  label,
  value,
  icon,
  accent = false,
  note,
}: {
  label: string;
  value: string | number;
  icon: string;
  accent?: boolean;
  note?: string;
}) {
  return (
    <View
      style={[
        s.card,
        {
          flex: 1,
          minWidth: 135,
          backgroundColor: accent ? c.orange : c.white,
          borderColor: accent ? c.orange : c.line,
          padding: 22,
        },
      ]}
    >
      <View style={[s.row, { justifyContent: 'space-between' }]}>
        <T style={{ color: accent ? '#FFE9DD' : c.muted, fontSize: 11 }}>{label}</T>
        <Icon name={icon} size={20} color={accent ? '#FFE4D3' : c.orange} />
      </View>
      <T
        style={{
          fontFamily: fonts.display,
          fontSize: 29,
          color: accent ? c.white : c.ink,
          marginTop: 16,
        }}
      >
        {value}
      </T>
      {note && (
        <T style={{ color: accent ? '#FFE4D3' : c.muted, fontSize: 10, marginTop: 9 }}>{note}</T>
      )}
    </View>
  );
}
export function SalesChart({ series }: { series: { label: string; value: number }[] }) {
  const max = Math.max(10000, ...series.map((p) => p.value));
  const pts = series.map((p, i) => ({
    x: 50 + i * (470 / Math.max(1, series.length - 1)),
    y: 170 - (p.value / max) * 125,
  }));
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
  return (
    <View style={{ marginTop: 10 }}>
      <Svg width="100%" height={220} viewBox="0 0 560 220">
        <Defs>
          <LinearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.orange} stopOpacity="0.18" />
            <Stop offset="1" stopColor={c.orange} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        {[0, 1, 2].map((i) => (
          <React.Fragment key={i}>
            <Line
              x1="50"
              x2="530"
              y1={45 + i * 62.5}
              y2={45 + i * 62.5}
              stroke={c.line}
              strokeDasharray="3 5"
            />
            <SvgText x="0" y={49 + i * 62.5} fontSize="10" fill={c.muted}>
              {money(max * (1 - i / 2))}
            </SvgText>
          </React.Fragment>
        ))}
        <Path d={`${path} L520,175 L50,175 Z`} fill="url(#salesFill)" />
        <Path d={path} fill="none" stroke={c.orange} strokeWidth="3" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <React.Fragment key={i}>
            <Circle cx={p.x} cy={p.y} r="4" fill="white" stroke={c.orange} strokeWidth="2" />
            <SvgText x={p.x} y="204" fontSize="11" textAnchor="middle" fill={c.muted}>
              {series[i].label}
            </SvgText>
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}
