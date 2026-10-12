import RefreshIcon from '@mui/icons-material/Refresh';
import { Box, Button, Stack, Typography } from '@mui/material';
import { createFileRoute } from '@tanstack/react-router';

import { useLog } from '@/api/client';

import { Editor } from '@/components/Editor';
import { HelpTip } from '@/components/HelpTip';

import { useTranslation } from '@/hooks/useTranslation';

export const Route = createFileRoute('/log')({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();
  const { data, isFetching, refetch } = useLog();

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{
          px: 2,
          py: 0.75,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="mono" color="text.secondary">
          nfqws2-flowseal.log
        </Typography>
        <HelpTip title={t('log.help')} />
        <Box flex={1} />
        <Button
          size="small"
          startIcon={<RefreshIcon />}
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          {t('common.refresh')}
        </Button>
      </Stack>

      <Box sx={{ flex: 1, position: 'relative' }}>
        {data && (
          <Editor
            type="log"
            value={data.content || t('log.empty')}
            readonly
            sx={{ position: 'absolute', inset: 0 }}
          />
        )}
      </Box>
    </Box>
  );
}
