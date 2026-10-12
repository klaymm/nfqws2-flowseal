import type { ReactNode } from 'react';
import { Box, Paper, Stack, Typography } from '@mui/material';

import { HelpTip } from '@/components/HelpTip';

export const Page = ({ children }: { children: ReactNode }) => (
  <Box sx={{ position: 'absolute', inset: 0, overflowY: 'auto' }}>
    <Stack
      spacing={2.5}
      sx={{ maxWidth: 760, mx: 'auto', px: 'max(15px, 1.6vh)', py: 3 }}
    >
      {children}
    </Stack>
  </Box>
);

export const Section = ({
  title,
  help,
  children,
}: {
  title: ReactNode;
  help?: ReactNode;
  children: ReactNode;
}) => (
  <Paper variant="outlined" sx={{ p: 2.5 }}>
    <Typography fontWeight={600} sx={{ mb: 1.5 }}>
      {title}
      {help && <HelpTip title={help} />}
    </Typography>
    {children}
  </Paper>
);

export const InfoRow = ({
  label,
  help,
  children,
}: {
  label: ReactNode;
  help?: ReactNode;
  children: ReactNode;
}) => (
  <Stack direction="row" spacing={2} alignItems="center" sx={{ py: 0.75 }}>
    <Typography
      variant="body2"
      color="text.secondary"
      sx={{ width: { xs: 130, sm: 210 }, flexShrink: 0 }}
    >
      {label}
      {help && <HelpTip title={help} />}
    </Typography>
    <Box sx={{ fontSize: 14, minWidth: 0 }}>{children}</Box>
  </Stack>
);
