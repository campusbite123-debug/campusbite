import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import type { SessionUser } from '@/types';
import { supabase } from './supabase';
export async function pickMealImage(user: SessionUser): Promise<string | null> {
  if (user.role !== 'ADMIN') throw new Error('Administrator access is required.');
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    base64: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset.base64)
    throw new Error('The selected photo could not be read. Please choose a JPEG, PNG or WebP.');
  const bytes = Uint8Array.from(atob(asset.base64), (ch) => ch.charCodeAt(0));
  if (bytes.length > 5 * 1024 * 1024) throw new Error('Choose a photo smaller than 5 MB.');
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n);
  const webp =
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  if (!jpeg && !png && !webp) throw new Error('Choose a valid JPEG, PNG or WebP photo.');
  const mime = jpeg ? 'image/jpeg' : png ? 'image/png' : 'image/webp';
  const path = `${user.id}/${Crypto.randomUUID()}.${jpeg ? 'jpg' : png ? 'png' : 'webp'}`;
  const { error } = await supabase!.storage
    .from('meal-images')
    .upload(path, bytes.buffer, { contentType: mime, upsert: false });
  if (error) throw new Error(`Photo upload failed: ${error.message}`);
  return supabase!.storage.from('meal-images').getPublicUrl(path).data.publicUrl;
}
export async function exportCSV(contents: string) {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(
      new Blob(['\ufeff' + contents], { type: 'text/csv;charset=utf-8;' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'campusbite-orders.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const { File, Paths } = await import('expo-file-system');
  const Sharing = await import('expo-sharing');
  const file = new File(Paths.cache, 'campusbite-orders.csv');
  file.create({ overwrite: true });
  file.write('\ufeff' + contents);
  if (!(await Sharing.isAvailableAsync()))
    throw new Error('File sharing is not available on this device.');
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    dialogTitle: 'Export canteen orders',
  });
}
export async function enableNotifications() {
  if (Platform.OS === 'web')
    throw new Error(
      'Use the mobile app for device notifications. Live order updates are available here while the app is open.',
    );
  const N = await import('expo-notifications');
  if (Platform.OS === 'android')
    await N.setNotificationChannelAsync('orders', {
      name: 'Pickup updates',
      importance: N.AndroidImportance.HIGH,
    });
  const permission = await N.requestPermissionsAsync();
  if (!permission.granted)
    throw new Error(
      'Notification permission was not granted. You can still track orders inside the app.',
    );
}
export async function notifyReady(number: string) {
  if (Platform.OS === 'web') return;
  const N = await import('expo-notifications');
  if (!(await N.getPermissionsAsync()).granted) return;
  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  await N.scheduleNotificationAsync({
    content: {
      title: 'Your meal is ready! 🍽',
      body: `${number} is ready. Bring your pickup code and cash to the canteen.`,
    },
    trigger: null,
  });
}
