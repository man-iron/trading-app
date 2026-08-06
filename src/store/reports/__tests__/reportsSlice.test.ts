import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import reportsReducer, {
  initialState,
  createInitialReportState,
  reportOpened,
  snapshotReceived,
  ticksApplied,
  loadingStarted,
  loadFailed,
  pauseToggled,
  modeChanged,
  eodDateSelected,
  connectionStatusChanged,
  type ReportsState,
} from '../reportsSlice';
import { LAST_TICK_FIELD } from '../../../constants/reportConstants';
import type { ColumnDef, ReportRow } from '../../../types';

const columns: ColumnDef[] = [
  { key: 'symbol', label: 'Symbol', type: 'string' },
  { key: 'price', label: 'Price', type: 'price', align: 'right' },
  { key: 'pct', label: '%', type: 'pct', align: 'right' },
];

const rows: ReportRow[] = [
  { id: 'r1', symbol: 'EURUSD', price: 1.0842, pct: 0.12 },
  { id: 'r2', symbol: 'GBPUSD', price: 1.2701, pct: -0.34 },
  { id: 'r3', symbol: 'USDJPY', price: 156.02, pct: 0.05 },
];

/** State with one opened ws report pre-loaded with a snapshot. */
const openedWithSnapshot = (): ReportsState => {
  let state = reportsReducer(
    initialState,
    reportOpened({ reportId: 'fx-spot', transport: 'ws' })
  );
  state = reportsReducer(
    state,
    snapshotReceived({ reportId: 'fx-spot', columns, rows, asOf: '2026-08-06T10:00:00Z' })
  );
  return state;
};

