import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  Paper,
} from '@mui/material';

import { api } from '@/api/client';

import { Editor } from '@/components/Editor';

import { useAppStore } from '@/store/useAppStore';

import { useTranslation } from '@/hooks/useTranslation';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const readLog = () => api<{ content: string; busy: boolean }>('log');

type Phase = 'running' | 'busy' | 'done' | 'failed';

export const UpdateDialog = () => {
  const { t } = useTranslation();
  const { updating, setUpdating } = useAppStore();
  const [log, setLog] = useState('');
  const [phase, setPhase] = useState<Phase>('running');

  useEffect(() => {
    if (!updating) {
      return;
    }
    let stopped = false;

    const run = async () => {
      setPhase('running');
      setLog('');
      const before = (await readLog().catch(() => null))?.content;
      const start = await api('update').catch(() => null);
      if (start?.status !== 0) {
        setPhase('busy');
        return;
      }
      const started = Date.now();
      while (!stopped && Date.now() - started < 10 * 60 * 1000) {
        await sleep(2000);
        const res = await readLog().catch(() => null);
        if (stopped || !res) {
          continue;
        }
        setLog(res.content);
        const fresh =
          res.content !== before || Date.now() - started > 20 * 1000;
        if (!res.busy && fresh) {
          setPhase(res.content.includes('Ошибка:') ? 'failed' : 'done');
          return;
        }
      }
      if (!stopped) {
        setPhase('failed');
      }
    };
    void run();

    return () => {
      stopped = true;
    };
  }, [updating]);

  return (
    <Dialog open={updating} maxWidth="md" fullWidth>
      <DialogTitle>{t('update.title')}</DialogTitle>
      <DialogContent>
        {phase !== 'busy' && (
          <Paper
            variant="outlined"
            sx={{ display: 'flex', minHeight: 240, maxHeight: '60svh', mb: 2 }}
          >
            <Editor type="log" value={log || t('update.running')} readonly />
          </Paper>
        )}
        <Box>
          {phase === 'running' && <LinearProgress />}
          {phase === 'busy' && (
            <Alert severity="warning" variant="outlined">
              {t('strategy.busy')}
            </Alert>
          )}
          {phase === 'failed' && (
            <Alert severity="error" variant="outlined">
              {t('update.failed')}
            </Alert>
          )}
          {phase === 'done' && (
            <Alert severity="success" variant="outlined">
              {t('update.done')}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center' }}>
        {phase === 'done' ? (
          <Button variant="contained" onClick={() => window.location.reload()}>
            {t('update.reload')}
          </Button>
        ) : (
          <Button
            disabled={phase === 'running'}
            onClick={() => setUpdating(false)}
          >
            {t('common.close')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
