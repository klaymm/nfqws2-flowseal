import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  ListSubheader,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import { createFileRoute } from '@tanstack/react-router';

import {
  api,
  invalidate,
  useStatus,
  useStrategies,
  type StrategyInfo,
} from '@/api/client';

import { DevicesSection } from '@/components/DevicesSection';
import { HelpTip } from '@/components/HelpTip';
import { OutputLogDialog } from '@/components/OutputLogDialog';
import { InfoRow, Page, Section } from '@/components/Page';

import { useTranslation } from '@/hooks/useTranslation';

export const Route = createFileRoute('/')({
  component: RouteComponent,
});

const badgeSx = { height: 20, fontSize: 11, fontWeight: 600 };

const groupOf = (title: string) =>
  (title.match(/\((.+)\)/)?.[1] ?? '').replace(/\s*ALT\d*$/, '') || 'general';

function groupStrategies(list: StrategyInfo[]) {
  const groups = new Map<string, StrategyInfo[]>();
  for (const s of list) {
    const g = groupOf(s.title);
    groups.set(g, [...(groups.get(g) ?? []), s]);
  }
  return [...groups.entries()];
}

function RouteComponent() {
  const { t, langcode } = useTranslation();
  const { data: status } = useStatus();
  const { data: index } = useStrategies();

  const [selected, setSelected] = useState('');
  const [output, setOutput] = useState<boolean | string>(false);

  if (!status || !index) {
    return null;
  }

  const current = status.strategy;
  const value = selected || current || index.default;
  const info = index.strategies.find((s) => s.id === value);

  const groupLabel = (group: string) =>
    group === 'general'
      ? t('strategy.groups.general')
      : group === 'EXP'
        ? t('strategy.groups.exp')
        : group;

  const apply = async () => {
    setOutput(true);
    const res = await api('strategy_set', { id: value }).catch(() => null);
    setOutput(
      res?.output?.join('\n') || res?.error || t('system.no_connection'),
    );
    setSelected('');
    void invalidate(['status'], ['log']);
  };

  return (
    <Page>
      <Section title={t('strategy.select')} help={t('strategy.help')}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <FormControl fullWidth size="small">
            <Select
              inputProps={{ 'aria-label': t('strategy.select') }}
              value={value}
              onChange={(e) => setSelected(e.target.value)}
              renderValue={(id) =>
                index.strategies.find((s) => s.id === id)?.title ?? id
              }
              MenuProps={{
                slotProps: { paper: { sx: { maxHeight: '60svh' } } },
              }}
            >
              {groupStrategies(index.strategies).flatMap(([group, items]) => [
                <ListSubheader key={`group-${group}`}>
                  {groupLabel(group)}
                </ListSubheader>,
                ...items.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={{ width: '100%' }}
                    >
                      <span>{s.title}</span>
                      {s.ts && (
                        <Chip
                          label={t('strategy.ts_badge')}
                          size="small"
                          variant="outlined"
                          sx={badgeSx}
                        />
                      )}
                      {s.approximate && (
                        <Chip
                          label={t('strategy.approx_badge')}
                          size="small"
                          variant="outlined"
                          sx={badgeSx}
                        />
                      )}
                      <Box flex={1} />
                      {s.id === current && (
                        <Chip
                          label={t('strategy.current')}
                          size="small"
                          color="primary"
                          sx={badgeSx}
                        />
                      )}
                      {s.id === index.default && (
                        <Typography variant="caption" color="text.secondary">
                          {t('strategy.default')}
                        </Typography>
                      )}
                    </Stack>
                  </MenuItem>
                )),
              ])}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            disabled={value === current || status.busy || output === true}
            onClick={() => void apply()}
            sx={{ flexShrink: 0, px: 4 }}
          >
            {t('strategy.apply')}
          </Button>
        </Stack>

        {info && (
          <Box sx={{ mt: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography fontWeight={600}>{info.title}</Typography>
              {info.id === current && (
                <Chip
                  label={t('strategy.current')}
                  size="small"
                  color="primary"
                  sx={badgeSx}
                />
              )}
              {info.id === index.default && (
                <Chip
                  label={t('strategy.default')}
                  size="small"
                  variant="outlined"
                  sx={badgeSx}
                />
              )}
            </Stack>
            <Box component="ul" sx={{ m: 0, mt: 1, pl: 2.5 }}>
              {info.description[langcode].map((line) => (
                <Typography component="li" variant="body2" key={line}>
                  {line}
                </Typography>
              ))}
            </Box>
            {info.ts && (
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mt: 1.5 }}
              >
                <Chip
                  label={t('strategy.ts_badge')}
                  size="small"
                  variant="outlined"
                  sx={badgeSx}
                />
                <Typography variant="body2" color="text.secondary">
                  {t('strategy.ts_short')}
                  <HelpTip title={t('strategy.ts_help')} />
                </Typography>
              </Stack>
            )}
            {info.approximate && (
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mt: 1 }}
              >
                <Chip
                  label={t('strategy.approx_badge')}
                  size="small"
                  variant="outlined"
                  sx={badgeSx}
                />
                <Typography variant="body2" color="text.secondary">
                  {t('strategy.approx_short')}
                  <HelpTip title={t('strategy.approx_help')} />
                </Typography>
              </Stack>
            )}
          </Box>
        )}

        {status.busy && (
          <Alert severity="warning" variant="outlined" sx={{ mt: 2 }}>
            {t('strategy.busy')}
          </Alert>
        )}
      </Section>

      <DevicesSection status={status} />

      <Section title={t('strategy.status')}>
        <InfoRow label={t('strategy.state')}>
          <Box
            component="span"
            sx={{ color: status.running ? 'success.main' : 'error.main' }}
          >
            {status.running ? t('strategy.running') : t('strategy.stopped')}
          </Box>
        </InfoRow>
        <InfoRow
          label={t('strategy.interface')}
          help={t('strategy.interface_help')}
        >
          {status.interface || '-'}
        </InfoRow>
        <InfoRow label={t('strategy.rules')} help={t('strategy.rules_help')}>
          {status.rules}
        </InfoRow>
      </Section>

      <OutputLogDialog
        content={output}
        open={Boolean(output)}
        onClose={() => setOutput(false)}
      />
    </Page>
  );
}
