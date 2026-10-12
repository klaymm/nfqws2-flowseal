import { useState } from 'react';
import BrowserUpdatedIcon from '@mui/icons-material/BrowserUpdated';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import MenuIcon from '@mui/icons-material/Menu';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ReplayIcon from '@mui/icons-material/Replay';
import SaveIcon from '@mui/icons-material/Save';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import {
  Box,
  Button,
  IconButton,
  Link,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Link as RouterLink, useRouterState } from '@tanstack/react-router';

import { api, invalidate, useStatus } from '@/api/client';

import { BuildVersion } from '@/components/BuildVersion';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { OutputLogDialog } from '@/components/OutputLogDialog';

import { useAppStore } from '@/store/useAppStore';

import { useTranslation } from '@/hooks/useTranslation';

export const Header = () => {
  const { t } = useTranslation();
  const { data: status } = useStatus();
  const { auth, needSave, onSave, setUpdating } = useAppStore();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const narrow = useMediaQuery(useTheme().breakpoints.down('sm'));

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [output, setOutput] = useState<boolean | string>(false);
  const [confirmUpdate, setConfirmUpdate] = useState(false);

  const running = Boolean(status?.running);

  const service = async (action: 'restart' | 'stop' | 'start') => {
    setAnchorEl(null);
    setOutput(true);
    const res = await api('service', { action }).catch(() => null);
    setOutput([`> ${action}`, ...(res?.output ?? [])].join('\n'));
    void invalidate(['status']);
  };

  return (
    <>
      <Box
        sx={{
          px: 'max(15px, 1.6vh)',
          py: 'max(13px, 1.4vh)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          whiteSpace: 'nowrap',
        }}
      >
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          rowGap={1.5}
          columnGap={1.5}
        >
          <Stack direction="row" spacing={1.3} alignItems="center">
            <Link
              component={RouterLink}
              to="/"
              underline="none"
              sx={{ display: 'inline-flex', gap: 1, alignItems: 'center' }}
            >
              <Typography
                component="h1"
                fontWeight={700}
                fontSize="1.15em"
                letterSpacing="0.02em"
                color="text.primary"
              >
                nfqws2
                <Box component="span" color="primary.main">
                  -flowseal
                </Box>
              </Typography>
            </Link>

            {auth && status && (
              <Tooltip
                title={running ? t('system.running') : t('system.stopped')}
                enterTouchDelay={0}
              >
                {running ? (
                  <CloudDoneIcon sx={{ color: 'success.main' }} />
                ) : (
                  <CloudOffIcon sx={{ color: 'error.main' }} />
                )}
              </Tooltip>
            )}

            {auth && <BuildVersion />}
          </Stack>

          {auth && (
            <Stack direction="row" spacing={1.5} alignItems="center">
              {pathname.startsWith('/lists') &&
                (narrow ? (
                  <IconButton
                    color="primary"
                    title={t('common.save')}
                    disabled={!needSave}
                    onClick={() => void onSave()}
                  >
                    <SaveIcon />
                  </IconButton>
                ) : (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<SaveIcon />}
                    disabled={!needSave}
                    onClick={() => void onSave()}
                  >
                    {t('common.save')}
                  </Button>
                ))}

              <Button
                variant="text"
                size="small"
                onClick={(e) => setAnchorEl(e.currentTarget)}
                sx={{ color: 'text.secondary', minWidth: 0 }}
              >
                <MenuIcon />
              </Button>

              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                {running && (
                  <MenuItem onClick={() => void service('restart')}>
                    <ListItemIcon>
                      <ReplayIcon />
                    </ListItemIcon>
                    {t('common.restart')}
                  </MenuItem>
                )}
                {running ? (
                  <MenuItem onClick={() => void service('stop')}>
                    <ListItemIcon>
                      <StopCircleIcon />
                    </ListItemIcon>
                    {t('common.stop')}
                  </MenuItem>
                ) : (
                  <MenuItem onClick={() => void service('start')}>
                    <ListItemIcon>
                      <PlayArrowIcon />
                    </ListItemIcon>
                    {t('common.start')}
                  </MenuItem>
                )}
                <MenuItem
                  onClick={() => {
                    setAnchorEl(null);
                    setConfirmUpdate(true);
                  }}
                >
                  <ListItemIcon>
                    <BrowserUpdatedIcon />
                  </ListItemIcon>
                  {t('common.update')}
                </MenuItem>
              </Menu>
            </Stack>
          )}
        </Box>
      </Box>

      <OutputLogDialog
        content={output}
        open={Boolean(output)}
        onClose={() => setOutput(false)}
      />

      <ConfirmationDialog
        title={t('confirmation.update.title')}
        description={t('confirmation.update.description')}
        open={confirmUpdate}
        onClose={() => setConfirmUpdate(false)}
        onSubmit={() => setUpdating(true)}
      />
    </>
  );
};
