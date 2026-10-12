import { routeTree } from '@/routeTree.generated';
import { createRouter } from '@tanstack/react-router';

export function createAppRouter() {
  return createRouter({
    routeTree,
    defaultPreload: 'render',
  });
}
