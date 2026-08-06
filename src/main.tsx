import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider as JssThemeProvider } from 'react-jss';

import store from './store';
import { muiTheme, jssTheme } from './styles/theme';
import App from './App';

/**
 * Entry point. Provider stack (outermost first):
 * Redux `Provider` -> MUI `ThemeProvider` (+ `CssBaseline` for the dark
 * terminal base styles) -> react-jss `ThemeProvider` -> `App`.
 *
 * No webfont imports on purpose — the theme's monospace stack
 * ('JetBrains Mono', 'Consolas', monospace) falls back to system fonts.
 */
const container = document.getElementById('root');

if (!container) {
  throw new Error('Root element "#root" not found — check index.html');
}

createRoot(container).render(
  <React.StrictMode>
    <Provider store={store}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        <JssThemeProvider theme={jssTheme}>
          <App />
        </JssThemeProvider>
      </MuiThemeProvider>
    </Provider>
  </React.StrictMode>
);
