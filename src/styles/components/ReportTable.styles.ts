/**
 * JSS styles for `ReportTable` — dense monospace data grid with a sticky
 * header, right-aligned numerics, signed pct coloring and an amber "flash"
 * animation on cells whose row was recently ticked.
 *
 * Consumed via `createUseStyles(styles)` in
 * `src/components/ReportTable/ReportTable.tsx`.
 */
import type { JssTheme } from '../theme';

const styles = (theme: JssTheme) => ({
  /** Amber fade played on cells of rows with a recent `_lastTick`. */
  '@keyframes tickFlash': {
    from: { backgroundColor: `${theme.colors.accent}55` },
    to: { backgroundColor: 'transparent' },
  },

  root: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    flex: 1,
    backgroundColor: theme.colors.panel,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius,
    overflow: 'hidden',
  },

  /** Scroll container — the sticky header sticks to this box. */
  scroller: {
    flex: 1,
    minHeight: 0,
    overflow: 'auto',
  },

  headerCell: {
    whiteSpace: 'nowrap',
    userSelect: 'none',
    // Keep MUI's stickyHeader above the flashing body cells.
    zIndex: 2,
  },

  /** Filter row lives directly under the (sticky) header labels. */
  filterCell: {
    position: 'sticky',
    top: theme.spacing.rowHeight + 4,
    zIndex: 2,
    backgroundColor: theme.colors.panelRaised,
    padding: [2, theme.spacing.unit / 2],
    borderBottom: `1px solid ${theme.colors.border}`,
  },

  filterInput: {
    width: '100%',
    '& input': {
      fontFamily: theme.fonts.mono,
      fontSize: 11,
      padding: [2, 4],
      color: theme.colors.text,
      '&::placeholder': {
        color: theme.colors.textSecondary,
        opacity: 0.6,
      },
    },
    '& .MuiInput-underline:before': {
      borderBottomColor: theme.colors.border,
    },
    '& .MuiInput-underline:after': {
      borderBottomColor: theme.colors.accent,
    },
  },

  row: {
    height: theme.spacing.rowHeight,
    '&:hover': {
      backgroundColor: theme.colors.panelRaised,
    },
  },

  cell: {
    fontFamily: theme.fonts.mono,
    fontSize: 12,
    lineHeight: 1.4,
    whiteSpace: 'nowrap',
    color: theme.colors.text,
    borderBottomColor: theme.colors.border,
  },

  /** Right-aligned numeric cells (number / price / pct / timestamp). */
  numericCell: {
    textAlign: 'right',
    fontVariantNumeric: 'tabular-nums',
  },

  /** Positive pct — terminal green. */
  pctUp: {
    color: theme.colors.up,
  },

  /** Negative pct — terminal red. */
  pctDown: {
    color: theme.colors.down,
  },

  /** Applied to cells of rows whose `_lastTick` is recent. */
  flashCell: {
    animation: `$tickFlash ${theme.flashDurationMs * 2}ms ease-out`,
  },

  emptyCell: {
    textAlign: 'center',
    padding: theme.spacing.unit * 3,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.mono,
    fontStyle: 'italic',
  },

  /** "x of y rows" footer line. */
  footer: {
    flexShrink: 0,
    padding: [theme.spacing.unit / 2, theme.spacing.unit],
    borderTop: `1px solid ${theme.colors.border}`,
    backgroundColor: theme.colors.panelRaised,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    textAlign: 'right',
  },
});

export default styles;
