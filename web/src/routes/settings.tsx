import { useState, type FormEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Link,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useColorScheme,
} from '@mui/material';
import { createFileRoute } from '@tanstack/react-router';

import { api, invalidate, useStatus } from '@/api/client';

import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { InfoRow, Page, Section } from '@/components/Page';

import { useAppStore } from '@/store/useAppStore';

import { isNewer, REPO_URL, useLatestBuild } from '@/hooks/useLatestBuild';
import { useTranslation } from '@/hooks/useTranslation';

export const Route = createFileRoute('/settings')({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Page>
      <AppearanceSection />
      <PasswordSection />
      <UpdatesSection />
      <AboutSection />
    </Page>
  );
}

function AppearanceSection() {
  const { t, langcode, setLanguage } = useTranslation();
  const { mode, setMode } = useColorScheme();

  return (
    <Section title={t('settings.appearance')}>
      <InfoRow label={t('settings.language')}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={langcode}
          onChange={(_, lang) => lang && setLanguage(lang)}
        >
          <ToggleButton value="ru">Русский</ToggleButton>
          <ToggleButton value="en">English</ToggleButton>
        </ToggleButtonGroup>
      </InfoRow>
      <InfoRow label={t('settings.theme')}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={mode ?? 'system'}
          onChange={(_, value) => value && setMode(value)}
        >
          <ToggleButton value="system">
            {t('settings.theme_system')}
          </ToggleButton>
          <ToggleButton value="light">{t('settings.theme_light')}</ToggleButton>
          <ToggleButton value="dark">{t('settings.theme_dark')}</ToggleButton>
        </ToggleButtonGroup>
      </InfoRow>
    </Section>
  );
}

function PasswordSection() {
  const { t } = useTranslation();
  const { data: status } = useStatus();
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [confirmOff, setConfirmOff] = useState(false);
  const [result, setResult] = useState<'saved' | 'disabled' | 'failed' | null>(
    null,
  );

  const mismatch = repeat !== '' && password !== repeat;

  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!password || password !== repeat) {
      return;
    }
    const res = await api('password_set', { password }).catch(() => null);
    if (res?.status === 0) {
      setPassword('');
      setRepeat('');
    }
    setResult(res?.status === 0 ? 'saved' : 'failed');
    void invalidate(['status']);
  };

  const disable = async () => {
    const res = await api('password_off').catch(() => null);
    setResult(res?.status === 0 ? 'disabled' : 'failed');
    void invalidate(['status']);
  };

  return (
    <Section title={t('settings.password')} help={t('settings.password_help')}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {status?.password
          ? t('settings.password_on')
          : t('settings.password_off')}
      </Typography>

      <Box component="form" onSubmit={(e) => void save(e)}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            type="password"
            size="small"
            label={t('settings.new_password')}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            helperText=" "
            fullWidth
          />
          <TextField
            type="password"
            size="small"
            label={t('settings.repeat_password')}
            autoComplete="new-password"
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
            error={mismatch}
            helperText={mismatch ? t('settings.password_mismatch') : ' '}
            fullWidth
          />
        </Stack>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <Button
            type="submit"
            variant="contained"
            disabled={!password || password !== repeat}
          >
            {t('settings.set_password')}
          </Button>
          {status?.password && (
            <Button color="error" onClick={() => setConfirmOff(true)}>
              {t('settings.disable_password')}
            </Button>
          )}
        </Stack>
      </Box>

      {result && (
        <Alert
          severity={result === 'failed' ? 'error' : 'success'}
          variant="outlined"
          sx={{ mt: 2 }}
          onClose={() => setResult(null)}
        >
          {result === 'saved'
            ? t('settings.password_saved')
            : result === 'disabled'
              ? t('settings.password_disabled')
              : t('system.no_connection')}
        </Alert>
      )}

      <ConfirmationDialog
        title={t('confirmation.password_off.title')}
        description={t('confirmation.password_off.description')}
        open={confirmOff}
        onClose={() => setConfirmOff(false)}
        onSubmit={() => void disable()}
      />
    </Section>
  );
}

function UpdatesSection() {
  const { t } = useTranslation();
  const { data: status } = useStatus();
  const { setUpdating } = useAppStore();
  const { data: latest, isFetching, isError, refetch } = useLatestBuild();
  const [switching, setSwitching] = useState(false);
  const [confirmUpdate, setConfirmUpdate] = useState(false);

  const enabled = Boolean(status?.autoupdate);
  const build = status?.build ?? '';
  const newer = Boolean(latest && build && isNewer(latest, build));

  const toggle = async (on: boolean) => {
    setSwitching(true);
    await api('autoupdate', { value: on ? 'on' : 'off' }).catch(() => null);
    await invalidate(['status']);
    setSwitching(false);
  };

  let checkText = '';
  if (isError || latest === '') {
    checkText = t('settings.check_failed');
  } else if (latest) {
    checkText = newer
      ? String(t('settings.latest', { version: latest }))
      : t('settings.up_to_date');
  }

  return (
    <Section title={t('settings.updates')} help={t('settings.updates_help')}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <FormControlLabel
          control={
            <Switch
              checked={enabled}
              disabled={switching || !status || status.busy}
              onChange={(e) => void toggle(e.target.checked)}
            />
          }
          label={
            enabled
              ? `${t('settings.autoupdate')} ${t('settings.autoupdate_at', { time: status?.autoupdate ?? '' })}`
              : t('settings.autoupdate')
          }
        />
        {switching && <CircularProgress size={18} />}
      </Stack>

      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
        sx={{ mt: 2 }}
      >
        <Button
          variant="outlined"
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          {t('settings.check')}
        </Button>
        {newer && (
          <Button
            variant="contained"
            disabled={status?.busy}
            onClick={() => setConfirmUpdate(true)}
          >
            {t('settings.update_now')}
          </Button>
        )}
        <Typography variant="body2" color="text.secondary">
          {checkText}
        </Typography>
      </Stack>

      <ConfirmationDialog
        title={t('confirmation.update.title')}
        description={t('confirmation.update.description')}
        open={confirmUpdate}
        onClose={() => setConfirmUpdate(false)}
        onSubmit={() => setUpdating(true)}
      />
    </Section>
  );
}

function AboutSection() {
  const { t } = useTranslation();
  const { data: status } = useStatus();

  return (
    <Section title={t('settings.about')}>
      <InfoRow label={t('settings.build')}>{status?.build || '-'}</InfoRow>
      <InfoRow label={t('settings.flowseal')}>
        {status?.flowseal || '-'}
      </InfoRow>
      <InfoRow label={t('settings.engine')}>
        {status?.engine || '-'}
        {status?.held && (
          <Typography component="span" variant="body2" color="text.secondary">
            {`, ${t('settings.engine_held')}`}
          </Typography>
        )}
      </InfoRow>
      <Link
        href={REPO_URL}
        target="_blank"
        rel="noopener"
        underline="hover"
        sx={{ display: 'inline-block', mt: 1.5, fontSize: 14 }}
      >
        github.com/klaymm/nfqws2-flowseal
      </Link>
    </Section>
  );
}
