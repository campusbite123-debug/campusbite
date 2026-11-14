import React from 'react';
import { Image } from 'expo-image';

export function BrandMark({ size }: { size: number }) {
  return (
    <Image
      source={require('../../assets/brand/campusbite-mark.svg')}
      contentFit="contain"
      style={{ width: size, height: size, flexShrink: 0 }}
      accessible={false}
      aria-hidden
    />
  );
}
