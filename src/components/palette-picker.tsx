import React from 'react';
import { View } from 'react-native';
import { palettes, fonts } from '@/constants/theme';
import { useAppearance } from '@/contexts/appearance';
import { MotionPressable as Pressable } from './motion';
import { Icon, T } from './ui';

export function PalettePicker() {
  const { paletteId, setPalette, colors: c, saveError } = useAppearance();
  return (
    <View style={{ gap: 14 }}>
      <T style={{ fontFamily: fonts.display, fontSize: 20, color: c.ink }}>Color palette</T>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel="Color palette"
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}
      >
        {palettes.map((palette) => {
          const selected = paletteId === palette.id;
          return (
            <Pressable
              key={palette.id}
              accessibilityRole="radio"
              accessibilityLabel={palette.name}
              accessibilityState={{ checked: selected }}
              aria-checked={selected}
              testID={`palette-option-${palette.id}`}
              onPress={() => setPalette(palette.id)}
              style={{
                flexGrow: 1,
                flexBasis: '46%',
                minWidth: 120,
                padding: 14,
                gap: 12,
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: selected ? c.orange : c.line,
                backgroundColor: selected ? c.peach : c.white,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {[
                    palette.colors.orange,
                    palette.colors.hero,
                    palette.colors.lime,
                    palette.colors.white,
                  ].map((color, index) => (
                    <View
                      key={index}
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 9,
                        backgroundColor: color,
                        borderWidth: 1,
                        borderColor: palette.colors.line,
                      }}
                    />
                  ))}
                </View>
                {selected && <Icon name="check-circle" color={c.orange} size={19} />}
              </View>
              <T bold style={{ color: c.ink, fontSize: 12, lineHeight: 18 }}>
                {palette.name}
              </T>
            </Pressable>
          );
        })}
      </View>
      {!!saveError && (
        <T accessibilityRole="alert" style={{ color: c.red, fontSize: 12, lineHeight: 18 }}>
          {saveError}
        </T>
      )}
    </View>
  );
}
