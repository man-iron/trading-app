/**
 * Shared theming for the retro trading terminal.
 *
 * Two color-token sets (dark and light) feed two theme factories:
 * - `getMuiTheme(mode)` — MUI v5 theme consumed by `@mui/material`'s
 *   `ThemeProvider` for all MUI widgets.
 * - `getJssTheme(mode)` — plain token object consumed by `react-jss`'s
 *   `ThemeProvider` for the custom JSS style files in
 *   `src/styles/components/`.
 *
 * Dark palette (per architecture contract): near-black background `#0d1117`,
 * panel `#161b22`, up-green `#00c805`, down-red `#ff5000`, amber accent
 * `#ffb000`, monospace numerals for data cells. The light palette mirrors the
 * same token shape with paper-terminal equivalents.
 *
 * The legacy `colors`, `muiTheme` and `jssTheme` exports remain the dark
 * variants so existing imports (tests, stories) keep working.
 */
import { createTheme, type Theme } from '@mui/material/styles';

/** The two supported UI themes. */
export type ThemeMode = 'dark' | 'light';

/** Dark color tokens — the original terminal palette. */
export const darkColors = {
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

/** Light color tokens — same shape, paper-terminal equivalents. */
export const lightColors = {
  background: '#f6f8fa',
  panel: '#ffffff',
  panelRaised: '#eaeef2',
  border: '#d0d7de',
  up: '#0f7b0f',
  down: '#cf3c00',
  accent: '#9a6700',
  text: '#1f2328',
  textSecondary: '#57606a',
} as const;

/** Color token shape shared by both modes. */
export type ThemeColors = typeof darkColors | typeof lightColors;

/** Color tokens for a given mode. */
export function getColors(mode: ThemeMode): ThemeColors {
  return mode === 'light' ? lightColors : darkColors;
}

/**
 * Dark color tokens under the historical name.
 * @deprecated Prefer `getColors(mode)`; kept for existing imports.
 */
export const colors = darkColors;

/** Font stacks: monospace for data cells, system sans for chrome. */
export const fonts = {
  mono: "'JetBrains Mono', 'Consolas', monospace",
  ui: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
} as const;

/**
 * Build the MUI v5 theme for a mode — trading-terminal look for all MUI
 * widgets in both dark and light variants.
 */
export function getMuiTheme(mode: ThemeMode): Theme {
  const c = getColors(mode);
  return createTheme({
    palette: {
      mode,
      background: {
        default: c.background,
        paper: c.panel,
      },
      primary: { main: c.accent },
      secondary: { main: c.up },
      success: { main: c.up },
      error: { main: c.down },
      warning: { main: c.accent },
      text: {
        primary: c.text,
        secondary: c.textSecondary,
      },
      divider: c.border,
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
            backgroundColor: c.background,
            color: c.text,
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottomColor: c.border,
            fontFamily: fonts.mono,
            fontSize: 12,
            padding: '4px 8px',
          },
          head: {
            backgroundColor: c.panelRaised,
            color: c.textSecondary,
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
            backgroundColor: c.panel,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: c.panelRaised,
            border: `1px solid ${c.border}`,
            fontFamily: fonts.mono,
          },
        },
      },
    },
  });
}

/**
 * MUI v5 theme — dark variant, kept for existing imports (tests, stories).
 */
export const muiTheme = getMuiTheme('dark');

/**
 * Token shape consumed by react-jss style files via `createUseStyles` /
 * `withStyles` theme functions.
 */
export interface JssTheme {
  colors: ThemeColors;
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
 * Build the plain theme object for react-jss `ThemeProvider` — same tokens as
 * the MUI theme so custom JSS styling and MUI widgets stay visually
 * consistent.
 */
export function getJssTheme(mode: ThemeMode): JssTheme {
  return {
    colors: getColors(mode),
    fonts,
    spacing: {
      unit: 8,
      rowHeight: 26,
      treeIndent: 16,
    },
    borderRadius: 4,
    flashDurationMs: 600,
  };
}

/**
 * Plain JSS theme object — dark variant, kept for existing imports.
 */
export const jssTheme: JssTheme = getJssTheme('dark');

export default muiTheme;
