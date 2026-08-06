import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../App';
import { renderWithProviders } from '../testUtils/renderWithProviders';

// Stub the (Redux-connected, network-touching) AppContainer so this stays a
// pure shell smoke test. The hoisted flag lets one test make the stub throw
// to prove the ErrorBoundary wiring.
const hoisted = vi.hoisted(() => ({ shouldThrow: false }));

vi.mock('../containers/AppContainer', async () => {
  const { createElement } = await import('react');
  return {
    default: () => {
      if (hoisted.shouldThrow) {
        throw new Error('container crashed');
      }
      return createElement(
        'div',
        { 'data-testid': 'app-container-stub' },
        'terminal ready'
      );
    },
  };
});

describe('App shell', () => {
  beforeEach(() => {
    hoisted.shouldThrow = false;
  });

  it('renders the AppContainer inside the shell', () => {
    renderWithProviders(<App />);

    expect(screen.getByTestId('app-container-stub')).toBeInTheDocument();
    expect(screen.getByText('terminal ready')).toBeInTheDocument();
  });

  it('catches container crashes with the ErrorBoundary fallback', () => {
    hoisted.shouldThrow = true;
    vi.spyOn(console, 'error').mockImplementation(() => {});

    renderWithProviders(<App />);

    expect(screen.getByText(/system fault/i)).toBeInTheDocument();
    expect(screen.getByText('container crashed')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /reload terminal/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('app-container-stub')
    ).not.toBeInTheDocument();
  });
});
