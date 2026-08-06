/**
 * Tests for the `useWebSocket` hook, driven through a fake `LiveWsClient`
 * and a real Redux store (real `rootReducer`), via `renderHook`.
 *
 * The dispatch spy is installed BEFORE the first render so `useDispatch`
 * returns a stable identity for the whole test — installing it mid-test
 * would change the `dispatch` dependency and force a spurious re-subscribe.
 */
import React from 'react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';

import useWebSocket, {
  type LiveWsClient,
  type StatusListener,
} from '../useWebSocket';
import type { SubscriptionHandlers } from '../../api/wsClient';
import type { ConnectionStatus } from '../../constants/reportConstants';
import { reportOpened } from '../../store/reports/reportsSlice';
import {
  setupStore,
  type AppTestStore,
} from '../../testUtils/renderWithProviders';
import type { ColumnDef, ReportRow, WsTickUpdate } from '../../types';

const REPORT_ID = 'fx-spot';
const OTHER_REPORT_ID = 'rates-govt';

const COLUMNS: ColumnDef[] = [
  { key: 'symbol', label: 'Symbol', type: 'string', align: 'left' },
  { key: 'px', label: 'Price', type: 'price', align: 'right' },
  { key: 'chg', label: 'Chg %', type: 'pct', align: 'right' },
];

const ROWS: ReportRow[] = [
  { id: 'r1', symbol: 'EURUSD', px: 1.085, chg: 0.12 },
  { id: 'r2', symbol: 'GBPUSD', px: 1.273, chg: -0.34 },
];

/** Controllable in-memory fake satisfying the LiveWsClient interface. */
class FakeWsClient implements LiveWsClient {
  connectCalls = 0;

  subscribeCalls: string[] = [];

  unsubscribeCalls: string[] = [];

  handlersById = new Map<string, SubscriptionHandlers>();

  listeners = new Set<StatusListener>();

  private status: ConnectionStatus = 'connecting';

  connect(): void {
    this.connectCalls += 1;
  }

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
    reportId: string,
    overrides: Partial<{ columns: ColumnDef[]; rows: ReportRow[]; asOf: string }> = {}
  ): void {
    this.handlersById.get(reportId)?.onSnapshot?.({
      type: 'snapshot',
      reportId,
      columns: COLUMNS,
      rows: ROWS,
      asOf: '2026-08-06T10:00:00.000Z',
      ...overrides,
    });
  }

  emitTick(reportId: string, updates: WsTickUpdate[], asOf: string): void {
    this.handlersById.get(reportId)?.onTick?.({
      type: 'tick',
      reportId,
      updates,
      asOf,
    });
  }

  emitError(reportId: string, message: string): void {
    this.handlersById.get(reportId)?.onError?.(message);
  }
}

interface HookProps {
  reportId: string;
  paused: boolean;
}

let store: AppTestStore;
let client: FakeWsClient;
let dispatchSpy: MockInstance;

