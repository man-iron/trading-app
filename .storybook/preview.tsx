import React from 'react';
import type { Decorator, Preview } from '@storybook/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider as JssThemeProvider } from 'react-jss';

import rootReducer, { type RootState } from '../src/store/rootReducer';
import { muiTheme, jssTheme, colors } from '../src/styles/theme';

/**
 * Global decorator replicating the app's provider stack from `main.tsx`:
 * Redux `Provider` -> MUI `ThemeProvider` (+ CssBaseline) -> react-jss
 * `ThemeProvider`.
 *
 * Every story gets a FRESH store built from the real `rootReducer`. A story
 * can start from a known state via `parameters.preloadedState`:
 *
 * ```ts
 * export const Ready: Story = {
 *   parameters: { preloadedState: { app: { ... } } },
 * };
 * ```
 */
const withProviders: Decorator = (Story, context) => {
  const preloadedState = context.parameters.preloadedState as
    | Partial<RootState>
    | undefined;

  const store = configureStore({
    reducer: rootReducer,
    preloadedState: preloadedState as RootState | undefined,
  });

  return (
    <Provider store={store}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        <JssThemeProvider theme={jssTheme}>
          <Story />
        </JssThemeProvider>
      </MuiThemeProvider>
    </Provider>
  );
};

const preview: Preview = {
  decorators: [withProviders],
  parameters: {
    backgrounds: {
      default: 'terminal',
      values: [
        { name: 'terminal', value: colors.background },
        { name: 'panel', value: colors.panel },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: 'fullscreen',
  },
};

export default preview;
