import { useState, type FormEvent } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  TextField,
  Typography,
} from '@mui/material';

import { api, queryClient } from '@/api/client';

import { useTranslation } from '@/hooks/useTranslation';

export const LoginDialog = () => {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const login = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(false);
    const res = await api('login', { password }).catch(() => null);
    if (res?.status === 0) {
      void queryClient.invalidateQueries();
    } else {
      setError(true);
    }
  };

  return (
    <Dialog
      open={true}
      maxWidth="xs"
      fullWidth
      disableEscapeKeyDown
      slotProps={{
        paper: {
          component: 'form',
          // @ts-expect-error
          onSubmit: login,
        },
      }}
    >
      <DialogContent sx={{ pt: 4, pb: 0 }}>
        <TextField
          autoFocus
          type="password"
          label={t('auth.password')}
          fullWidth
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={{ mb: 2 }}
        />
        {error && (
          <Alert severity="error" variant="outlined" sx={{ mb: 2 }}>
            {t('auth.error')}
          </Alert>
        )}
        <Typography variant="body2" color="text.secondary">
          {t('auth.forgot')}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', py: 3 }}>
        <Button type="submit" variant="contained" sx={{ px: 7 }}>
          {t('auth.login')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
