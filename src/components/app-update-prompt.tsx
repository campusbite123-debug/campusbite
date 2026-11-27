import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { usePathname } from 'expo-router';
import releasesAtBuild from '../../public/app-releases.json';
import { availableRelease, type AppRelease } from '@/utils/app-release';
import { useColors } from '@/contexts/appearance';
import { Button, Sheet, T } from './ui';

const manifestPath = '/app-releases.json';
const checkInterval = 30 * 60 * 1000;
const reminderDelay = 24 * 60 * 60 * 1000;
const reminderKey = (release: AppRelease) =>
  `campusbite.update.${Platform.OS}.${release.version}.${release.build ?? ''}`;

export function AppUpdatePrompt() {
  const colors = useColors();

  const [release, setRelease] = useState<AppRelease | null>(null);
  const [opening, setOpening] = useState(false);
  const [failedLink, setFailedLink] = useState('');
  const snoozed = useRef({ key: '', until: 0 });
  const pathname = usePathname();

  useEffect(() => {
    const platform = Platform.OS;
    if (platform !== 'web' && platform !== 'android' && platform !== 'ios') return;
    if (platform !== 'web' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient)
      return;
    const web = platform === 'web';
    const endpoint = web ? manifestPath : `https://campusbite.expo.app${manifestPath}`;
    const version = web ? releasesAtBuild.web.version : Application.nativeApplicationVersion;
    let active = true;
    let request: AbortController | null = null;

    const check = async () => {
      if (request || AppState.currentState === 'background') return;
      const controller = new AbortController();
      request = controller;
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch(endpoint, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) return;
        const next = availableRelease(
          await response.json(),
          platform,
          version,
          Application.nativeBuildVersion,
        );
        if (!next) {
          if (active) setRelease(null);
          return;
        }
        const key = reminderKey(next);
        const storedUntil = Number(await AsyncStorage.getItem(key).catch(() => null));
        const local = snoozed.current;
        const until = Math.max(storedUntil || 0, local.key === key ? local.until : 0);
        if (active) setRelease(Date.now() < until ? null : next);
      } catch {
        // An unavailable release feed must never interrupt sign-in or ordering.
      } finally {
        clearTimeout(timeout);
        request = null;
      }
    };

    void check();
    const timer = setInterval(check, checkInterval);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    return () => {
      active = false;
      clearInterval(timer);
      subscription?.remove();
      request?.abort();
    };
  }, []);

  // Reloading an email action page can consume its one-time token a second time.
  if (!release || pathname === '/auth/confirm' || pathname === '/reset-password') return null;
  const key = reminderKey(release);
  function remindLater() {
    const until = Date.now() + reminderDelay;
    snoozed.current = { key, until };
    setRelease(null);
    setFailedLink('');
    void AsyncStorage.setItem(key, String(until)).catch(() => {});
  }
  async function update() {
    if (opening || !release) return;
    if (Platform.OS === 'web') {
      window.location.reload();
      return;
    }
    if (!release.url) return;
    setOpening(true);
    setFailedLink('');
    try {
      await Linking.openURL(release.url);
      remindLater();
    } catch {
      setFailedLink(key);
    } finally {
      setOpening(false);
    }
  }
  return (
    <Sheet visible title="A Campusbite update is available" onClose={remindLater}>
      <View style={{ gap: 14 }}>
        <T style={{ lineHeight: 22 }}>
          Version {release.version}
          {release.build ? ` (build ${release.build})` : ''} is ready.
          {Platform.OS === 'web'
            ? ' Refresh this page to use it.'
            : ' Open the download page to update your app.'}
        </T>
        {failedLink === key && (
          <T accessibilityRole="alert" style={{ color: colors.red }}>
            The download page couldn’t open. Try again or choose a reminder.
          </T>
        )}
        <Button loading={opening} onPress={update}>
          Update now
        </Button>
        <Button secondary onPress={remindLater}>
          Remind me tomorrow
        </Button>
      </View>
    </Sheet>
  );
}
