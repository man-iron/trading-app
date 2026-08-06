import type { Meta, StoryObj } from '@storybook/react';
import ErrorBoundary from './ErrorBoundary';

/** A child that always throws during render — trips the boundary. */
function Bomb(): JSX.Element {
  throw new Error('Price feed exploded: NaN ticks per second');
}

const meta: Meta<typeof ErrorBoundary> = {
  title: 'Components/ErrorBoundary',
  component: ErrorBoundary,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof ErrorBoundary>;

/** Healthy subtree — the boundary is transparent and renders its children. */
export const HealthyChildren: Story = {
  render: () => (
    <ErrorBoundary onReload={() => {}}>
      <div style={{ padding: 24, fontFamily: 'Consolas, monospace' }}>
        All systems nominal — children render straight through.
      </div>
    </ErrorBoundary>
  ),
};

/**
 * A child throws during render — the boundary catches it and shows the
 * styled SYSTEM FAULT panel with the error message and reload button.
 * (The console error entry is expected; React logs caught errors.)
 */
export const CaughtError: Story = {
  render: () => (
    <ErrorBoundary onReload={() => {}}>
      <Bomb />
    </ErrorBoundary>
  ),
};
