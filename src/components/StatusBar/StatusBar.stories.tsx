/**
 * Storybook stories for the class-based StatusBar.
 *
 * The selected-report label is derived from the shared menu fixture in
 * `src/testUtils` (via the real `findNodeById` helper); the user object is a
 * contract-shaped `UserData` fixture.
 */
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { ThemeProvider as JssThemeProvider } from 'react-jss';

import StatusBar from './StatusBar';
import { findNodeById } from '../../helpers/menuHelpers';
import { buildMenuFixture } from '../../testUtils/renderWithProviders';
import { muiTheme, jssTheme, colors } from '../../styles/theme';
import type { UserData } from '../../types';

const userFixture: UserData = {
  id: 'u1',
  name: 'Ada Trader',
  role: 'Senior Trader',
  email: 'ada@example.com',
  desk: 'FX Desk',
  preferences: { theme: 'dark', defaultReportId: 'fx-spot' },
};

const fxSpotLabel = findNodeById(buildMenuFixture(), 'fx-spot')?.label ?? 'FX Spot';

const meta: Meta = {
  title: 'Components/StatusBar',
  component: StatusBar,
  decorators: [
    (Story) => (
      <MuiThemeProvider theme={muiTheme}>
        <JssThemeProvider theme={jssTheme}>
          <div
            style={{
              width: 720,
              backgroundColor: colors.background,
              border: `1px solid ${colors.border}`,
            }}
          >
            <Story />
          </div>
        </JssThemeProvider>
      </MuiThemeProvider>
    ),
  ],
};

export default meta;

type Story = StoryObj;

/** Signed-in user with a selected report — the common app state. */
export const SignedInWithReport: Story = {
  args: {
    user: userFixture,
    selectedReportLabel: fxSpotLabel,
  },
};

/** Signed-in user, nothing selected yet. */
export const SignedInNoReport: Story = {
  args: {
    user: userFixture,
    selectedReportLabel: null,
  },
};

/** Cold start: no user, no report — placeholders everywhere. */
export const SignedOut: Story = {
  args: {
    user: null,
    selectedReportLabel: null,
  },
};
