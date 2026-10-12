import { createRootRoute, Outlet } from '@tanstack/react-router';

import { App } from '@/components/App';
import { Error404 } from '@/components/Error404';
import { Layout } from '@/components/Layout';

export const Route = createRootRoute({
  component: RouteComponent,
  notFoundComponent: Error404,
});

function RouteComponent() {
  return (
    <Layout>
      <App>
        <Outlet />
      </App>
    </Layout>
  );
}
