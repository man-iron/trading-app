/**
 * JSS styles for the `LiveControls` component (class component, applied via
 * `withStyles` from react-jss).
 *
 * Connection dot colors per contract:
 * - open       -> green, pulsing
 * - connecting -> amber
 * - closed     -> red
 * - error      -> red
 * - idle       -> muted gray
 *
 * @param {import('../theme').JssTheme} theme shared JSS theme tokens
 */
const styles = (theme) => ({
  '@keyframes livePulse': {
    '0%': {
      boxShadow: `0 0 0 0 ${theme.colors.up}66`,
      opacity: 1,
    },
    '70%': {
      boxShadow: `0 0 0 6px ${theme.colors.up}00`,
      opacity: 0.75,
    },
    '100%': {
      boxShadow: `0 0 0 0 ${theme.colors.up}00`,
      opacity: 1,
    },
  },
  root: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.unit,
    padding: [0, theme.spacing.unit / 2],
    fontFamily: theme.fonts.ui,
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.unit / 2,
    minWidth: 110,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
    transition: 'background-color 200ms ease',
  },
  dotIdle: {
    backgroundColor: theme.colors.textSecondary,
  },
  dotConnecting: {
    backgroundColor: theme.colors.accent,
  },
  dotOpen: {
    backgroundColor: theme.colors.up,
    animation: '$livePulse 1.6s ease-in-out infinite',
  },
  dotClosed: {
    backgroundColor: theme.colors.down,
  },
  dotError: {
    backgroundColor: theme.colors.down,
  },
  statusLabel: {
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    whiteSpace: 'nowrap',
  },
  chip: {
    fontFamily: theme.fonts.mono,
    fontWeight: 700,
    letterSpacing: '0.08em',
  },
  chipLive: {
    color: theme.colors.up,
    border: `1px solid ${theme.colors.up}`,
    backgroundColor: `${theme.colors.up}14`,
  },
  chipPaused: {
    color: theme.colors.accent,
    border: `1px solid ${theme.colors.accent}`,
    backgroundColor: `${theme.colors.accent}14`,
  },
  toggleButton: {
    color: theme.colors.text,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius,
    padding: theme.spacing.unit / 2,
    '&:hover': {
      borderColor: theme.colors.accent,
      color: theme.colors.accent,
      backgroundColor: `${theme.colors.accent}14`,
    },
  },
});

export default styles;
