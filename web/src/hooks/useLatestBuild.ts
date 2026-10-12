import { useQuery } from '@tanstack/react-query';

export const REPO_URL = 'https://github.com/klaymm/nfqws2-flowseal';
const RAW_BUILD_CONF =
  'https://raw.githubusercontent.com/klaymm/nfqws2-flowseal/main/build.conf';

const parts = (version: string) =>
  version.split('.').map((n) => Number.parseInt(n, 10) || 0);

export function isNewer(latest: string, current: string): boolean {
  const a = parts(latest);
  const b = parts(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) {
      return (a[i] ?? 0) > (b[i] ?? 0);
    }
  }
  return false;
}

export const useLatestBuild = () =>
  useQuery({
    queryKey: ['latest-build'],
    queryFn: async () => {
      const res = await fetch(RAW_BUILD_CONF, { cache: 'no-store' });
      if (!res.ok) {
        return '';
      }
      const text = await res.text();
      return text.match(/^BUILD_VERSION=(.+)$/m)?.[1]?.trim() ?? '';
    },
    staleTime: 60 * 60 * 1000,
  });
