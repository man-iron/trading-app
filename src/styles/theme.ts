/**
 * Shared theming for the retro trading terminal.
 *
 * Exports two theme objects built from one token set:
 * - `muiTheme`  — MUI v5 theme (dark mode) consumed by `@mui/material`'s
 *   `ThemeProvider` for all MUI widgets.
 * - `jssTheme`  — plain token object consumed by `react-jss`'s `ThemeProvider`
 *   for the custom JSS style files in `src/styles/components/`.
 *
 * Palette (per architecture contract): near-black background `#0d1117`,
 * panel `#161b22`, up-green `#00c805`, down-red `#ff5000`, amber accent
 * `#ffb000`, monospace numerals for data cells.
 */
import { createTheme } from '@mui/material/styles';

/** Single source of truth for all color tokens. */
export const colors = {
  /** App background — near black. */
  background: '#0d1117',
  /** Panel / surface background. */
  panel: '#161b22',
  /** Slightly raised surface (hover rows, headers). */
  panelRaised: '#1c2129',
  /** Hairline borders between panels and table cells. */
  border: '#30363d',
  /** Price-up / positive change. */
  up: '#00c805',
  /** Price-down / negative change. */
  down: '#ff5000',
  /** Amber accent — selection, focus, highlights. */
  accent: '#ffb000',
  /** Primary text. */
  text: '#e6edf3',
  /** Secondary / muted text. */
  textSecondary: '#8b949e',
} as const;

/** Font stacks: monospace for data cells, system sans for chrome. */
export const fonts = {
  mono: "'JetBrains Mono', 'Consolas', monospace",
  ui: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
} as const;

/**
 * MUI v5 theme — dark trading-terminal look for all MUI widgets.
 */
export const muiTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: colors.background,
      paper: colors.panel,
    },
    primary: { main: colors.accent },
    secondary: { main: colors.up },
    success: { main: colors.up },
    error: { main: colors.down },
    warning: { main: colors.accent },
    text: {
      primary: colors.text,
      secondary: colors.textSecondary,
    },
    divider: colors.border,
  },
  typography: {
    fontFamily: fonts.ui,
    fontSize: 13,
    // Data-dense terminal: compact monospace-friendly defaults.
    body2: { fontFamily: fonts.mono, fontSize: 12 },
    caption: { fontFamily: fonts.mono, fontSize: 11 },
  },
  shape: { borderRadius: 4 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: colors.background,
          color: colors.text,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottomColor: colors.border,
          fontFamily: fonts.mono,
          fontSize: 12,
          padding: '4px 8px',
        },
        head: {
          backgroundColor: colors.panelRaised,
          color: colors.textSecondary,
          fontFamily: fonts.ui,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: colors.panel,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: colors.panelRaised,
          border: `1px solid ${colors.border}`,
          fontFamily: fonts.mono,
        },
      },
    },
  },
});

/**
 * Token shape consumed by react-jss style files via `createUseStyles` /
 * `withStyles` theme functions.
 */
export interface JssTheme {
  colors: typeof colors;
  fonts: typeof fonts;
  spacing: {
    /** Base spacing unit in px. */
    unit: number;
    /** Compact row height for data tables, px. */
    rowHeight: number;
    /** Sidebar tree indent per depth level, px. */
    treeIndent: number;
  };
  borderRadius: number;
  /** Duration of the live-cell flash animation, ms. */
  flashDurationMs: number;
}

/**
 * Plain theme object for react-jss `ThemeProvider` — same tokens as the MUI
 * theme so custom JSS styling and MUI widgets stay visually consistent.
 */
export const jssTheme: JssTheme = {
  colors,
  fonts,
  spacing: {
    unit: 8,
    rowHeight: 26,
    treeIndent: 16,
  },
  borderRadius: 4,
  flashDurationMs: 600,
};

export default muiTheme;
