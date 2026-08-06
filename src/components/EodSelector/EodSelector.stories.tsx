/**
 * Storybook stories for EodSelector: live ("Current") selection, a concrete
 * EOD date selection, and the no-dates edge case. `onChange` payloads are
 * logged via the Storybook actions addon.
 */
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { ThemeProvider as JssThemeProvider } from 'react-jss';

import { muiTheme, jssTheme } from '../../styles/theme';
import EodSelector from './EodSelector';

const eodDates = [
  '2026-08-05',
  '2026-08-04',
  '2026-08-03',
  '2026-07-31',
  '2026-07-30',
];

const meta: Meta<typeof EodSelector> = {
  title: 'Components/EodSelector',
  component: EodSelector,
  argTypes: {
    onChange: { action: 'changed' },
  },
  decorators: [
    (Story) => (
      <MuiThemeProvider theme={muiTheme}>
        <JssThemeProvider theme={jssTheme}>
          <div style={{ padding: 16 }}>
            <Story />
          </div>
        </JssThemeProvider>
      </MuiThemeProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof EodSelector>;

/** Live mode — the "Current" snapshot option is selected. */
export const CurrentSelected: Story = {
  args: {
    eodDates,
    mode: 'live',
    eodDate: null,
  },
};

/** EOD mode — a concrete business date is selected. */
export const EodDateSelected: Story = {
  args: {
    eodDates,
    mode: 'eod',
    eodDate: '2026-08-04',
  },
};

/** No EOD dates available — only "Current" is offered. */
export const NoDatesAvailable: Story = {
  args: {
    eodDates: [],
    mode: 'live',
    eodDate: null,
  },
};
