import React from 'react';
import Svg, { G, Path, Rect } from 'react-native-svg';

export function BrandMark({ size }: { size: number }) {
  return (
    <Svg
      testID="brand-mark"
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      fill="#FFFFFF"
      style={{ flexShrink: 0 }}
      accessible={false}
      aria-hidden
    >
      <G transform="translate(30.72 30.72) scale(0.94)">
        <Path
          d="M 718.886 335.042 A 246 246 0 1 0 718.886 688.958"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={108}
          strokeLinecap="round"
        />
        <Rect x={492} y={348} width={28} height={96} rx={14} />
        <Rect x={534} y={348} width={28} height={96} rx={14} />
        <Rect x={576} y={348} width={28} height={96} rx={14} />
        <Rect x={492} y={414} width={112} height={70} rx={24} />
        <Rect x={530} y={456} width={36} height={218} rx={18} />
      </G>
    </Svg>
  );
}
