/**
 * Tests for `LiveReportContainer`: real store + real `useWebSocket` hook,
 * driven end-to-end through a fake `LiveWsClient`.
 *
 * `ReportTable` is owned by the presentational layer and is mocked with a
 * deterministic stub so assertions target exactly what the container passes
 * down (columns/rows), independent of table sort/filter/format behavior.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import LiveReportContainer from '../LiveReportContainer';
import type {
  LiveWsClient,
  StatusListener,
} from '../../../hooks/useWebSocket';
import type { SubscriptionHandlers } from '../../../api/wsClient';
import type { ConnectionStatus } from '../../../constants/reportConstants';
import { reportOpened } from '../../../store/reports/reportsSlice';
import {
  buildMenuFixture,
  renderWithProviders,
  setupStore,
  type AppTestStore,
} from '../../../testUtils/renderWithProviders';
import type { ColumnDef, ReportRow, WsTickUpdate } from '../../../types';

vi.mock('../../../components/ReportTable', () => ({
  __esModule: true,
  default: ({ columns, rows }: { columns: ColumnDef[]; rows: ReportRow[] }) => (
    <table data-testid="report-table">
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            {columns.map((column) => (
              <td key={column.key} data-testid={`cell-${row.id}-${column.key}`}>
                {String(row[column.key])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

const REPORT_ID = 'fx-spot';

const COLUMNS: ColumnDef[] = [
  { key: 'symbol', label: 'Symbol', type: 'string', align: 'left' },
  { key: 'px', label: 'Price', type: 'price', align: 'right' },
];

const ROWS: ReportRow[] = [
  { id: 'r1', symbol: 'EURUSD', px: 1.085 },
  { id: 'r2', symbol: 'GBPUSD', px: 1.273 },
];

/** Controllable in-memory fake satisfying the LiveWsClient interface. */
class FakeWsClient implements LiveWsClient {
  subscribeCalls: string[] = [];

  unsubscribeCalls: string[] = [];

  handlersById = new Map<string, SubscriptionHandlers>();

  listeners = new Set<StatusListener>();

  private status: ConnectionStatus = 'connecting';

  connect(): void {}

  subscribe(reportId: string, handlers: SubscriptionHandlers): void {
    this.subscribeCalls.push(reportId);
    this.handlersById.set(reportId, handlers);
  }

