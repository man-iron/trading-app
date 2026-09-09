/**
 * JSS styles for `StatusBar` — the bottom terminal status strip showing the
 * signed-in user, the selected report, and a live clock.
 *
 * Consumed via `withStyles(styles)(StatusBar)` from `react-jss`; `theme` is
 * the `jssTheme` object from `src/styles/theme.ts`.
 *
 * @param {import('../theme').JssTheme} theme
 */
const legacyStatusLayout = {
  root: {
    display: 'block',
    overflow: 'hidden',
    lineHeight: '28px',
  },
  section: {
    float: 'left',
    '&:last-child': {
      float: 'right',
    },
  },
};

const styles = (theme) => ({
  root: {
    display: 'flex',
    alignItems: 'center',
    ...legacyStatusLayout.root,
    height: 28,
    padding: [0, theme.spacing.unit + 2],
    backgroundColor: theme.colors.panelRaised,
    borderTop: `1px solid ${theme.colors.border}`,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    flexShrink: 0,
  },

  /** Generic section (left: user, middle: report, right: clock). */
  section: {
    marginRight: theme.spacing.unit * 3,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    ...legacyStatusLayout.section,
    '&:last-child': {
      ...legacyStatusLayout.section['&:last-child'],
      marginRight: 0,
    },
  },

  /** The user's display name — brighter than the rest of the bar. */
  userName: {
    color: theme.colors.text,
    fontWeight: 700,
  },

  /** Muted `//` separator between user fields. */
  separator: {
    color: theme.colors.border,
  },

  /** Dim field label prefixes such as `RPT`. */
  fieldLabel: {
    color: theme.colors.textSecondary,
    opacity: 0.75,
  },

  /** Selected report label — amber accent to match tree selection. */
  reportLabel: {
    color: theme.colors.accent,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  /** Placeholder when no report is selected / no user is signed in. */
  placeholder: {
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },

  /** The HH:MM:SS clock — bright green, terminal style. */
  clock: {
    color: theme.colors.up,
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '0.08em',
  },
});

export default styles;
