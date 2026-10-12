import { useCallback, useEffect, useRef, useState } from 'react';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import {
  Alert,
  Box,
  List,
  ListItemButton,
  ListItemText,
  ListSubheader,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { api, invalidate, useFileContent } from '@/api/client';

import { Editor } from '@/components/Editor';
import { Error404 } from '@/components/Error404';
import { HelpTip } from '@/components/HelpTip';

import { useAppStore } from '@/store/useAppStore';

import { useTranslation } from '@/hooks/useTranslation';

export const Route = createFileRoute('/lists/{-$filename}')({
  component: RouteComponent,
});

const PERSONAL = ['user', 'exclude', 'ipset', 'ipset_exclude'] as const;
const FLOWSEAL = [
  'list-general',
  'list-google',
  'list-exclude',
  'ipset-exclude',
  'ipset-all',
] as const;

type ListName = (typeof PERSONAL)[number] | (typeof FLOWSEAL)[number];

const isPersonal = (name: string) =>
  (PERSONAL as readonly string[]).includes(name);
const isListName = (name: string): name is ListName =>
  isPersonal(name) || (FLOWSEAL as readonly string[]).includes(name);

const barSx = {
  px: 2,
  py: 1.25,
  borderBottom: '1px solid',
  borderColor: 'divider',
};

function RouteComponent() {
  const { filename } = Route.useParams();
  const name = (filename ?? 'user.list').replace(/\.list$/, '');

  if (!isListName(name)) {
    return <Error404 />;
  }
  return <ListPage key={name} name={name} />;
}

function ListPage({ name }: { name: ListName }) {
  const { t } = useTranslation();
  const file = `${name}.list`;
  const readonly = !isPersonal(name);
  const wide = useMediaQuery(useTheme().breakpoints.up('md'));

  const { data, isPending } = useFileContent(file);
  const { setNeedSave, setOnSave } = useAppStore();
  const content = useRef<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);

  const onSave = useCallback(async () => {
    if (
      readonly ||
      content.current === null ||
      !useAppStore.getState().needSave
    ) {
      return;
    }
    const res = await api('file_save', {
      name: file,
      content: content.current,
    }).catch(() => null);
    if (res?.status === 0) {
      setNeedSave(false);
      setSaved(true);
      void invalidate(['file', file]);
    } else {
      setFailed(true);
    }
  }, [file, readonly, setNeedSave]);

  const save = useCallback(() => void onSave(), [onSave]);

  useEffect(() => {
    setNeedSave(false);
    setOnSave(onSave);
    return () => {
      setNeedSave(false);
      setOnSave(async () => {});
    };
  }, [onSave, setNeedSave, setOnSave]);

  const lock = readonly && (
    <Tooltip title={t('lists.readonly')} enterTouchDelay={0}>
      <LockOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
    </Tooltip>
  );

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: wide ? 'row' : 'column',
      }}
    >
      {wide ? (
        <ListSidebar current={name} />
      ) : (
        <Stack direction="row" spacing={1} alignItems="center" sx={barSx}>
          <ListSelect current={name} />
          <HelpTip title={t(`lists.files.${name}.help`)} />
          {lock}
        </Stack>
      )}

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: 0,
        }}
      >
        {wide && (
          <Stack direction="row" spacing={1} alignItems="center" sx={barSx}>
            {lock}
            <Typography fontWeight={600}>
              {t(`lists.files.${name}.title`)}
            </Typography>
            <Typography variant="mono" color="text.secondary">
              {file}
            </Typography>
            <HelpTip title={t(`lists.files.${name}.help`)} />
            {readonly && (
              <Typography variant="body2" color="text.secondary">
                {t('lists.readonly_short')}
              </Typography>
            )}
          </Stack>
        )}

        <Box sx={{ flex: 1, position: 'relative', minHeight: 200 }}>
          {!isPending && (
            <Editor
              type="list"
              value={data?.content ?? ''}
              readonly={readonly}
              onChange={(value, changed) => {
                content.current = value;
                setNeedSave(changed);
              }}
              onSave={readonly ? undefined : save}
              sx={{ position: 'absolute', inset: 0 }}
            />
          )}
        </Box>
      </Box>

      <Snackbar
        open={saved}
        autoHideDuration={4000}
        onClose={() => setSaved(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="success"
          variant="filled"
          onClose={() => setSaved(false)}
        >
          {t('lists.saved')}
        </Alert>
      </Snackbar>
      <Snackbar
        open={failed}
        autoHideDuration={6000}
        onClose={() => setFailed(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={() => setFailed(false)}
        >
          {t('lists.save_error')}
        </Alert>
      </Snackbar>
    </Box>
  );
}

const useOpenList = () => {
  const navigate = useNavigate();
  return (name: string) => void navigate({ to: `/lists/${name}.list` });
};

function ListSelect({ current }: { current: ListName }) {
  const { t } = useTranslation();
  const open = useOpenList();

  const item = (n: ListName) => (
    <MenuItem key={n} value={n}>
      {t(`lists.files.${n}.title`)}
      <Typography variant="mono" color="text.secondary" sx={{ ml: 1 }}>
        {n}.list
      </Typography>
    </MenuItem>
  );

  return (
    <Select
      fullWidth
      size="small"
      value={current}
      onChange={(e) => open(e.target.value)}
      sx={{ minWidth: 0 }}
    >
      <ListSubheader>{t('lists.personal')}</ListSubheader>
      {PERSONAL.map(item)}
      <ListSubheader>{t('lists.flowseal')}</ListSubheader>
      {FLOWSEAL.map(item)}
    </Select>
  );
}

function ListSidebar({ current }: { current: ListName }) {
  const { t } = useTranslation();
  const open = useOpenList();

  const item = (n: ListName) => (
    <ListItemButton key={n} selected={n === current} onClick={() => open(n)}>
      <ListItemText
        primary={t(`lists.files.${n}.title`)}
        secondary={`${n}.list`}
        slotProps={{
          secondary: {
            sx: (theme) => ({ ...theme.typography.mono, fontSize: 12 }),
          },
        }}
      />
    </ListItemButton>
  );

  return (
    <Box
      sx={{
        width: 250,
        flexShrink: 0,
        borderRight: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        overflowY: 'auto',
      }}
    >
      <List dense disablePadding>
        <ListSubheader sx={{ lineHeight: '40px' }}>
          {t('lists.personal')}
          <HelpTip title={t('lists.personal_help')} />
        </ListSubheader>
        {PERSONAL.map(item)}
        <ListSubheader sx={{ lineHeight: '40px' }}>
          {t('lists.flowseal')}
          <HelpTip title={t('lists.readonly')} />
        </ListSubheader>
        {FLOWSEAL.map(item)}
      </List>
    </Box>
  );
}
