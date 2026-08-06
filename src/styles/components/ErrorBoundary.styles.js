/**
 * JSS styles for `ErrorBoundary` — the styled crash fallback panel.
 *
 * Full-height centered layout with a bordered "SYSTEM FAULT" panel in the
 * dark terminal palette: red accent for the fault title, monospace error
 * readout on a raised surface, thin `#30363d` hairlines.
 *
 * Exported as a theme function consumed by `withStyles(styles)` from
 * `react-jss`; tokens come from `jssTheme` in `src/styles/theme.ts`.
 *
 * @param {import('../theme').JssTheme} theme
 */
const styles = (theme) => ({
  root: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    minHeight: '100vh',
    boxSizing: 'border-box',
    padding: theme.spacing.unit * 3,
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    fontFamily: theme.fonts.ui,
  },
  panel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: theme.spacing.unit * 2,
    width: '100%',
    maxWidth: 560,
    boxSizing: 'border-box',
    padding: theme.spacing.unit * 4,
    backgroundColor: theme.colors.panel,
    border: `1px solid ${theme.colors.down}`,
    borderRadius: theme.borderRadius,
    textAlign: 'center',
  },
  glyph: {
    fontFamily: theme.fonts.mono,
    fontSize: 28,
    lineHeight: 1,
    color: theme.colors.down,
    userSelect: 'none',
  },
  title: {
    margin: 0,
    fontFamily: theme.fonts.mono,
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: theme.colors.down,
  },
  subtitle: {
    margin: 0,
    fontFamily: theme.fonts.mono,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  message: {
    margin: 0,
    width: '100%',
    boxSizing: 'border-box',
    padding: theme.spacing.unit * 1.5,
    fontFamily: theme.fonts.mono,
    fontSize: 12,
    textAlign: 'left',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    color: theme.colors.text,
    backgroundColor: theme.colors.panelRaised,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius,
  },
});

export default styles;
