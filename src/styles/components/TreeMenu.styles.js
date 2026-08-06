/**
 * JSS styles for the sidebar `TreeMenu` component (class-based, retro stack).
 *
 * Dark terminal look per the architecture contract:
 * - amber (#ffb000) selected row with an amber left rail,
 * - subtle hover on rows,
 * - depth-based indentation (theme.spacing.treeIndent per level),
 * - monospace labels,
 * - transport badges: pulsing green LIVE dot for `ws`, grey EOD chip for `rest`.
 *
 * Consumed via `withStyles(styles)(TreeMenu)` from `react-jss`; `theme` is the
 * `jssTheme` object from `src/styles/theme.ts`.
 *
 * @param {import('../theme').JssTheme} theme
 */
const styles = (theme) => ({
  '@keyframes livePulse': {
    '0%': { opacity: 1, boxShadow: `0 0 0 0 ${theme.colors.up}66` },
    '70%': { opacity: 0.55, boxShadow: '0 0 0 4px rgba(0, 200, 5, 0)' },
    '100%': { opacity: 1, boxShadow: '0 0 0 0 rgba(0, 200, 5, 0)' },
  },

  root: {
    padding: 0,
    margin: 0,
    width: '100%',
    backgroundColor: 'transparent',
  },

  /** Base row shared by group and report rows. */
  row: {
    display: 'flex',
    alignItems: 'center',
    minHeight: theme.spacing.rowHeight,
    padding: [0, theme.spacing.unit],
    borderLeft: '2px solid transparent',
    cursor: 'pointer',
    userSelect: 'none',
    color: theme.colors.text,
    fontFamily: theme.fonts.mono,
    fontSize: 12,
    lineHeight: 1.2,
    transition: 'background-color 120ms ease, border-color 120ms ease',
    '&:hover': {
      backgroundColor: theme.colors.panelRaised,
    },
  },

  /** Group rows: slightly muted, uppercase terminal section headers. */
  rowGroup: {
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    '&:hover': {
      color: theme.colors.text,
    },
  },

  /** Report (leaf) rows. */
  rowReport: {},

  /** Currently selected report row — amber accent per contract. */
  rowSelected: {
    color: theme.colors.accent,
    backgroundColor: 'rgba(255, 176, 0, 0.10)',
    borderLeftColor: theme.colors.accent,
    '&:hover': {
      backgroundColor: 'rgba(255, 176, 0, 0.16)',
    },
  },

  /** Depth indentation: level-1 rows. */
  depth0: {
    paddingLeft: theme.spacing.unit,
  },

  /** Depth indentation: level-2 rows. */
  depth1: {
    paddingLeft: theme.spacing.unit + theme.spacing.treeIndent,
  },

  /** Depth indentation: level-3 rows. */
  depth2: {
    paddingLeft: theme.spacing.unit + theme.spacing.treeIndent * 2,
  },

  /** Expand/collapse chevron on group rows. */
  toggleIcon: {
    fontSize: 16,
    marginRight: theme.spacing.unit / 2,
    color: theme.colors.textSecondary,
    flexShrink: 0,
  },

  /** Node label — monospace, ellipsized. */
  label: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontFamily: theme.fonts.mono,
  },

  /** Base transport badge chip. */
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    marginLeft: theme.spacing.unit,
    padding: [1, 6],
    borderRadius: theme.borderRadius,
    fontFamily: theme.fonts.mono,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.12em',
    lineHeight: '14px',
    textTransform: 'uppercase',
    flexShrink: 0,
  },

  /** LIVE (ws) badge — green text with a pulsing dot. */
  badgeLive: {
    color: theme.colors.up,
    border: `1px solid ${theme.colors.up}55`,
    backgroundColor: 'rgba(0, 200, 5, 0.08)',
  },

  /** Pulsing green connection dot inside the LIVE badge. */
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: theme.colors.up,
    animation: '$livePulse 1.4s ease-in-out infinite',
    flexShrink: 0,
  },

  /** EOD (rest) badge — muted grey chip. */
  badgeEod: {
    color: theme.colors.textSecondary,
    border: `1px solid ${theme.colors.border}`,
    backgroundColor: theme.colors.panelRaised,
  },
});

export default styles;
