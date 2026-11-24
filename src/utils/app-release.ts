import { z } from 'zod';

export type ReleasePlatform = 'android' | 'ios' | 'web';
const versionNumber = z.string().regex(/^\d{1,10}(?:\.\d{1,10}){0,2}$/);
const webRelease = z.object({ version: versionNumber });
const nativeRelease = webRelease.extend({
  build: versionNumber.optional(),
  url: z.url({ protocol: /^https$/ }),
});
export type AppRelease = { version: string; build?: string; url?: string };

// Both app versions and iOS build numbers can contain dotted numeric components.
function compareVersions(left: string, right: string) {
  const a = left.split('.').map(Number);
  const b = right.split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const difference = (a[i] ?? 0) - (b[i] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

export function availableRelease(
  manifest: unknown,
  platform: ReleasePlatform,
  installedVersion: string | null,
  installedBuild: string | null,
): AppRelease | null {
  if (!installedVersion || !versionNumber.safeParse(installedVersion).success) return null;
  if (!manifest || typeof manifest !== 'object') return null;
  const entry = (manifest as Record<string, unknown>)[platform];
  const schema = platform === 'web' ? webRelease : nativeRelease;
  const parsed = schema.safeParse(entry);
  if (!parsed.success) return null;
  const release: AppRelease = parsed.data;
  const difference = compareVersions(release.version, installedVersion);
  if (difference !== 0) return difference > 0 ? release : null;
  if (!release.build || !installedBuild || !versionNumber.safeParse(installedBuild).success)
    return null;
  return compareVersions(release.build, installedBuild) > 0 ? release : null;
}
