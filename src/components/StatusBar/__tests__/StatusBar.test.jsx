/**
 * Tests for the class-based StatusBar component.
 *
 * Covers: user/desk/role rendering, selected-report label + placeholders,
 * the fake-timer-driven clock tick, and interval cleanup on unmount (the
 * classic componentDidMount/componentWillUnmount retro pattern).
 */
import React from 'react';
import { act, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import StatusBar, { formatClock } from '../StatusBar';
import { renderWithProviders } from '../../../testUtils/renderWithProviders';

/** Contract-shaped UserData fixture. */
const userFixture = {
  id: 'u1',
  name: 'Ada Trader',
  role: 'Senior Trader',
  email: 'ada@example.com',
  desk: 'FX Desk',
  preferences: { theme: 'dark', defaultReportId: null },
};

describe('formatClock', () => {
  it('formats as zero-padded 24h HH:MM:SS', () => {
    expect(formatClock(new Date(2026, 7, 6, 9, 5, 3))).toBe('09:05:03');
    expect(formatClock(new Date(2026, 7, 6, 23, 59, 59))).toBe('23:59:59');
    expect(formatClock(new Date(2026, 7, 6, 0, 0, 0))).toBe('00:00:00');
  });
});

describe('StatusBar', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 6, 14, 5, 9));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('user section', () => {
    it('renders the user name, desk and role', () => {
      renderWithProviders(<StatusBar user={userFixture} selectedReportLabel={null} />);
      expect(screen.getByText('Ada Trader')).toBeInTheDocument();
      expect(screen.getByText('FX Desk')).toBeInTheDocument();
      expect(screen.getByText('Senior Trader')).toBeInTheDocument();
    });

    it('renders a placeholder when no user is signed in', () => {
      renderWithProviders(<StatusBar user={null} selectedReportLabel={null} />);
      expect(screen.getByText('NOT SIGNED IN')).toBeInTheDocument();
    });
  });

  describe('report section', () => {
    it('renders the selected report label', () => {
      renderWithProviders(
        <StatusBar user={userFixture} selectedReportLabel="FX Spot" />
      );
      expect(screen.getByText('FX Spot')).toBeInTheDocument();
      expect(screen.queryByText('NO REPORT')).not.toBeInTheDocument();
    });

    it('renders a placeholder when no report is selected', () => {
      renderWithProviders(<StatusBar user={userFixture} selectedReportLabel={null} />);
      expect(screen.getByText('NO REPORT')).toBeInTheDocument();
    });
  });

  describe('clock', () => {
    it('renders the current local time on mount', () => {
      renderWithProviders(<StatusBar user={userFixture} selectedReportLabel={null} />);
      expect(screen.getByTestId('status-clock')).toHaveTextContent('14:05:09');
    });

    it('ticks forward every second', () => {
      renderWithProviders(<StatusBar user={userFixture} selectedReportLabel={null} />);
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByTestId('status-clock')).toHaveTextContent('14:05:10');
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(screen.getByTestId('status-clock')).toHaveTextContent('14:05:13');
    });

    it('rolls over minute boundaries correctly', () => {
      vi.setSystemTime(new Date(2026, 7, 6, 14, 5, 59));
      renderWithProviders(<StatusBar user={userFixture} selectedReportLabel={null} />);
      expect(screen.getByTestId('status-clock')).toHaveTextContent('14:05:59');
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByTestId('status-clock')).toHaveTextContent('14:06:00');
    });

    it('clears its interval on unmount', () => {
      const { unmount } = renderWithProviders(
        <StatusBar user={userFixture} selectedReportLabel={null} />
      );
      expect(vi.getTimerCount()).toBe(1);
      unmount();
      expect(vi.getTimerCount()).toBe(0);
    });

    it('does not tick (or warn about setState) after unmount', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { unmount } = renderWithProviders(
        <StatusBar user={userFixture} selectedReportLabel={null} />
      );
      unmount();
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });
});
