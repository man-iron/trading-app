/**
 * Tests for the LiveControls class component (pause/play + connection dot).
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import LiveControls from '../LiveControls';
import { renderWithProviders } from '../../../testUtils/renderWithProviders';

const defaultProps = {
  paused: false,
  connectionStatus: 'open',
  onTogglePause: () => {},
};

function renderControls(overrides = {}) {
  return renderWithProviders(
    <LiveControls {...defaultProps} {...overrides} />
  );
}

describe('LiveControls', () => {
  describe('pause/play toggle', () => {
    it('shows the LIVE chip and a pause button while playing', () => {
      renderControls({ paused: false });
      expect(screen.getByText('LIVE')).toBeInTheDocument();
      expect(screen.queryByText('PAUSED')).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Pause updates' })
      ).toBeInTheDocument();
    });

    it('shows the PAUSED chip and a play button while paused', () => {
      renderControls({ paused: true });
      expect(screen.getByText('PAUSED')).toBeInTheDocument();
      expect(screen.queryByText('LIVE')).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Resume updates' })
      ).toBeInTheDocument();
    });

    it('invokes onTogglePause when the pause button is clicked', async () => {
      const user = userEvent.setup();
      const onTogglePause = vi.fn();
      renderControls({ paused: false, onTogglePause });

      await user.click(screen.getByRole('button', { name: 'Pause updates' }));
      expect(onTogglePause).toHaveBeenCalledTimes(1);
    });

    it('invokes onTogglePause when the play button is clicked while paused', async () => {
      const user = userEvent.setup();
      const onTogglePause = vi.fn();
      renderControls({ paused: true, onTogglePause });

      await user.click(screen.getByRole('button', { name: 'Resume updates' }));
      expect(onTogglePause).toHaveBeenCalledTimes(1);
    });
  });

  describe('connection status dot', () => {
    const cases = [
      { status: 'idle', dotRule: /dotIdle/, label: 'Idle' },
      { status: 'connecting', dotRule: /dotConnecting/, label: 'Connecting…' },
      { status: 'open', dotRule: /dotOpen/, label: 'Connected' },
      { status: 'closed', dotRule: /dotClosed/, label: 'Disconnected' },
      { status: 'error', dotRule: /dotError/, label: 'Connection error' },
    ];

    it.each(cases)(
      'renders the $status dot with its label',
      ({ status, dotRule, label }) => {
        renderControls({ connectionStatus: status });
        const dot = screen.getByTestId('connection-dot');
        expect(dot).toHaveAttribute('data-status', status);
        expect(dot.className).toMatch(dotRule);
        expect(screen.getByRole('status')).toHaveTextContent(label);
      }
    );

    it('only the open dot carries the pulsing open rule', () => {
      renderControls({ connectionStatus: 'closed' });
      const dot = screen.getByTestId('connection-dot');
      expect(dot.className).not.toMatch(/dotOpen/);
    });

    it('falls back to the idle presentation for an unknown status', () => {
      renderControls({ connectionStatus: 'bogus' });
      const dot = screen.getByTestId('connection-dot');
      expect(dot.className).toMatch(/dotIdle/);
      expect(screen.getByRole('status')).toHaveTextContent('Idle');
    });
  });
});
