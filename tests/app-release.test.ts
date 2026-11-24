import { describe, expect, it } from 'vitest';
import { availableRelease } from '@/utils/app-release';

describe('available app releases', () => {
  const android = { version: '1.10.0', build: '13', url: 'https://campusbite.test/app.apk' };
  const ios = { version: '2.0', build: '8.10', url: 'https://apps.apple.com/app/id123' };
  const manifest = { android, ios, web: { version: '1.2.0' } };

  it('compares numeric components and selects the release for the running platform', () => {
    expect(availableRelease(manifest, 'android', '1.9.9', '25')).toEqual(android);
    expect(availableRelease(manifest, 'ios', '2.0.0', '8.9')).toEqual(ios);
    expect(availableRelease(manifest, 'web', '1.2', null)).toBeNull();
    expect(availableRelease(manifest, 'android', '1.10', '13')).toBeNull();
    expect(availableRelease(manifest, 'ios', '2.1', '1')).toBeNull();
  });

  it('requires valid release metadata and a download link for native builds', () => {
    for (const entry of [
      null,
      {},
      { version: '2' },
      { ...android, version: 'latest' },
      { ...android, url: 'http://campusbite.test/app.apk' },
      { ...android, url: 'javascript:alert(1)' },
    ]) {
      expect(availableRelease({ android: entry }, 'android', '1.0', '1')).toBeNull();
    }
    expect(availableRelease(manifest, 'android', null, '1')).toBeNull();
  });
});
