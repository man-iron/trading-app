import React, { useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider, useSelector } from 'react-redux';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider as JssThemeProvider } from 'react-jss';

import store from './store';
import { selectThemeMode } from './store/app/selectors';
import { getMuiTheme, getJssTheme, type ThemeMode } from './styles/theme';
import App from './App';
import { ROOT } from './constants/appConstants';

/**
 * Theme provider stack driven by the store's `app.themeMode`:
 * MUI `ThemeProvider` (+ `CssBaseline` for the terminal base styles) ->
 * react-jss `ThemeProvider`. Rebuilds both theme objects only when the mode
 * flips.
 */
function ThemedProviders({ children }: { children: React.ReactNode }): JSX.Element {
  const mode = useSelector(selectThemeMode) as ThemeMode;
  const muiTheme = useMemo(() => getMuiTheme(mode), [mode]);
  const jssTheme = useMemo(() => getJssTheme(mode), [mode]);
  return (
    <MuiThemeProvider theme={muiTheme}>
      <CssBaseline />
      <JssThemeProvider theme={jssTheme}>{children}</JssThemeProvider>
    </MuiThemeProvider>
  );
}

/**
 * Entry point. Provider stack (outermost first):
 * Redux `Provider` -> `ThemedProviders` (MUI + react-jss, theme mode from the
 * store) -> `App`.
 *
 * No webfont imports on purpose — the theme's monospace stack
 * ('JetBrains Mono', 'Consolas', monospace) falls back to system fonts.
 */
const container = document.getElementById(ROOT);

if (!container) {
  throw new Error('Root element "#root" not found — check index.html');
}

appRoot = createRoot(container);

appRoot.render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemedProviders>
        <App />
      </ThemedProviders>
    </Provider>
  </React.StrictMode>
);
