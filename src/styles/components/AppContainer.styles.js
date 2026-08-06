/**
 * JSS styles for `AppContainer` — the full-viewport terminal chrome.
 *
 * Layout: header strip (app title + user chip) on top, a body row with the
 * 300px sidebar panel on the left and the main report area filling the rest,
 * and the `StatusBar` pinned to the bottom. Thin `#30363d` hairline borders
 * separate every region (dark trading-terminal aesthetic).
 *
 * Exported as a theme function consumed by `withStyles(styles)` from
 * `react-jss`; tokens come from `jssTheme` in `src/styles/theme.ts`.
 *
 * @param {import('../theme').JssTheme} theme
 */
const styles = (theme) => ({
  '@keyframes cursorBlink': {
    '0%': { opacity: 1 },
    '49%': { opacity: 1 },
    '50%': { opacity: 0 },
    '100%': { opacity: 0 },
  },

  /* ------------------------------------------------------------------ */
  /* Shell                                                               */
  /* ------------------------------------------------------------------ */
  root: {
    display: 'flex',
    flexDirection: 'column',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    fontFamily: theme.fonts.ui,
  },

  /* ------------------------------------------------------------------ */
  /* Header strip                                                        */
  /* ------------------------------------------------------------------ */
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
    height: 44,
    padding: [0, theme.spacing.unit * 2],
    backgroundColor: theme.colors.panel,
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  title: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.unit,
    margin: 0,
    fontFamily: theme.fonts.mono,
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: theme.colors.accent,
    userSelect: 'none',
  },
  titleCursor: {
    display: 'inline-block',
    width: 8,
    height: 16,
    backgroundColor: theme.colors.up,
    animation: '$cursorBlink 1.2s step-end infinite',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.unit * 1.5,
  },
  userDesk: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: theme.colors.textSecondary,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  userChip: {
    fontFamily: theme.fonts.mono,
    borderColor: theme.colors.border,
    color: theme.colors.text,
  },

  /* ------------------------------------------------------------------ */
  /* Body: sidebar + main report area                                    */
  /* ------------------------------------------------------------------ */
  body: {
    display: 'flex',
    flex: 1,
    minHeight: 0, // allow children to scroll instead of overflowing the shell
  },
  sidebar: {
    width: 300,
    flexShrink: 0,
    minHeight: 0,
    overflowY: 'auto',
    backgroundColor: theme.colors.panel,
    borderRight: `1px solid ${theme.colors.border}`,
  },
  main: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    overflow: 'auto',
    backgroundColor: theme.colors.background,
  },

  /* ------------------------------------------------------------------ */
  /* Welcome / empty state (no report selected)                          */
  /* ------------------------------------------------------------------ */
  welcome: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.unit * 1.5,
    flex: 1,
    margin: theme.spacing.unit * 3,
    padding: theme.spacing.unit * 4,
    border: `1px dashed ${theme.colors.border}`,
    borderRadius: theme.borderRadius,
    textAlign: 'center',
  },
  welcomeGlyph: {
    fontFamily: theme.fonts.mono,
    fontSize: 28,
    color: theme.colors.up,
    userSelect: 'none',
  },
  welcomeTitle: {
    margin: 0,
    fontFamily: theme.fonts.mono,
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: theme.colors.text,
  },
  welcomeHint: {
    margin: 0,
    fontFamily: theme.fonts.mono,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },

  /* ------------------------------------------------------------------ */
  /* Init error panel                                                    */
  /* ------------------------------------------------------------------ */
  errorPanel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: theme.spacing.unit * 2,
    alignSelf: 'center',
    margin: 'auto',
    padding: theme.spacing.unit * 4,
    maxWidth: 520,
    backgroundColor: theme.colors.panel,
    border: `1px solid ${theme.colors.down}`,
    borderRadius: theme.borderRadius,
    textAlign: 'center',
  },
  errorTitle: {
    margin: 0,
    fontFamily: theme.fonts.mono,
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: theme.colors.down,
  },
  errorMessage: {
    margin: 0,
    padding: theme.spacing.unit * 1.5,
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: theme.fonts.mono,
    fontSize: 12,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    color: theme.colors.text,
    backgroundColor: theme.colors.panelRaised,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius,
  },

  /* ------------------------------------------------------------------ */
  /* Loading skeleton layout                                             */
  /* ------------------------------------------------------------------ */
  skeletonHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
    height: 44,
    padding: [0, theme.spacing.unit * 2],
    backgroundColor: theme.colors.panel,
    borderBottom: `1px solid ${theme.colors.border}`,
  },
  skeletonSidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.unit,
    width: 300,
    flexShrink: 0,
    padding: theme.spacing.unit * 2,
    backgroundColor: theme.colors.panel,
    borderRight: `1px solid ${theme.colors.border}`,
  },
  skeletonMain: {
    flex: 1,
    minWidth: 0,
    padding: theme.spacing.unit * 3,
  },
});

export default styles;
