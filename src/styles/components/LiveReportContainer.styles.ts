/**
 * JSS styles for the `LiveReportContainer` (functional container, applied via
 * `createUseStyles` from react-jss). Dark trading-terminal panel: raised
 * header strip with report label, ticking as-of clock, and the LiveControls
 * cluster; table area fills the remaining space.
 */
import type { JssTheme } from '../theme';

const styles = (theme: JssTheme) => ({
  root: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    minHeight: 0,
    backgroundColor: theme.colors.panel,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.unit * 2,
    padding: `${theme.spacing.unit}px ${theme.spacing.unit * 1.5}px`,
    backgroundColor: theme.colors.panelRaised,
    borderBottom: `1px solid ${theme.colors.border}`,
    flexShrink: 0,
  },
  title: {
    color: theme.colors.text,
    fontFamily: theme.fonts.ui,
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: '0.02em',
    margin: 0,
    whiteSpace: 'nowrap' as const,
  },
  asOf: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap' as const,
  },
  spacer: {
    flex: 1,
  },
  body: {
    flex: 1,
    minHeight: 0,
    overflow: 'auto',
  },
  skeletonWrap: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: theme.spacing.unit,
    padding: theme.spacing.unit * 2,
  },
  alert: {
    margin: theme.spacing.unit,
    fontFamily: theme.fonts.mono,
  },
});

export default styles;
