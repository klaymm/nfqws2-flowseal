import { QueryClient, useQuery } from '@tanstack/react-query';

import { useAppStore } from '@/store/useAppStore';

export type Status = {
  build: string;
  flowseal: string;
  strategy: string;
  running: boolean;
  interface: string;
  rules: number;
  engine: string;
  held: boolean;
  password: boolean;
  autoupdate: string;
  busy: boolean;
  policy: string;
  policy_exclude: boolean;
  policy_applied: boolean;
};

export type StrategyInfo = {
  id: string;
  title: string;
  ts: boolean;
  approximate: boolean;
  description: { ru: string[]; en: string[] };
};

export type Strategies = {
  flowseal: string;
  default: string;
  strategies: StrategyInfo[];
};

export type RunResult = { status: number; output?: string[]; error?: string };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 0,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

export class ApiError extends Error {}

export async function api<T = RunResult>(
  cmd: string,
  params: Record<string, string> = {},
): Promise<T> {
  const res = await fetch('/index.php', {
    method: 'POST',
    body: new URLSearchParams({ cmd, ...params }),
    credentials: 'same-origin',
  });
  if (res.status === 401) {
    useAppStore.getState().setAuth(false);
    throw new ApiError('auth');
  }
  if (!res.ok) {
    throw new ApiError(`HTTP ${res.status}`);
  }
  useAppStore.getState().setAuth(true);
  return (await res.json()) as T;
}

export const useStatus = () =>
  useQuery({
    queryKey: ['status'],
    queryFn: () => api<Status & { status: number }>('status'),
    refetchInterval: 15000,
  });

export const useStrategies = () =>
  useQuery({
    queryKey: ['strategies'],
    queryFn: () => api<Strategies & { status: number }>('strategies'),
    staleTime: Infinity,
  });

export const usePolicies = () =>
  useQuery({
    queryKey: ['policies'],
    queryFn: () => api<{ policies: string[] }>('policies'),
    staleTime: 60 * 1000,
  });

export const useFileContent = (name: string) =>
  useQuery({
    queryKey: ['file', name],
    queryFn: () => api<{ content: string }>('file_get', { name }),
  });

export const useLog = () =>
  useQuery({
    queryKey: ['log'],
    queryFn: () => api<{ content: string; busy: boolean }>('log'),
    refetchInterval: (query) => (query.state.data?.busy ? 2000 : false),
  });

export const invalidate = (...keys: string[][]) =>
  Promise.all(
    keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );
