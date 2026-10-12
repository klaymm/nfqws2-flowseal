import DarkModeIcon from '@mui/icons-material/DarkMode';
import GitHubIcon from '@mui/icons-material/GitHub';
import LightModeIcon from '@mui/icons-material/LightMode';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import { Box, IconButton, Link, Stack, useColorScheme } from '@mui/material';

import { api, invalidate, useStatus } from '@/api/client';

import { useAppStore } from '@/store/useAppStore';

import { REPO_URL } from '@/hooks/useLatestBuild';
import { useTranslation } from '@/hooks/useTranslation';

const iconButtonSx = {
  fontSize: 15,
  color: 'text.secondary',
  '&:hover': { color: 'primary.main' },
};

export const Footer = () => {
  const { auth } = useAppStore();
  const { data: status } = useStatus();
  const { t, langcode, setLanguage } = useTranslation();
  const { mode, systemMode, setMode } = useColorScheme();
  const dark = (mode === 'system' ? systemMode : mode) === 'dark';

  return (
    <Box
      sx={{
        display: 'flex',
        px: 'max(15px, 1.6vh)',
        py: 1,
        borderTop: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Link
        href={REPO_URL}
        target="_blank"
        underline="none"
        color="text.secondary"
        title={t('system.github')}
        sx={{
          display: 'inline-flex',
          gap: 0.85,
          alignItems: 'center',
          fontSize: 14,
          '&:hover': { color: 'primary.main' },
        }}
      >
        <GitHubIcon sx={{ fontSize: '1.2em' }} />
        klaymm/nfqws2-flowseal
      </Link>

      <Stack direction="row" spacing={1} alignItems="center">
        <IconButton
          size="small"
          title={t('system.change_lang')}
          sx={{ ...iconButtonSx, fontSize: 13 }}
          onClick={() => setLanguage(langcode === 'ru' ? 'en' : 'ru')}
        >
          {langcode === 'ru' ? 'EN' : 'RU'}
        </IconButton>

        <IconButton
          size="small"
          title={t('system.change_theme')}
          sx={iconButtonSx}
          onClick={() => setMode(dark ? 'light' : 'dark')}
        >
          {dark ? (
            <LightModeIcon sx={{ fontSize: '1.2em' }} />
          ) : (
            <DarkModeIcon sx={{ fontSize: '1.2em' }} />
          )}
        </IconButton>

        {auth && status?.password && (
          <IconButton
            size="small"
            title={t('auth.logout')}
            sx={iconButtonSx}
            onClick={async () => {
              await api('logout').catch(() => null);
              useAppStore.getState().setAuth(false);
              void invalidate(['status']);
            }}
          >
            <LogoutOutlinedIcon sx={{ fontSize: '1.2em' }} />
          </IconButton>
        )}
      </Stack>
    </Box>
  );
};