function renderUseWebSocket(
  initialProps: HookProps = { reportId: REPORT_ID, paused: false }
) {
  const wrapper = ({ children }: { children?: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return renderHook(
    ({ reportId, paused }: HookProps) => useWebSocket(reportId, paused, client),
    { wrapper, initialProps }
  );
}

/** The report entry under test, straight from the store. */
function reportState(reportId: string = REPORT_ID) {
  return store.getState().reports.byId[reportId];
}

/** Count of actions of the given type dispatched since the last mockClear. */
function dispatchCountOfType(type: string): number {
  return dispatchSpy.mock.calls.filter(
    (call) => (call[0] as { type?: string })?.type === type
  ).length;
}

beforeEach(() => {
  store = setupStore();
  store.dispatch(reportOpened({ reportId: REPORT_ID, transport: 'ws' }));
  store.dispatch(reportOpened({ reportId: OTHER_REPORT_ID, transport: 'ws' }));
  // Install BEFORE rendering so the dispatch identity never changes mid-test.
  dispatchSpy = vi.spyOn(store, 'dispatch');
  client = new FakeWsClient();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useWebSocket', () => {
  describe('subscription lifecycle', () => {
    it('connects and subscribes for the report on mount', () => {
      renderUseWebSocket();
      expect(client.connectCalls).toBe(1);
      expect(client.subscribeCalls).toEqual([REPORT_ID]);
    });

    it('dispatches the current connection status on mount', () => {
      renderUseWebSocket();
      expect(reportState().connectionStatus).toBe('connecting');
      expect(dispatchCountOfType('reports/connectionStatusChanged')).toBe(1);
    });

    it('dispatches connectionStatusChanged when the client status changes', () => {
      renderUseWebSocket();
      act(() => {
        client.emitStatus('open');
      });
      expect(reportState().connectionStatus).toBe('open');
      act(() => {
        client.emitStatus('error');
      });
      expect(reportState().connectionStatus).toBe('error');
    });

    it('unsubscribes and removes its status listener on unmount', () => {
      const { unmount } = renderUseWebSocket();
      expect(client.listeners.size).toBe(1);

      unmount();
      expect(client.unsubscribeCalls).toEqual([REPORT_ID]);
      expect(client.listeners.size).toBe(0);

      // A late status change must not reach the store anymore.
      act(() => {
        client.emitStatus('closed');
      });
      expect(reportState().connectionStatus).toBe('connecting');
    });

    it('re-subscribes when reportId changes', () => {
      const { rerender } = renderUseWebSocket();
      rerender({ reportId: OTHER_REPORT_ID, paused: false });

      expect(client.unsubscribeCalls).toEqual([REPORT_ID]);
      expect(client.subscribeCalls).toEqual([REPORT_ID, OTHER_REPORT_ID]);
    });

    it('routes data to the new report after a reportId change', () => {
      const { rerender } = renderUseWebSocket();
      rerender({ reportId: OTHER_REPORT_ID, paused: false });

      act(() => {
        client.emitSnapshot(OTHER_REPORT_ID);
      });
      expect(reportState(OTHER_REPORT_ID).rows).toEqual(ROWS);
      expect(reportState(REPORT_ID).rows).toEqual([]);
    });

    it('does NOT re-subscribe when only paused toggles', () => {
      const { rerender } = renderUseWebSocket();
      rerender({ reportId: REPORT_ID, paused: true });
      rerender({ reportId: REPORT_ID, paused: false });

      expect(client.subscribeCalls).toEqual([REPORT_ID]);
      expect(client.unsubscribeCalls).toEqual([]);
    });
  });

  describe('snapshot handling', () => {
    it('dispatches snapshotReceived with columns, rows and asOf', () => {
      renderUseWebSocket();
      act(() => {
        client.emitSnapshot(REPORT_ID);
      });

      const report = reportState();
      expect(report.columns).toEqual(COLUMNS);
      expect(report.rows).toEqual(ROWS);
      expect(report.asOf).toBe('2026-08-06T10:00:00.000Z');
      expect(report.loading).toBe(false);
      expect(report.error).toBeNull();
    });
  });

  describe('tick handling while playing', () => {
    it('dispatches ticksApplied immediately', () => {
      renderUseWebSocket();
      act(() => {
        client.emitSnapshot(REPORT_ID);
        client.emitTick(
          REPORT_ID,
          [{ id: 'r1', changes: { px: 1.11, chg: 0.5 } }],
          '2026-08-06T10:00:01.000Z'
        );
      });

      const report = reportState();
      expect(report.rows[0]).toMatchObject({ id: 'r1', px: 1.11, chg: 0.5 });
      expect(report.rows[1]).toMatchObject({ id: 'r2', px: 1.273 });
      expect(report.asOf).toBe('2026-08-06T10:00:01.000Z');
      expect(dispatchCountOfType('reports/ticksApplied')).toBe(1);
    });
  });

  describe('pause buffering', () => {
    it('buffers ticks while paused instead of dispatching', () => {
      const { rerender } = renderUseWebSocket();
      act(() => {
        client.emitSnapshot(REPORT_ID);
      });
      rerender({ reportId: REPORT_ID, paused: true });

      dispatchSpy.mockClear();
      act(() => {
        client.emitTick(
          REPORT_ID,
          [{ id: 'r1', changes: { px: 2.0 } }],
          '2026-08-06T10:00:02.000Z'
        );
      });

      // Nothing applied: no dispatch, rows and asOf unchanged.
      expect(dispatchCountOfType('reports/ticksApplied')).toBe(0);
      const report = reportState();
      expect(report.rows[0]).toMatchObject({ id: 'r1', px: 1.085 });
      expect(report.asOf).toBe('2026-08-06T10:00:00.000Z');
    });

    it('flushes the buffer as ONE merged ticksApplied on resume (latest change wins)', () => {
      const { rerender } = renderUseWebSocket();
      act(() => {
        client.emitSnapshot(REPORT_ID);
      });
      rerender({ reportId: REPORT_ID, paused: true });

      dispatchSpy.mockClear();
      act(() => {
        client.emitTick(
          REPORT_ID,
          [{ id: 'r1', changes: { px: 2.0 } }],
          '2026-08-06T10:00:02.000Z'
        );
        client.emitTick(
          REPORT_ID,
          [
            { id: 'r1', changes: { chg: 1.5 } },
            { id: 'r2', changes: { px: 9.99 } },
          ],
          '2026-08-06T10:00:03.000Z'
        );
        client.emitTick(
          REPORT_ID,
          [{ id: 'r1', changes: { px: 3.0 } }],
          '2026-08-06T10:00:04.000Z'
        );
      });
      expect(dispatchCountOfType('reports/ticksApplied')).toBe(0);

      rerender({ reportId: REPORT_ID, paused: false });

      expect(dispatchCountOfType('reports/ticksApplied')).toBe(1);

      const report = reportState();
      // r1: px from the LAST tick (3.0), chg shallow-merged from the middle one.
      expect(report.rows[0]).toMatchObject({ id: 'r1', px: 3.0, chg: 1.5 });
      expect(report.rows[1]).toMatchObject({ id: 'r2', px: 9.99 });
      // asOf carries the most recent buffered tick's timestamp.
      expect(report.asOf).toBe('2026-08-06T10:00:04.000Z');
    });

    it('does not dispatch a flush when resuming with an empty buffer', () => {
      const { rerender } = renderUseWebSocket();
      act(() => {
        client.emitSnapshot(REPORT_ID);
      });
      rerender({ reportId: REPORT_ID, paused: true });

      dispatchSpy.mockClear();
      rerender({ reportId: REPORT_ID, paused: false });

      expect(dispatchCountOfType('reports/ticksApplied')).toBe(0);
    });

    it('drops buffered ticks when a fresh snapshot arrives while paused', () => {
      const { rerender } = renderUseWebSocket();
      act(() => {
        client.emitSnapshot(REPORT_ID);
      });
      rerender({ reportId: REPORT_ID, paused: true });

      act(() => {
        client.emitTick(
          REPORT_ID,
          [{ id: 'r1', changes: { px: 5.55 } }],
          '2026-08-06T10:00:05.000Z'
        );
        // Snapshot supersedes the buffer entirely.
        client.emitSnapshot(REPORT_ID, { asOf: '2026-08-06T10:00:06.000Z' });
      });

      dispatchSpy.mockClear();
      rerender({ reportId: REPORT_ID, paused: false });

      expect(dispatchCountOfType('reports/ticksApplied')).toBe(0);
      expect(reportState().rows[0]).toMatchObject({ id: 'r1', px: 1.085 });
      expect(reportState().asOf).toBe('2026-08-06T10:00:06.000Z');
    });

    it('drops the buffer when reportId changes while paused', () => {
      const { rerender } = renderUseWebSocket();
      act(() => {
        client.emitSnapshot(REPORT_ID);
      });
      rerender({ reportId: REPORT_ID, paused: true });
      act(() => {
        client.emitTick(
          REPORT_ID,
          [{ id: 'r1', changes: { px: 7.77 } }],
          '2026-08-06T10:00:07.000Z'
        );
      });

      dispatchSpy.mockClear();
      // Switch report while still paused, then resume on the new report.
      rerender({ reportId: OTHER_REPORT_ID, paused: true });
      rerender({ reportId: OTHER_REPORT_ID, paused: false });

      expect(dispatchCountOfType('reports/ticksApplied')).toBe(0);
    });
  });

  describe('error handling', () => {
    it('dispatches loadFailed when the server reports an error', () => {
      renderUseWebSocket();
      act(() => {
        client.emitError(REPORT_ID, 'Unknown report: bogus');
      });

      const report = reportState();
      expect(report.error).toBe('Unknown report: bogus');
      expect(report.loading).toBe(false);
    });
  });
});
