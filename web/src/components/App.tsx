import { type ReactNode } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useBlocker, type AnyRouter } from '@tanstack/react-router';

import { invalidate, useStatus } from '@/api/client';

import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { LoginDialog } from '@/components/LoginDialog';
import { MainTabs } from '@/components/MainTabs';
import { UpdateDialog } from '@/components/UpdateDialog';

import { useAppStore } from '@/store/useAppStore';

import { useTranslation } from '@/hooks/useTranslation';

const centered = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const;

export function App({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { auth, needSave } = useAppStore();
  const { isError } = useStatus();

  const { proceed, reset, status } = useBlocker<AnyRouter, true>({
    shouldBlockFn: () => needSave,
    enableBeforeUnload: () => needSave,
    withResolver: true,
  });

  let content: ReactNode;
  if (auth) {
    content = children;
  } else if (auth === false) {
    content = <LoginDialog />;
  } else if (isError) {
    content = (
      <Box sx={centered}>
        <Stack spacing={2} alignItems="center">
          <Typography color="text.secondary">
            {t('system.no_connection')}
          </Typography>
          <Button
            variant="outlined"
            onClick={() => void invalidate(['status'])}
          >
            {t('common.refresh')}
          </Button>
        </Stack>
      </Box>
    );
  } else {
    content = (
      <Box sx={centered}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Header />

      {auth && <MainTabs />}

      <Box flex={1} sx={{ position: 'relative' }}>
        {content}
      </Box>

      <Footer />

      <ConfirmationDialog
        title={t('confirmation.file_not_saved.title')}
        description={t('confirmation.file_not_saved.description')}
        open={status === 'blocked'}
        onClose={() => reset?.()}
        onSubmit={() => proceed?.()}
      />

      <UpdateDialog />
    </>
  );
}
