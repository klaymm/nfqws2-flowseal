import type { ReactNode } from 'react';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Box, Tooltip } from '@mui/material';

export const HelpTip = ({ title }: { title: ReactNode }) => (
  <Tooltip
    title={<Box sx={{ fontSize: 13, lineHeight: 1.45 }}>{title}</Box>}
    arrow
    enterTouchDelay={0}
    leaveTouchDelay={10000}
    slotProps={{ tooltip: { sx: { maxWidth: 360 } } }}
  >
    <HelpOutlineIcon
      tabIndex={0}
      sx={{
        fontSize: 17,
        ml: 0.6,
        verticalAlign: 'middle',
        color: 'text.secondary',
        cursor: 'help',
        '&:hover, &:focus': { color: 'primary.main', outline: 'none' },
      }}
    />
  </Tooltip>
);
