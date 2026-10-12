import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import RouteIcon from '@mui/icons-material/Route';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { Box, Tab, Tabs, useMediaQuery, useTheme } from '@mui/material';
import { useNavigate, useRouterState } from '@tanstack/react-router';

import { useTranslation } from '@/hooks/useTranslation';

const TABS = [
  { path: '/', key: 'strategy', icon: <RouteIcon fontSize="small" /> },
  {
    path: '/lists',
    key: 'lists',
    icon: <DescriptionOutlinedIcon fontSize="small" />,
  },
  { path: '/log', key: 'log', icon: <ArticleOutlinedIcon fontSize="small" /> },
  {
    path: '/settings',
    key: 'settings',
    icon: <SettingsOutlinedIcon fontSize="small" />,
  },
] as const;

export const MainTabs = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const narrow = useMediaQuery(useTheme().breakpoints.down('sm'));

  const current =
    TABS.find((tab) => tab.path !== '/' && pathname.startsWith(tab.path))
      ?.path ?? (pathname === '/' ? '/' : false);

  return (
    <Box sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
      <Tabs
        value={current}
        onChange={(_, path: string) => void navigate({ to: path })}
        variant={narrow ? 'fullWidth' : 'scrollable'}
        scrollButtons={narrow ? false : 'auto'}
        sx={{ minHeight: 50 }}
      >
        {TABS.map((tab) => (
          <Tab
            key={tab.path}
            value={tab.path}
            icon={tab.icon}
            iconPosition={narrow ? 'top' : 'start'}
            label={t(`tabs.${tab.key}`)}
            sx={{
              minHeight: narrow ? 58 : 50,
              minWidth: 0,
              px: narrow ? 0.5 : 2,
              fontSize: narrow ? 12 : 14,
              '& .MuiTab-iconWrapper': narrow ? { mb: 0.25 } : {},
              '&.Mui-selected': { color: 'text.primary' },
              '&:hover': { color: 'text.primary' },
            }}
          />
        ))}
      </Tabs>
    </Box>
  );
};
