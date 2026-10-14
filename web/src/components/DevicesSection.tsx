import { useState } from 'react';
import {
  Alert,
  Button,
  FormControl,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';

import { api, invalidate, usePolicies, type Status } from '@/api/client';

import { OutputLogDialog } from '@/components/OutputLogDialog';
import { Section } from '@/components/Page';

import { useTranslation } from '@/hooks/useTranslation';

type Mode = 'all' | 'only' | 'except';

export const DevicesSection = ({ status }: { status: Status }) => {
  const { t } = useTranslation();
  const { data } = usePolicies();
  const policies = data?.policies ?? [];

  const current: Mode = !status.policy
    ? 'all'
    : status.policy_exclude
      ? 'except'
      : 'only';
  const [mode, setMode] = useState<Mode | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [output, setOutput] = useState<boolean | string>(false);

  const m = mode ?? current;
  const n = name ?? (status.policy || policies[0] || '');
  const missing =
    Boolean(status.policy) && data && !policies.includes(status.policy);
  const changed = m !== current || (m !== 'all' && n !== status.policy);
  const canApply =
    changed &&
    (m === 'all' || policies.includes(n)) &&
    !status.busy &&
    output !== true;

  const apply = async () => {
    setOutput(true);
    const res = await api('policy_set', {
      mode: m,
      name: m === 'all' ? '' : n,
    }).catch(() => null);
    setOutput(
      res?.output?.join('\n') || res?.error || t('system.no_connection'),
    );
    setMode(null);
    setName(null);
    void invalidate(['status'], ['log'], ['policies']);
  };

  const notApplied =
    Boolean(status.policy) && status.running && !status.policy_applied;

  return (
    <Section title={t('devices.title')} help={t('devices.help')}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
        <FormControl size="small" sx={{ minWidth: 220, flexShrink: 0 }}>
          <Select
            inputProps={{ 'aria-label': t('devices.mode') }}
            value={m}
            onChange={(e) => setMode(e.target.value as Mode)}
          >
            <MenuItem value="all">{t('devices.all')}</MenuItem>
            <MenuItem value="only">{t('devices.only')}</MenuItem>
            <MenuItem value="except">{t('devices.except')}</MenuItem>
          </Select>
        </FormControl>

        <FormControl
          size="small"
          fullWidth
          disabled={m === 'all' || (policies.length === 0 && !missing)}
        >
          <Select
            inputProps={{ 'aria-label': t('devices.policy') }}
            value={m === 'all' ? '' : n}
            displayEmpty
            onChange={(e) => setName(e.target.value)}
            renderValue={(v) =>
              v || (
                <Typography component="span" color="text.secondary">
                  {t('devices.choose')}
                </Typography>
              )
            }
          >
            {policies.map((p) => (
              <MenuItem key={p} value={p}>
                {p}
              </MenuItem>
            ))}
            {missing && (
              <MenuItem value={status.policy} disabled>
                {`${status.policy} (${t('devices.missing')})`}
              </MenuItem>
            )}
          </Select>
        </FormControl>

        <Button
          variant="contained"
          disabled={!canApply}
          onClick={() => void apply()}
          sx={{ flexShrink: 0, px: 4 }}
        >
          {t('strategy.apply')}
        </Button>
      </Stack>

      {m !== 'all' && data && policies.length === 0 && (
        <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
          {t('devices.no_policies')}
        </Alert>
      )}

      {notApplied ? (
        <Alert severity="warning" variant="outlined" sx={{ mt: 2 }}>
          {t('devices.not_applied', { name: status.policy })}
        </Alert>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {current === 'all'
            ? t('devices.now_all')
            : t(
                current === 'only' ? 'devices.now_only' : 'devices.now_except',
                {
                  name: status.policy,
                },
              )}
        </Typography>
      )}

      <OutputLogDialog
        content={output}
        open={Boolean(output)}
        onClose={() => setOutput(false)}
      />
    </Section>
  );
};
