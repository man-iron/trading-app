/**
 * Tests for useReportData: success + error lifecycles against a mocked
 * restClient, refetch on mode/date change, the stale-response guard, the
 * eod-without-date no-op, and manual refetch().
 */
import React, { type ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';

import {
  setupStore,
  buildReportStateFixture,
  type AppTestStore,
} from '../../testUtils/renderWithProviders';
import type { ReportMode, ReportPayload } from '../../types';
import { useReportData } from '../useReportData';
import { getEodReport, getReport } from '../../api/restClient';

vi.mock('../../api/restClient', () => ({
  getInit: vi.fn(),
  getReport: vi.fn(),
  getEodReport: vi.fn(),
  getEodDates: vi.fn(),
}));

const mockedGetReport = vi.mocked(getReport);
const mockedGetEodReport = vi.mocked(getEodReport);

const REPORT_ID = 'fx-forwards';

function buildPayload(overrides: Partial<ReportPayload> = {}): ReportPayload {
  return {
    reportId: REPORT_ID,
    columns: [{ key: 'symbol', label: 'Symbol', type: 'string' }],
    rows: [{ id: 'r1', symbol: 'EURUSD' }],
    asOf: '2026-08-06T10:00:00.000Z',
    ...overrides,
  };
}

/** A promise with externally controllable resolve/reject. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function buildStore(): AppTestStore {
  return setupStore({
    reports: {
      byId: {
        [REPORT_ID]: buildReportStateFixture({
          reportId: REPORT_ID,
          columns: [],
          rows: [],
          asOf: null,
        }),
      },
    },
  });
}

interface HookProps {
  mode: ReportMode;
  eodDate: string | null;
}

function renderReportDataHook(store: AppTestStore, initialProps: HookProps) {
  const wrapper = ({ children }: { children?: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return renderHook(
    ({ mode, eodDate }: HookProps) => useReportData(REPORT_ID, mode, eodDate),
    { wrapper, initialProps }
  );
}

const reportState = (store: AppTestStore) =>
  store.getState().reports.byId[REPORT_ID];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useReportData', () => {
  it('dispatches loadingStarted and fetches the live snapshot on mount', async () => {
    const payload = buildPayload();
    mockedGetReport.mockResolvedValue(payload);
    const store = buildStore();

    renderReportDataHook(store, { mode: 'live', eodDate: null });

    expect(reportState(store).loading).toBe(true);
    expect(mockedGetReport).toHaveBeenCalledTimes(1);
    expect(mockedGetReport).toHaveBeenCalledWith(REPORT_ID);
    expect(mockedGetEodReport).not.toHaveBeenCalled();

    await waitFor(() => expect(reportState(store).loading).toBe(false));
    expect(reportState(store).rows).toEqual(payload.rows);
    expect(reportState(store).columns).toEqual(payload.columns);
    expect(reportState(store).asOf).toBe(payload.asOf);
    expect(reportState(store).error).toBeNull();
  });

  it('dispatches loadFailed with the error message on rejection', async () => {
    mockedGetReport.mockRejectedValue(new Error('Unknown report: nope'));
    const store = buildStore();

    renderReportDataHook(store, { mode: 'live', eodDate: null });

    await waitFor(() =>
      expect(reportState(store).error).toBe('Unknown report: nope')
    );
    expect(reportState(store).loading).toBe(false);
  });

  it('stringifies non-Error rejections', async () => {
    mockedGetReport.mockRejectedValue('total meltdown');
    const store = buildStore();

    renderReportDataHook(store, { mode: 'live', eodDate: null });

    await waitFor(() => expect(reportState(store).error).toBe('total meltdown'));
  });

  it('fetches the EOD endpoint when mode switches to eod with a date', async () => {
    const livePayload = buildPayload();
    const eodPayload = buildPayload({
      rows: [{ id: 'r9', symbol: 'EOD-ROW' }],
      asOf: '2026-08-05',
    });
    mockedGetReport.mockResolvedValue(livePayload);
    mockedGetEodReport.mockResolvedValue(eodPayload);
    const store = buildStore();

    const { rerender } = renderReportDataHook(store, {
      mode: 'live',
      eodDate: null,
    });
    await waitFor(() => expect(reportState(store).loading).toBe(false));

    rerender({ mode: 'eod', eodDate: '2026-08-05' });

    expect(mockedGetEodReport).toHaveBeenCalledTimes(1);
    expect(mockedGetEodReport).toHaveBeenCalledWith(REPORT_ID, '2026-08-05');
    await waitFor(() =>
      expect(reportState(store).rows).toEqual(eodPayload.rows)
    );
    expect(reportState(store).asOf).toBe('2026-08-05');
  });

  it('refetches when the eod date changes', async () => {
    mockedGetEodReport.mockResolvedValue(buildPayload({ asOf: '2026-08-05' }));
    const store = buildStore();

    const { rerender } = renderReportDataHook(store, {
      mode: 'eod',
      eodDate: '2026-08-05',
    });
    await waitFor(() => expect(reportState(store).loading).toBe(false));

    rerender({ mode: 'eod', eodDate: '2026-08-04' });

    expect(mockedGetEodReport).toHaveBeenCalledTimes(2);
    expect(mockedGetEodReport).toHaveBeenLastCalledWith(REPORT_ID, '2026-08-04');
  });

  it('does not fetch in eod mode when no date is selected yet', () => {
    const store = buildStore();

    renderReportDataHook(store, { mode: 'eod', eodDate: null });

    expect(mockedGetReport).not.toHaveBeenCalled();
    expect(mockedGetEodReport).not.toHaveBeenCalled();
    expect(reportState(store).loading).toBe(false);
  });

  it('ignores stale responses that resolve after the inputs changed', async () => {
    const staleDeferred = deferred<ReportPayload>();
    const freshDeferred = deferred<ReportPayload>();
    mockedGetReport.mockReturnValue(staleDeferred.promise);
    mockedGetEodReport.mockReturnValue(freshDeferred.promise);
    const store = buildStore();

    const { rerender } = renderReportDataHook(store, {
      mode: 'live',
      eodDate: null,
    });
    // Switch to EOD while the live request is still in flight.
    rerender({ mode: 'eod', eodDate: '2026-08-05' });

    const freshPayload = buildPayload({
      rows: [{ id: 'fresh', symbol: 'FRESH' }],
      asOf: '2026-08-05',
    });
    await act(async () => {
      freshDeferred.resolve(freshPayload);
    });
    expect(reportState(store).rows).toEqual(freshPayload.rows);

    // Now the stale live response arrives — it must be dropped.
    const stalePayload = buildPayload({
      rows: [{ id: 'stale', symbol: 'STALE' }],
      asOf: '2026-08-06T10:00:00.000Z',
    });
    await act(async () => {
      staleDeferred.resolve(stalePayload);
    });
    expect(reportState(store).rows).toEqual(freshPayload.rows);
    expect(reportState(store).asOf).toBe('2026-08-05');
  });

  it('ignores a stale rejection after unmount (no dispatch after cleanup)', async () => {
    const pending = deferred<ReportPayload>();
    mockedGetReport.mockReturnValue(pending.promise);
    const store = buildStore();

    const { unmount } = renderReportDataHook(store, {
      mode: 'live',
      eodDate: null,
    });
    unmount();

    await act(async () => {
      pending.reject(new Error('late failure'));
    });
    expect(reportState(store).error).toBeNull();
  });

  it('refetch() re-runs the current fetch', async () => {
    mockedGetReport.mockResolvedValue(buildPayload());
    const store = buildStore();

    const { result } = renderReportDataHook(store, {
      mode: 'live',
      eodDate: null,
    });
    await waitFor(() => expect(reportState(store).loading).toBe(false));
    expect(mockedGetReport).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.refetch();
    });

    expect(mockedGetReport).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(reportState(store).loading).toBe(false));
  });
});
