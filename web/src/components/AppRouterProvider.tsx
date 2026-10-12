import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, type RegisteredRouter } from '@tanstack/react-router';

import { queryClient } from '@/api/client';

export function AppRouterProvider({ router }: { router: RegisteredRouter }) {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
