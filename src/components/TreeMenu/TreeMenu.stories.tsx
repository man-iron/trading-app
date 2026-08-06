/**
 * Storybook stories for the class-based TreeMenu.
 *
 * Items are produced with the real `flattenMenuForRender` helper over the
 * shared menu fixture from `src/testUtils`, so the stories exercise the exact
 * flat-list shape the component receives in the app.
 */
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { ThemeProvider as JssThemeProvider } from 'react-jss';

import TreeMenu from './TreeMenu';
import { flattenMenuForRender } from '../../helpers/menuHelpers';
import { buildMenuFixture } from '../../testUtils/renderWithProviders';
import { muiTheme, jssTheme, colors } from '../../styles/theme';

const menu = buildMenuFixture();

const meta: Meta = {
  title: 'Components/TreeMenu',
  component: TreeMenu,
  argTypes: {
    onToggleGroup: { action: 'onToggleGroup' },
    onSelectReport: { action: 'onSelectReport' },
  },
  decorators: [
    (Story) => (
      <MuiThemeProvider theme={muiTheme}>
        <JssThemeProvider theme={jssTheme}>
          <div
            style={{
              width: 280,
              minHeight: 320,
              backgroundColor: colors.panel,
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

/** All groups collapsed — only the three level-1 asset classes. */
export const Collapsed: Story = {
  args: {
    items: flattenMenuForRender(menu, []),
    selectedReportId: null,
  },
};

/** Two levels open: Markets + Derivatives expanded, sub-groups closed. */
export const ExpandedTwoLevels: Story = {
  args: {
    items: flattenMenuForRender(menu, ['markets', 'derivatives']),
    selectedReportId: null,
  },
};

/** Three levels open with FX Spot selected (amber row + LIVE badge). */
export const ExpandedThreeLevelsWithSelection: Story = {
  args: {
    items: flattenMenuForRender(menu, [
      'markets',
      'markets-fx',
      'markets-rates',
      'derivatives',
      'derivatives-commodities',
      'equities',
    ]),
    selectedReportId: 'fx-spot',
  },
};
