import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ErrorBoundary from '../ErrorBoundary';
import { renderWithProviders } from '../../../testUtils/renderWithProviders';

/** A child that always throws during render. */
function Bomb({ message = 'kaboom' }) {
  throw new Error(message);
}

/** A child that throws a non-Error value (boundary must still render it). */
function StringBomb() {
  // eslint-disable-next-line no-throw-literal
  throw 'plain string failure';
}

/** Silence React's expected error logging for caught boundary errors. */
const silenceConsoleError = () =>
  vi.spyOn(console, 'error').mockImplementation(() => {});

describe('ErrorBoundary', () => {
  it('renders its children when nothing throws', () => {
    renderWithProviders(
      <ErrorBoundary>
        <div data-testid="healthy-child">all good</div>
      </ErrorBoundary>
    );

    expect(screen.getByTestId('healthy-child')).toBeInTheDocument();
    expect(screen.queryByText(/system fault/i)).not.toBeInTheDocument();
  });

  it('renders the styled fallback with the error message when a child throws', () => {
    silenceConsoleError();

    renderWithProviders(
      <ErrorBoundary>
        <Bomb message="ticker feed disintegrated" />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/system fault/i)).toBeInTheDocument();
    expect(
      screen.getByText('ticker feed disintegrated')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /reload terminal/i })
    ).toBeInTheDocument();
  });

  it('hides the crashed children once the fallback is shown', () => {
    silenceConsoleError();

    renderWithProviders(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    expect(screen.queryByTestId('healthy-child')).not.toBeInTheDocument();
    expect(screen.getByText('kaboom')).toBeInTheDocument();
  });

  it('stringifies non-Error thrown values in the fallback', () => {
    silenceConsoleError();

    renderWithProviders(
      <ErrorBoundary>
        <StringBomb />
      </ErrorBoundary>
    );

    expect(screen.getByText('plain string failure')).toBeInTheDocument();
  });

  it('logs the caught error via componentDidCatch', () => {
    const consoleSpy = silenceConsoleError();

    renderWithProviders(
      <ErrorBoundary>
        <Bomb message="logged failure" />
      </ErrorBoundary>
    );

    const loggedOurMessage = consoleSpy.mock.calls.some((callArgs) =>
      callArgs.some(
        (arg) =>
          (typeof arg === 'string' && arg.includes('[ErrorBoundary]')) ||
          (arg instanceof Error && arg.message === 'logged failure')
      )
    );
    expect(loggedOurMessage).toBe(true);
  });

  it('invokes the injected onReload handler when the reload button is clicked', async () => {
    silenceConsoleError();
    const user = userEvent.setup();
    const onReload = vi.fn();

    renderWithProviders(
      <ErrorBoundary onReload={onReload}>
        <Bomb />
      </ErrorBoundary>
    );

    await user.click(screen.getByRole('button', { name: /reload terminal/i }));

    expect(onReload).toHaveBeenCalledTimes(1);
  });
});