  unsubscribe(reportId: string): void {
    this.unsubscribeCalls.push(reportId);
    this.handlersById.delete(reportId);
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  addStatusListener(listener: StatusListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emitStatus(status: ConnectionStatus): void {
    this.status = status;
    this.listeners.forEach((listener) => listener(status));
  }

  emitSnapshot(
    overrides: Partial<{ columns: ColumnDef[]; rows: ReportRow[]; asOf: string }> = {}
  ): void {
    this.handlersById.get(REPORT_ID)?.onSnapshot?.({
      type: 'snapshot',
      reportId: REPORT_ID,
      columns: COLUMNS,
      rows: ROWS,
      asOf: '2026-08-06T10:00:00.000Z',
      ...overrides,
    });
  }

  emitTick(updates: WsTickUpdate[], asOf = '2026-08-06T10:00:01.000Z'): void {
    this.handlersById.get(REPORT_ID)?.onTick?.({
      type: 'tick',
      reportId: REPORT_ID,
      updates,
      asOf,
    });
  }

  emitError(message: string): void {
    this.handlersById.get(REPORT_ID)?.onError?.(message);
  }
}

let store: AppTestStore;
let client: FakeWsClient;

function renderContainer(reportId: string = REPORT_ID) {
  return renderWithProviders(
    <LiveReportContainer reportId={reportId} wsClient={client} />,
    { store }
  );
}

beforeEach(() => {
  store = setupStore({
    menu: {
      items: buildMenuFixture(),
      expandedIds: [],
      selectedReportId: REPORT_ID,
    },
  });
  store.dispatch(reportOpened({ reportId: REPORT_ID, transport: 'ws' }));
  client = new FakeWsClient();
});

describe('LiveReportContainer', () => {
  it('self-opens the report entry when selected outside the menu flow (e.g. defaultReportId from init)', () => {
    renderContainer('never-opened');
    // The container dispatches an idempotent reportOpened on mount, so the
    // reports.byId entry is created even without a menu click.
    expect(store.getState().reports.byId['never-opened']).toMatchObject({
      reportId: 'never-opened',
      transport: 'ws',
    });
    // Label falls back to the reportId (not in the menu fixture).
    expect(
      screen.getByRole('heading', { name: 'never-opened' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('live-skeleton')).toBeInTheDocument();
  });

  it('does not clobber an existing report entry on mount', () => {
    act(() => {
      client.emitStatus('open');
    });
    renderContainer();
    act(() => {
      client.emitSnapshot();
    });
    const entry = store.getState().reports.byId[REPORT_ID];
    expect(entry.columns.length).toBeGreaterThan(0);
    expect(entry.connectionStatus).toBe('open');
  });

  it('subscribes via the ws client and shows a skeleton while connecting', () => {
    renderContainer();
    expect(client.subscribeCalls).toEqual([REPORT_ID]);
    expect(screen.getByTestId('live-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('report-table')).not.toBeInTheDocument();
    // Panel header shows the report label from the menu tree.
    expect(
      screen.getByRole('heading', { name: 'FX Spot' })
    ).toBeInTheDocument();
    // The connection dot reflects the connecting status.
    expect(screen.getByTestId('connection-dot')).toHaveAttribute(
      'data-status',
      'connecting'
    );
  });

  it('renders rows from the snapshot and the ticking as-of clock', () => {
    renderContainer();
    act(() => {
      client.emitStatus('open');
      client.emitSnapshot();
    });

    expect(screen.queryByTestId('live-skeleton')).not.toBeInTheDocument();
    expect(screen.getByTestId('cell-r1-symbol')).toHaveTextContent('EURUSD');
    expect(screen.getByTestId('cell-r1-px')).toHaveTextContent('1.085');
    expect(screen.getByTestId('cell-r2-symbol')).toHaveTextContent('GBPUSD');
    expect(screen.getByTestId('live-as-of')).toHaveTextContent(
      /as of \d{2}:\d{2}:\d{2}/
    );
    expect(screen.getByTestId('connection-dot')).toHaveAttribute(
      'data-status',
      'open'
    );
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('applies tick updates to table cells while playing', () => {
    renderContainer();
    act(() => {
      client.emitStatus('open');
      client.emitSnapshot();
    });

    act(() => {
      client.emitTick([{ id: 'r1', changes: { px: 2.5 } }]);
    });

    expect(screen.getByTestId('cell-r1-px')).toHaveTextContent('2.5');
    // Untouched rows keep their values.
    expect(screen.getByTestId('cell-r2-px')).toHaveTextContent('1.273');
  });

  it('pause stops table updates; resume applies the buffered changes', async () => {
    const user = userEvent.setup();
    renderContainer();
    act(() => {
      client.emitStatus('open');
      client.emitSnapshot();
    });

    await user.click(screen.getByRole('button', { name: 'Pause updates' }));
    expect(screen.getByText('PAUSED')).toBeInTheDocument();

    act(() => {
      client.emitTick([{ id: 'r1', changes: { px: 3.33 } }]);
      client.emitTick([{ id: 'r2', changes: { px: 4.44 } }]);
    });
    // Table untouched while paused.
    expect(screen.getByTestId('cell-r1-px')).toHaveTextContent('1.085');
    expect(screen.getByTestId('cell-r2-px')).toHaveTextContent('1.273');

    await user.click(screen.getByRole('button', { name: 'Resume updates' }));
    expect(screen.getByText('LIVE')).toBeInTheDocument();
    // Buffered changes applied on resume.
    expect(screen.getByTestId('cell-r1-px')).toHaveTextContent('3.33');
    expect(screen.getByTestId('cell-r2-px')).toHaveTextContent('4.44');
  });

  it('pausing does not tear down the subscription', async () => {
    const user = userEvent.setup();
    renderContainer();
    act(() => {
      client.emitStatus('open');
      client.emitSnapshot();
    });

    await user.click(screen.getByRole('button', { name: 'Pause updates' }));
    await user.click(screen.getByRole('button', { name: 'Resume updates' }));

    expect(client.subscribeCalls).toEqual([REPORT_ID]);
    expect(client.unsubscribeCalls).toEqual([]);
  });

  it('shows an error Alert when the server reports an error', () => {
    renderContainer();
    act(() => {
      client.emitError('Unknown report: fx-spot');
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Unknown report: fx-spot'
    );
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderContainer();
    unmount();
    expect(client.unsubscribeCalls).toEqual([REPORT_ID]);
  });
});
