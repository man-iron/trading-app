/**
 * JSS styles for `ReportContainer` — panel chrome around a REST report:
 * header strip (report label, as-of stamp, EOD selector), loading bar,
 * error alert and the report table body.
 *
 * Consumed via `createUseStyles(styles)` in
 * `src/containers/ReportContainer/ReportContainer.tsx`.
 */
import type { JssTheme } from '../theme';

const styles = (theme: JssTheme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    height: '100%',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.unit,
    gap: theme.spacing.unit,
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.unit * 2,
    padding: [theme.spacing.unit / 2, theme.spacing.unit],
    backgroundColor: theme.colors.panel,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius,
  },

  title: {
    fontFamily: theme.fonts.ui,
    fontSize: 14,
    fontWeight: 600,
    color: theme.colors.text,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    margin: 0,
  },

  asOf: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: theme.colors.textSecondary,
    whiteSpace: 'nowrap',
  },

  /** Pushes the EOD selector to the right edge of the header. */
  spacer: {
    flex: 1,
  },

  /** Fixed-height slot so the layout doesn't jump when loading toggles. */
  progressSlot: {
    height: 4,
    flexShrink: 0,
  },

  errorAlert: {
    fontFamily: theme.fonts.mono,
    backgroundColor: theme.colors.panel,
    border: `1px solid ${theme.colors.down}`,
    color: theme.colors.text,
    '& .MuiAlert-icon': {
      color: theme.colors.down,
    },
  },

  body: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
  },
});

export default styles;
