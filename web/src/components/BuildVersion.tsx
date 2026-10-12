import { Chip, Tooltip } from '@mui/material';

import { useStatus } from '@/api/client';

import { isNewer, REPO_URL, useLatestBuild } from '@/hooks/useLatestBuild';
import { useTranslation } from '@/hooks/useTranslation';

export const BuildVersion = () => {
  const { t } = useTranslation();
  const { data: status } = useStatus();
  const { data: latest } = useLatestBuild();

  const build = status?.build;
  if (!build) {
    return null;
  }
  const outdated = Boolean(latest && isNewer(latest, build));

  return (
    <Tooltip
      title={
        outdated
          ? t('update.available', { version: latest ?? '' })
          : t('update.version')
      }
      enterTouchDelay={0}
    >
      <Chip
        label={build}
        size="small"
        variant="outlined"
        color={outdated ? 'warning' : 'primary'}
        onClick={() => window.open(REPO_URL, '_blank')}
        sx={{ cursor: 'pointer' }}
      />
    </Tooltip>
  );
};
