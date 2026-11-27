import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  colors as defaultColors,
  palettes,
  type ColorPalette,
  type PaletteId,
} from '@/constants/theme';

const storageKey = 'campusbite-palette';
type Appearance = {
  paletteId: PaletteId;
  colors: ColorPalette;
  setPalette: (id: PaletteId) => void;
  saveError: string | null;
};
const AppearanceContext = createContext<Appearance>({
  paletteId: 'green',
  colors: defaultColors,
  setPalette: () => {},
  saveError: null,
});

export function AppearanceProvider({ children }: React.PropsWithChildren) {
  const [paletteId, setPaletteId] = useState<PaletteId>('green');
  const [saveError, setSaveError] = useState<string | null>(null);
  const chosen = useRef(false);
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(storageKey)
      .then((saved) => {
        if (active && !chosen.current && palettes.some((palette) => palette.id === saved))
          setPaletteId(saved as PaletteId);
      })
      .catch(() => {
        if (active) setSaveError('Your saved palette could not be loaded on this device.');
      });
    return () => {
      active = false;
    };
  }, []);
  const setPalette = useCallback((id: PaletteId) => {
    if (!palettes.some((palette) => palette.id === id)) return;
    chosen.current = true;
    setPaletteId(id);
    setSaveError(null);
    writes.current = writes.current
      .then(() => AsyncStorage.setItem(storageKey, id))
      .catch(() => setSaveError('Your palette changed, but could not be saved on this device.'));
  }, []);
  const value = useMemo(
    () => ({
      paletteId,
      setPalette,
      saveError,
      colors: palettes.find((palette) => palette.id === paletteId)?.colors ?? defaultColors,
    }),
    [paletteId, setPalette, saveError],
  );
  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export const useAppearance = () => useContext(AppearanceContext);
export const useColors = () => useAppearance().colors;
