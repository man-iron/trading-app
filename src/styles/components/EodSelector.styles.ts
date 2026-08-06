/**
 * JSS styles for `EodSelector` — compact terminal-styled MUI Select used in
 * REST report panel headers to switch between the current snapshot and an
 * end-of-day date.
 *
 * Consumed via `createUseStyles(styles)` in
 * `src/components/EodSelector/EodSelector.tsx`.
 */
import type { JssTheme } from '../theme';

const styles = (theme: JssTheme) => ({
  root: {
    minWidth: 180,
  },

  select: {
    fontFamily: theme.fonts.mono,
    fontSize: 12,
    color: theme.colors.text,
    backgroundColor: theme.colors.panelRaised,
    '& .MuiSelect-select': {
      padding: [4, theme.spacing.unit * 4, 4, theme.spacing.unit],
    },
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: theme.colors.border,
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: theme.colors.textSecondary,
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: theme.colors.accent,
    },
    '& .MuiSvgIcon-root': {
      color: theme.colors.textSecondary,
    },
  },

  menuItem: {
    fontFamily: theme.fonts.mono,
    fontSize: 12,
  },

  /** The "Current" option gets the accent treatment. */
  currentItem: {
    color: theme.colors.accent,
    fontWeight: 600,
  },
});

export default styles;