describe('reports slice', () => {
  it('returns the initial state for an unknown action', () => {
    expect(reportsReducer(undefined, { type: '@@INIT' })).toEqual({ byId: {} });
  });

  describe('reportOpened', () => {
    it('creates a fresh entry with contract defaults', () => {
      const state = reportsReducer(
        initialState,
        reportOpened({ reportId: 'fx-spot', transport: 'ws' })
      );
      expect(state.byId['fx-spot']).toEqual({
        reportId: 'fx-spot',
        transport: 'ws',
        columns: [],
        rows: [],
        loading: false,
        error: null,
        mode: 'live',
        paused: false,
        eodDate: null,
        asOf: null,
        connectionStatus: 'idle',
      });
    });

    it('does not clobber an existing entry when reopened', () => {
      let state = openedWithSnapshot();
      state = reportsReducer(
        state,
        reportOpened({ reportId: 'fx-spot', transport: 'ws' })
      );
      expect(state.byId['fx-spot'].rows).toEqual(rows);
      expect(state.byId['fx-spot'].columns).toEqual(columns);
    });

    it('supports multiple concurrently opened reports', () => {
      let state = reportsReducer(
        initialState,
        reportOpened({ reportId: 'fx-spot', transport: 'ws' })
      );
      state = reportsReducer(
        state,
        reportOpened({ reportId: 'etfs', transport: 'rest' })
      );
      expect(Object.keys(state.byId)).toEqual(['fx-spot', 'etfs']);
      expect(state.byId.etfs.transport).toBe('rest');
    });
  });

  describe('snapshotReceived', () => {
    it('stores columns, rows and asOf, clearing loading/error', () => {
      let state = reportsReducer(
        initialState,
        reportOpened({ reportId: 'fx-spot', transport: 'ws' })
      );
      state = reportsReducer(state, loadingStarted({ reportId: 'fx-spot' }));
      state = reportsReducer(
        state,
        snapshotReceived({ reportId: 'fx-spot', columns, rows, asOf: '2026-08-06T10:00:00Z' })
      );
      const report = state.byId['fx-spot'];
      expect(report.columns).toEqual(columns);
      expect(report.rows).toEqual(rows);
      expect(report.asOf).toBe('2026-08-06T10:00:00Z');
      expect(report.loading).toBe(false);
      expect(report.error).toBeNull();
    });

    it('ignores snapshots for unopened reports', () => {
      const state = reportsReducer(
        initialState,
        snapshotReceived({ reportId: 'ghost', columns, rows, asOf: 'x' })
      );
      expect(state.byId).toEqual({});
    });
  });

  describe('ticksApplied', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-08-06T10:00:05Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('merges changes into matching rows by id', () => {
      const state = reportsReducer(
        openedWithSnapshot(),
        ticksApplied({
          reportId: 'fx-spot',
          updates: [
            { id: 'r1', changes: { price: 1.09, pct: 0.5 } },
            { id: 'r3', changes: { price: 155.9 } },
          ],
          asOf: '2026-08-06T10:00:05Z',
        })
      );
      const [r1, r2, r3] = state.byId['fx-spot'].rows;
      expect(r1.price).toBe(1.09);
      expect(r1.pct).toBe(0.5);
      expect(r1.symbol).toBe('EURUSD'); // untouched fields preserved
      expect(r2.price).toBe(1.2701); // unchanged row untouched
      expect(r3.price).toBe(155.9);
      expect(r3.pct).toBe(0.05);
    });

    it(`stamps ${LAST_TICK_FIELD} only on changed rows`, () => {
      const expectedStamp = Date.now();
      const state = reportsReducer(
        openedWithSnapshot(),
        ticksApplied({
          reportId: 'fx-spot',
          updates: [{ id: 'r2', changes: { pct: -0.4 } }],
          asOf: '2026-08-06T10:00:05Z',
        })
      );
      const [r1, r2, r3] = state.byId['fx-spot'].rows;
      expect(r2[LAST_TICK_FIELD]).toBe(expectedStamp);
      expect(r1[LAST_TICK_FIELD]).toBeUndefined();
      expect(r3[LAST_TICK_FIELD]).toBeUndefined();
    });

    it('updates asOf from the tick message', () => {
      const state = reportsReducer(
        openedWithSnapshot(),
        ticksApplied({
          reportId: 'fx-spot',
          updates: [{ id: 'r1', changes: { price: 1.1 } }],
          asOf: '2026-08-06T10:00:05Z',
        })
      );
      expect(state.byId['fx-spot'].asOf).toBe('2026-08-06T10:00:05Z');
    });

    it('ignores updates whose row id is not present', () => {
      const state = reportsReducer(
        openedWithSnapshot(),
        ticksApplied({
          reportId: 'fx-spot',
          updates: [{ id: 'missing-row', changes: { price: 1 } }],
          asOf: '2026-08-06T10:00:05Z',
        })
      );
      expect(state.byId['fx-spot'].rows).toEqual(rows);
    });

    it('is a no-op for unopened reports', () => {
      const state = reportsReducer(
        initialState,
        ticksApplied({ reportId: 'ghost', updates: [], asOf: 'x' })
      );
      expect(state.byId).toEqual({});
    });

    it('handles an empty updates array without stamping anything', () => {
      const state = reportsReducer(
        openedWithSnapshot(),
        ticksApplied({ reportId: 'fx-spot', updates: [], asOf: '2026-08-06T10:00:05Z' })
      );
      for (const row of state.byId['fx-spot'].rows) {
        expect(row[LAST_TICK_FIELD]).toBeUndefined();
      }
    });
  });

  describe('loadingStarted / loadFailed', () => {
    it('loadingStarted sets loading and clears a prior error', () => {
      let state = reportsReducer(
        initialState,
        reportOpened({ reportId: 'etfs', transport: 'rest' })
      );
      state = reportsReducer(state, loadFailed({ reportId: 'etfs', error: 'old' }));
      state = reportsReducer(state, loadingStarted({ reportId: 'etfs' }));
      expect(state.byId.etfs.loading).toBe(true);
      expect(state.byId.etfs.error).toBeNull();
    });

    it('loadFailed clears loading and records the error message', () => {
      let state = reportsReducer(
        initialState,
        reportOpened({ reportId: 'etfs', transport: 'rest' })
      );
      state = reportsReducer(state, loadingStarted({ reportId: 'etfs' }));
      state = reportsReducer(
        state,
        loadFailed({ reportId: 'etfs', error: 'Unknown report: etfs' })
      );
      expect(state.byId.etfs.loading).toBe(false);
      expect(state.byId.etfs.error).toBe('Unknown report: etfs');
    });

    it('both are no-ops for unopened reports', () => {
      expect(
        reportsReducer(initialState, loadingStarted({ reportId: 'ghost' })).byId
      ).toEqual({});
      expect(
        reportsReducer(initialState, loadFailed({ reportId: 'ghost', error: 'x' })).byId
      ).toEqual({});
    });
  });

  describe('pauseToggled', () => {
    it('toggles paused on and back off', () => {
      let state = reportsReducer(
        initialState,
        reportOpened({ reportId: 'fx-spot', transport: 'ws' })
      );
      state = reportsReducer(state, pauseToggled({ reportId: 'fx-spot' }));
      expect(state.byId['fx-spot'].paused).toBe(true);
      state = reportsReducer(state, pauseToggled({ reportId: 'fx-spot' }));
      expect(state.byId['fx-spot'].paused).toBe(false);
    });

    it('is a no-op for unopened reports', () => {
      expect(
        reportsReducer(initialState, pauseToggled({ reportId: 'ghost' })).byId
      ).toEqual({});
    });
  });

  describe('modeChanged', () => {
    it('switches to eod mode', () => {
      let state = reportsReducer(
        initialState,
        reportOpened({ reportId: 'etfs', transport: 'rest' })
      );
      state = reportsReducer(state, modeChanged({ reportId: 'etfs', mode: 'eod' }));
      expect(state.byId.etfs.mode).toBe('eod');
    });

    it('switching back to live clears the eodDate', () => {
      let state = reportsReducer(
        initialState,
        reportOpened({ reportId: 'etfs', transport: 'rest' })
      );
      state = reportsReducer(state, modeChanged({ reportId: 'etfs', mode: 'eod' }));
      state = reportsReducer(
        state,
        eodDateSelected({ reportId: 'etfs', date: '2026-08-05' })
      );
      state = reportsReducer(state, modeChanged({ reportId: 'etfs', mode: 'live' }));
      expect(state.byId.etfs.mode).toBe('live');
      expect(state.byId.etfs.eodDate).toBeNull();
    });

    it('is a no-op for unopened reports', () => {
      expect(
        reportsReducer(initialState, modeChanged({ reportId: 'ghost', mode: 'eod' })).byId
      ).toEqual({});
    });
  });

  describe('eodDateSelected', () => {
    it('stores the selected date', () => {
      let state = reportsReducer(
        initialState,
        reportOpened({ reportId: 'etfs', transport: 'rest' })
      );
      state = reportsReducer(
        state,
        eodDateSelected({ reportId: 'etfs', date: '2026-08-04' })
      );
      expect(state.byId.etfs.eodDate).toBe('2026-08-04');
    });

    it('accepts null to clear the date', () => {
      let state = reportsReducer(
        initialState,
        reportOpened({ reportId: 'etfs', transport: 'rest' })
      );
      state = reportsReducer(
        state,
        eodDateSelected({ reportId: 'etfs', date: '2026-08-04' })
      );
      state = reportsReducer(state, eodDateSelected({ reportId: 'etfs', date: null }));
      expect(state.byId.etfs.eodDate).toBeNull();
    });

    it('is a no-op for unopened reports', () => {
      expect(
        reportsReducer(
          initialState,
          eodDateSelected({ reportId: 'ghost', date: '2026-08-04' })
        ).byId
      ).toEqual({});
    });
  });

  describe('connectionStatusChanged', () => {
    it('records each status transition', () => {
      let state = reportsReducer(
        initialState,
        reportOpened({ reportId: 'fx-spot', transport: 'ws' })
      );
      for (const status of ['connecting', 'open', 'closed', 'error', 'idle'] as const) {
        state = reportsReducer(
          state,
          connectionStatusChanged({ reportId: 'fx-spot', status })
        );
        expect(state.byId['fx-spot'].connectionStatus).toBe(status);
      }
    });

    it('is a no-op for unopened reports', () => {
      expect(
        reportsReducer(
          initialState,
          connectionStatusChanged({ reportId: 'ghost', status: 'open' })
        ).byId
      ).toEqual({});
    });
  });

  it('createInitialReportState matches the contract ReportState defaults', () => {
    expect(createInitialReportState('x', 'rest')).toEqual({
      reportId: 'x',
      transport: 'rest',
      columns: [],
      rows: [],
      loading: false,
      error: null,
      mode: 'live',
      paused: false,
      eodDate: null,
      asOf: null,
      connectionStatus: 'idle',
    });
  });

  it('does not mutate the previous state (immer draft safety)', () => {
    const before = openedWithSnapshot();
    const snapshot = JSON.parse(JSON.stringify(before));
    reportsReducer(
      before,
      ticksApplied({
        reportId: 'fx-spot',
        updates: [{ id: 'r1', changes: { price: 9 } }],
        asOf: 'later',
      })
    );
    reportsReducer(before, pauseToggled({ reportId: 'fx-spot' }));
    expect(before).toEqual(snapshot);
  });
});
