/**
 * Storybook stories for `LiveControls`: playing/paused plus every
 * connection status (idle, connecting, open, closed, error).
 */
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { ThemeProvider as JssThemeProvider } from 'react-jss';

import LiveControls from './LiveControls';
import { muiTheme, jssTheme, colors } from '../../styles/theme';

interface LiveControlsStoryProps {
  paused: boolean;
  connectionStatus: 'idle' | 'connecting' | 'open' | 'closed' | 'error';
  onTogglePause: () => void;
}

// The class component is JS; type the story surface explicitly.
const TypedLiveControls = LiveControls as unknown as React.ComponentType<LiveControlsStoryProps>;

const meta: Meta<LiveControlsStoryProps> = {
  title: 'Components/LiveControls',
  component: TypedLiveControls,
  decorators: [
    (Story) => (
      <MuiThemeProvider theme={muiTheme}>
        <JssThemeProvider theme={jssTheme}>
          <div
            style={{
              background: colors.panelRaised,
              padding: 16,
              display: 'inline-block',
              borderRadius: 4,
            }}
          >
            <Story />
          </div>
        </JssThemeProvider>
      </MuiThemeProvider>
    ),
  ],
  argTypes: {
    onTogglePause: { action: 'toggle-pause' },
    connectionStatus: {
      control: 'select',
      options: ['idle', 'connecting', 'open', 'closed', 'error'],
    },
  },
  args: {
    paused: false,
    connectionStatus: 'open',
  },
};

export default meta;
type Story = StoryObj<LiveControlsStoryProps>;

/** Streaming normally: LIVE chip, pulsing green dot, pause button. */
export const Playing: Story = {
  args: { paused: false, connectionStatus: 'open' },
};

/** Client-side paused: PAUSED chip, play button (still connected). */
export const Paused: Story = {
  args: { paused: true, connectionStatus: 'open' },
};

/** Before any connection attempt: muted gray dot. */
export const StatusIdle: Story = {
  args: { connectionStatus: 'idle' },
};

/** Socket opening: amber dot. */
export const StatusConnecting: Story = {
  args: { connectionStatus: 'connecting' },
};

/** Connected and streaming: green pulsing dot. */
export const StatusOpen: Story = {
  args: { connectionStatus: 'open' },
};

/** Socket closed (e.g. server gone): red dot. */
export const StatusClosed: Story = {
  args: { connectionStatus: 'closed' },
};

/** Connection errored / reconnects exhausted: red dot. */
export const StatusError: Story = {
  args: { connectionStatus: 'error' },
};
