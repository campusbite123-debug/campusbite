import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
type Manifest = { generation: string; chunks: number };
// Keep each native Keychain/Keystore entry below historic iOS value limits.
// A manifest swap commits a complete generation, so partially written tokens are never read.
const nativeStorage = {
  async getItem(key: string) {
    const raw = await SecureStore.getItemAsync(`${key}.manifest`);
    if (!raw) return null;
    const manifest: Manifest = JSON.parse(raw);
    const parts = await Promise.all(
      Array.from({ length: manifest.chunks }, (_, i) =>
        SecureStore.getItemAsync(`${key}.${manifest.generation}.${i}`),
      ),
    );
    return parts.some((p) => p === null) ? null : parts.join('');
  },
  async setItem(key: string, value: string) {
    const previous = await SecureStore.getItemAsync(`${key}.manifest`);
    const generation = Crypto.randomUUID();
    const characters = Array.from(value);
    const parts = Array.from({ length: Math.max(1, Math.ceil(characters.length / 450)) }, (_, i) =>
      characters.slice(i * 450, (i + 1) * 450).join(''),
    );
    await Promise.all(
      parts.map((part, i) => SecureStore.setItemAsync(`${key}.${generation}.${i}`, part)),
    );
    await SecureStore.setItemAsync(
      `${key}.manifest`,
      JSON.stringify({ generation, chunks: parts.length }),
    );
    if (previous) {
      const old: Manifest = JSON.parse(previous);
      await Promise.all(
        Array.from({ length: old.chunks }, (_, i) =>
          SecureStore.deleteItemAsync(`${key}.${old.generation}.${i}`),
        ),
      );
    }
  },
  async removeItem(key: string) {
    const raw = await SecureStore.getItemAsync(`${key}.manifest`);
    await SecureStore.deleteItemAsync(`${key}.manifest`);
    if (raw) {
      const old: Manifest = JSON.parse(raw);
      await Promise.all(
        Array.from({ length: old.chunks }, (_, i) =>
          SecureStore.deleteItemAsync(`${key}.${old.generation}.${i}`),
        ),
      );
    }
  },
};
export const sessionStorage = Platform.OS === 'web' ? AsyncStorage : nativeStorage;
