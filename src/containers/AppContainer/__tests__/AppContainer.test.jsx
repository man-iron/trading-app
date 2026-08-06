import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AppContainer from '../AppContainer';
import {
  renderWithProviders,
  buildMenuFixture,
} from '../../../testUtils/renderWithProviders';
import { getInit } from '../../../api/restClient';

// ---------------------------------------------------------------------------
// Isolation mocks: the sidebar, both report containers, and the status bar
// are owned/tested elsewhere — stub them so AppContainer's own logic
// (init lifecycle + transport switching) is what's under test.
// ---------------------------------------------------------------------------
vi.mock('../../../api/restClient', () => ({
  getInit: vi.fn(),
  getReport: vi.fn(),
  getEodReport: vi.fn(),
  getEodDates: vi.fn(),
}));

vi.mock('../../SidebarContainer', async () => {
  const { createElement } = await import('react');
  return {
    default: () => createElement('div', { 'data-testid': 'sidebar-container' }),
  };
});

vi.mock('../../ReportContainer', async () => {
  const { createElement } = await import('react');
  return {
    default: ({ reportId }) =>
      createElement('div', { 'data-testid': 'report-container' }, reportId),
  };
});

vi.mock('../../LiveReportContainer', async () => {
  const { createElement } = await import('react');
  return {
    default: ({ reportId }) =>
      createElement(
        'div',
        { 'data-testid': 'live-report-container' },
        reportId
      ),
  };
});

vi.mock('../../../components/StatusBar', async () => {
  const { createElement } = await import('react');
  // Surface the props AppContainer passes so tests can assert the wiring.
  return {
    default: (props) =>
      createElement('div', {
        'data-testid': 'status-bar',
        'data-user': props.user ? props.user.name : '',
        'data-report-label': props.selectedReportLabel || '',
      }),
  };
});

/** Builds a contract-shaped InitResponse for the mocked GET /api/init. */
const buildInitResponse = (defaultReportId = null) => ({
  userData: {
    id: 'u-1',
    name: 'Ada Vantage',
    role: 'Trader',
    email: 'ada.vantage@example.com',
    desk: 'FX-DESK-7',
    preferences: { theme: 'dark', defaultReportId },
  },
  menuData: buildMenuFixture(),
  eodDates: ['2026-08-05', '2026-08-04', '2026-08-03'],
});

/** Full preloaded state slices for selection tests (branches must be complete). */
const buildPreloadedState = (selectedReportId) => ({
  app: {
    status: 'ready',
    error: null,
    userData: buildInitResponse().userData,
    eodDates: ['2026-08-05'],
  },
  menu: {
    items: buildMenuFixture(),
    expandedIds: [],
    selectedReportId,
  },
});

describe('AppContainer', () => {
  beforeEach(() => {
    vi.mocked(getInit).mockReset();
  });

  it('shows the skeleton layout while init is in flight, then the ready layout', async () => {
    let resolveInit;
    getInit.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveInit = resolve;
        })
    );

    renderWithProviders(<AppContainer />);

    // Loading: MUI Skeleton mock of the layout, no chrome yet.
    expect(screen.getByTestId('app-skeleton')).toBeInTheDocument();
    expect(
      screen.queryByText(/retro trading terminal/i)
    ).not.toBeInTheDocument();

    resolveInit(buildInitResponse());

    // Ready: header strip w/ title + user chip, sidebar, status bar, welcome.
    expect(
      await screen.findByText(/retro trading terminal/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Ada Vantage/)).toBeInTheDocument();
    expect(screen.getByText('FX-DESK-7')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar-container')).toBeInTheDocument();
    expect(screen.getByTestId('status-bar')).toBeInTheDocument();
    expect(screen.queryByTestId('app-skeleton')).not.toBeInTheDocument();
    expect(getInit).toHaveBeenCalledTimes(1);
  });

  it('renders the welcome/empty state when no report is selected', async () => {
    getInit.mockResolvedValue(buildInitResponse());

    renderWithProviders(<AppContainer />);

    expect(
      await screen.findByText('Select a report from the navigator')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('report-container')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('live-report-container')
    ).not.toBeInTheDocument();
  });

  it('shows the error panel on init failure and retry re-dispatches the thunk', async () => {
    const user = userEvent.setup();
    getInit
      .mockRejectedValueOnce(new Error('init blew up'))
      .mockResolvedValueOnce(buildInitResponse());

    renderWithProviders(<AppContainer />);

    // Error state: styled panel with the failure message + retry button.
    expect(
      await screen.findByText(/initialization failed/i)
    ).toBeInTheDocument();
    expect(screen.getByText('init blew up')).toBeInTheDocument();
    expect(
      screen.queryByText(/retro trading terminal/i)
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /retry/i }));

    // Retry refires getInit; second call succeeds -> ready layout.
    expect(
      await screen.findByText(/retro trading terminal/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Ada Vantage/)).toBeInTheDocument();
    expect(getInit).toHaveBeenCalledTimes(2);
  });

  it('renders ReportContainer for a selected REST report', async () => {
    getInit.mockResolvedValue(buildInitResponse('fx-forwards'));

    renderWithProviders(<AppContainer />, {
      preloadedState: buildPreloadedState('fx-forwards'),
    });

    const restContainer = await screen.findByTestId('report-container');
    expect(restContainer).toHaveTextContent('fx-forwards');
    expect(
      screen.queryByTestId('live-report-container')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Select a report from the navigator')
    ).not.toBeInTheDocument();
  });

  it('renders LiveReportContainer for a selected WS report', async () => {
    getInit.mockResolvedValue(buildInitResponse('fx-spot'));

    renderWithProviders(<AppContainer />, {
      preloadedState: buildPreloadedState('fx-spot'),
    });

    const liveContainer = await screen.findByTestId('live-report-container');
    expect(liveContainer).toHaveTextContent('fx-spot');
    expect(screen.queryByTestId('report-container')).not.toBeInTheDocument();
  });

  it('passes the user and selected report label down to the StatusBar', async () => {
    getInit.mockResolvedValue(buildInitResponse('fx-spot'));

    renderWithProviders(<AppContainer />, {
      preloadedState: buildPreloadedState('fx-spot'),
    });

    const statusBar = await screen.findByTestId('status-bar');
    expect(statusBar).toHaveAttribute('data-user', 'Ada Vantage');
    expect(statusBar).toHaveAttribute('data-report-label', 'FX Spot');
  });

  it('passes a null report label to the StatusBar when nothing is selected', async () => {
    getInit.mockResolvedValue(buildInitResponse());

    renderWithProviders(<AppContainer />);

    const statusBar = await screen.findByTestId('status-bar');
    expect(statusBar).toHaveAttribute('data-user', 'Ada Vantage');
    expect(statusBar).toHaveAttribute('data-report-label', '');
  });

  it('switches the main area when the selected report changes in the store', async () => {
    getInit.mockResolvedValue(buildInitResponse('fx-forwards'));

    const { store } = renderWithProviders(<AppContainer />, {
      preloadedState: buildPreloadedState('fx-forwards'),
    });

    await screen.findByTestId('report-container');

    // Simulate the sidebar selecting a WS report (contract action shape).
    store.dispatch({
      type: 'menu/SELECT_REPORT',
      payload: { reportId: 'stocks' },
    });

    const liveContainer = await screen.findByTestId('live-report-container');
    expect(liveContainer).toHaveTextContent('stocks');
    expect(screen.queryByTestId('report-container')).not.toBeInTheDocument();
  });
});
