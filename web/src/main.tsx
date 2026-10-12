import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { AppRouterProvider } from '@/components/AppRouterProvider';

import { createAppRouter } from '@/utils/createAppRouter';

import './index.css';

const router = createAppRouter();

const rootElement = document.getElementById('root')!;
if (!rootElement.innerHTML) {
  createRoot(rootElement).render(
    <StrictMode>
      <AppRouterProvider router={router} />
    </StrictMode>,
  );
}
