import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
  ColumnDef,
  ReportMode,
  ReportRow,
  ReportState,
  Transport,
  WsTickUpdate,
} from '../../types';
import {
  CONNECTION_STATUSES,
  LAST_TICK_FIELD,
  REPORT_MODES,
  type ConnectionStatus,
} from '../../constants/reportConstants';

export interface ReportsState {
  byId: Record<string, ReportState>;
}

export const initialState: ReportsState = {
  byId: {},
};

/** Builds a fresh ReportState entry for a newly opened report. */
export const createInitialReportState = (
  reportId: string,
  transport: Transport
): ReportState => ({
  reportId,
  transport,
  columns: [],
  rows: [],
  loading: false,
  error: null,
  mode: REPORT_MODES.LIVE,
  paused: false,
  eodDate: null,
  asOf: null,
  connectionStatus: CONNECTION_STATUSES.IDLE,
});

const reportsSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    /** Creates a report entry if it does not already exist. */
    reportOpened(
      state,
      action: PayloadAction<{ reportId: string; transport: Transport }>
    ) {
      const { reportId, transport } = action.payload;
      if (!state.byId[reportId]) {
        state.byId[reportId] = createInitialReportState(reportId, transport);
      }
    },

    /** Replaces columns/rows with a full snapshot (WS snapshot or REST fetch). */
    snapshotReceived(
      state,
      action: PayloadAction<{
        reportId: string;
        columns: ColumnDef[];
        rows: ReportRow[];
        asOf: string;
      }>
    ) {
      const report = state.byId[action.payload.reportId];
      if (!report) return;
      report.columns = action.payload.columns;
      report.rows = action.payload.rows;
      report.asOf = action.payload.asOf;
      report.loading = false;
      report.error = null;
    },

    /**
     * Merges tick changes into matching rows by id and stamps a `_lastTick`
     * timestamp on every changed row (drives the cell flash animation).
     */
    ticksApplied(
      state,
      action: PayloadAction<{
        reportId: string;
        updates: WsTickUpdate[];
        asOf: string;
      }>
    ) {
      const report = state.byId[action.payload.reportId];
      if (!report) return;
      const now = Date.now();
      const updatesById = new Map(
        action.payload.updates.map((update) => [update.id, update.changes])
      );
      report.rows = report.rows.map((row) => {
        const changes = updatesById.get(row.id);
        if (!changes) return row;
        return { ...row, ...changes, [LAST_TICK_FIELD]: now };
      });
      report.asOf = action.payload.asOf;
    },

    /** Marks a report as loading (REST fetch started). */
    loadingStarted(state, action: PayloadAction<{ reportId: string }>) {
      const report = state.byId[action.payload.reportId];
      if (!report) return;
      report.loading = true;
      report.error = null;
    },

    /** Records a load failure for a report. */
    loadFailed(
      state,
      action: PayloadAction<{ reportId: string; error: string }>
    ) {
      const report = state.byId[action.payload.reportId];
      if (!report) return;
      report.loading = false;
      report.error = action.payload.error;
    },

    /** Toggles client-side pause for a WS report. */
    pauseToggled(state, action: PayloadAction<{ reportId: string }>) {
      const report = state.byId[action.payload.reportId];
      if (!report) return;
      report.paused = !report.paused;
    },

    /** Switches a REST report between 'live' and 'eod' mode. */
    modeChanged(
      state,
      action: PayloadAction<{ reportId: string; mode: ReportMode }>
    ) {
      const report = state.byId[action.payload.reportId];
      if (!report) return;
      report.mode = action.payload.mode;
      if (action.payload.mode === REPORT_MODES.LIVE) {
        report.eodDate = null;
      }
    },

    /** Selects an EOD date ('YYYY-MM-DD') for a REST report. */
    eodDateSelected(
      state,
      action: PayloadAction<{ reportId: string; date: string | null }>
    ) {
      const report = state.byId[action.payload.reportId];
      if (!report) return;
      report.eodDate = action.payload.date;
    },

    /** Records WebSocket connection status for a WS report. */
    connectionStatusChanged(
      state,
      action: PayloadAction<{ reportId: string; status: ConnectionStatus }>
    ) {
      const report = state.byId[action.payload.reportId];
      if (!report) return;
      report.connectionStatus = action.payload.status;
    },
  },
});

export const {
  reportOpened,
  snapshotReceived,
  ticksApplied,
  loadingStarted,
  loadFailed,
  pauseToggled,
  modeChanged,
  eodDateSelected,
  connectionStatusChanged,
} = reportsSlice.actions;

export default reportsSlice.reducer;
