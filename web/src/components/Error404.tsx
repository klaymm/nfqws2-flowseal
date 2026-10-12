import { Alert, Box } from '@mui/material';

import { Trans } from '@/components/Trans';

export function Error404() {
  return (
    <Box sx={{ p: 3 }}>
      <Alert severity="error" variant="outlined">
        <Trans i18nKey="system.not_found" />
      </Alert>
    </Box>
  );
}
