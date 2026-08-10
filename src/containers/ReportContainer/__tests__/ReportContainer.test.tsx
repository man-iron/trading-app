/**
 * Tests for ReportContainer with a mocked restClient: initial load into the
 * table, panel header (label + as-of), loading indicator, EOD switch
 * triggering the eod fetch, and error state with a working Retry action.
 */
import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import renderWithProviders, {
  buildMenuFixture,
  type PreloadedRootState,
} from '../../../testUtils/renderWithProviders';
import { formatEodDateLabel } from '../../../helpers/formatHelpers';
import type { ReportPayload } from '../../../types';
import ReportContainer from '../ReportContainer';
import { getEodReport, getReport } from '../../../api/restClient';

vi.mock('../../../api/restClient', () => ({
  getInit: vi.fn(),
  getReport: vi.fn(),
  getEodReport: vi.fn(),
  getEodDates: vi.fn(),
}));

const mockedGetReport = vi.mocked(getReport);
const mockedGetEodReport = vi.mocked(getEodReport);

const REPORT_ID = 'fx-forwards';
const EOD_DATES = ['2026-08-05', '2026-08-04'];

const livePayload: ReportPayload = {
  reportId: REPORT_ID,
  columns: [
    { key: 'symbol', label: 'Symbol', type: 'string', align: 'left' },
    { key: 'px', label: 'Price', type: 'price', align: 'right' },
  ],
  rows: [
    { id: 'r1', symbol: 'EURUSD', px: 1.0852 },
    { id: 'r2', symbol: 'GBPUSD', px: 1.2731 },
  ],
  asOf: '2026-08-06T10:00:00.000Z',
};

const eodPayload: ReportPayload = {
  reportId: REPORT_ID,
  columns: livePayload.columns,
  rows: [{ id: 'r1', symbol: 'EOD-EURUSD', px: 1.081 }],
  asOf: '2026-08-05',
};

function preloadedState(): PreloadedRootState {
  return {
    app: {
      status: 'ready',
      error: null,
      userData: null,
      eodDates: EOD_DATES,
      themeMode: 'dark',
    },
    menu: {
      items: buildMenuFixture(),
      expandedIds: [],
      selectedReportId: REPORT_ID,
    },
  };
}

function renderContainer() {
  return renderWithProviders(<ReportContainer reportId={REPORT_ID} />, {
    preloadedState: preloadedState(),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ReportContainer', () => {
  it('opens the report entry and loads the live snapshot into the table', async () => {
    mockedGetReport.mockResolvedValue(livePayload);
    const { store } = renderContainer();

    expect(await screen.findByText('EURUSD')).toBeInTheDocument();
    expect(screen.getByText('GBPUSD')).toBeInTheDocument();
    expect(mockedGetReport).toHaveBeenCalledWith(REPORT_ID);

    const entry = store.getState().reports.byId[REPORT_ID];
    expect(entry).toBeDefined();
    expect(entry.transport).toBe('rest');
    expect(entry.rows).toEqual(livePayload.rows);
  });

  it('renders the report label from the menu tree and an as-of stamp', async () => {
    mockedGetReport.mockResolvedValue(livePayload);
    renderContainer();

    expect(
      await screen.findByRole('heading', { name: 'FX Forwards' })
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText(/^As of /)).toBeInTheDocument()
    );
  });

  it('shows a progress bar while the snapshot is loading', async () => {
    mockedGetReport.mockReturnValue(new Promise(() => {})); // never resolves
    renderContainer();

    expect(await screen.findByRole('progressbar')).toBeInTheDocument();
  });

  it('shows the row count footer once loaded', async () => {
    mockedGetReport.mockResolvedValue(livePayload);
    renderContainer();

    await screen.findByText('EURUSD');
    expect(screen.getByTestId('report-table-footer')).toHaveTextContent(
      '2 of 2 rows'
    );
  });

  it('switching to an EOD date triggers the eod fetch and updates state', async () => {
    const user = userEvent.setup();
    mockedGetReport.mockResolvedValue(livePayload);
    mockedGetEodReport.mockResolvedValue(eodPayload);
    const { store } = renderContainer();
    await screen.findByText('EURUSD');

    await user.click(screen.getByRole('combobox'));
    await user.click(
      within(screen.getByRole('listbox')).getByText(
        formatEodDateLabel('2026-08-05')
      )
    );

    await waitFor(() =>
      expect(mockedGetEodReport).toHaveBeenCalledWith(REPORT_ID, '2026-08-05')
    );
    expect(await screen.findByText('EOD-EURUSD')).toBeInTheDocument();

    const entry = store.getState().reports.byId[REPORT_ID];
    expect(entry.mode).toBe('eod');
    expect(entry.eodDate).toBe('2026-08-05');
    // Header stamp switches to the EOD date.
    expect(screen.getByText(/\(EOD\)$/)).toBeInTheDocument();
  });

  it('switching back to Current refetches the live snapshot', async () => {
    const user = userEvent.setup();
    mockedGetReport.mockResolvedValue(livePayload);
    mockedGetEodReport.mockResolvedValue(eodPayload);
    const { store } = renderContainer();
    await screen.findByText('EURUSD');

    // Into EOD mode…
    await user.click(screen.getByRole('combobox'));
    await user.click(
      within(screen.getByRole('listbox')).getByText(
        formatEodDateLabel('2026-08-05')
      )
    );
    await screen.findByText('EOD-EURUSD');

    // …and back to Current.
    await user.click(screen.getByRole('combobox'));
    await user.click(within(screen.getByRole('listbox')).getByText('Current'));

    await waitFor(() => expect(mockedGetReport).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('EURUSD')).toBeInTheDocument();

    const entry = store.getState().reports.byId[REPORT_ID];
    expect(entry.mode).toBe('live');
    expect(entry.eodDate).toBeNull();
  });

  it('shows an error alert with a Retry action that recovers', async () => {
    const user = userEvent.setup();
    mockedGetReport
      .mockRejectedValueOnce(new Error('Unknown report: fx-forwards'))
      .mockResolvedValue(livePayload);
    renderContainer();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Unknown report: fx-forwards');

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('EURUSD')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    );
    expect(mockedGetReport).toHaveBeenCalledTimes(2);
  });
});
