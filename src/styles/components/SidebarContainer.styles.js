/**
 * JSS styles for `SidebarContainer` — the left navigation panel that hosts the
 * TreeMenu. Dark terminal look: panel surface, hairline right border, amber
 * uppercase header with a blinking block cursor.
 *
 * Consumed via `withStyles(styles)(SidebarContainer)` from `react-jss`;
 * `theme` is the `jssTheme` object from `src/styles/theme.ts`.
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

  root: {
    display: 'flex',
    flexDirection: 'column',
    width: 280,
    minWidth: 220,
    height: '100%',
    backgroundColor: theme.colors.panel,
    borderRight: `1px solid ${theme.colors.border}`,
    overflow: 'hidden',
  },

  /** Panel header — amber, uppercase, terminal-prompt styling. */
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.unit / 2,
    padding: [theme.spacing.unit, theme.spacing.unit + 2],
    borderBottom: `1px solid ${theme.colors.border}`,
    backgroundColor: theme.colors.panelRaised,
    color: theme.colors.accent,
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },

  /** Leading `>` prompt glyph in the header. */
  prompt: {
    color: theme.colors.textSecondary,
  },

  /** Blinking block cursor after the header title. */
  cursor: {
    display: 'inline-block',
    position: 'absolute',
    width: 7,
    height: 13,
    marginLeft: 2,
    backgroundColor: theme.colors.accent,
    animation: '$cursorBlink 1.1s step-end infinite',
  },

  /** Scrollable region hosting the tree. */
  scrollArea: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: [theme.spacing.unit / 2, 0],
  },
});

export default styles;
