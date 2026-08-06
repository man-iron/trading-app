import { createSelector } from '@reduxjs/toolkit';
import type { ReportState } from '../../types';

/**
 * Root-state shape the reports selectors depend on. Kept structural so the
 * selectors work with both the real RootState and minimal test states.
 */
interface WithReports {
  reports: { byId: Record<string, ReportState> };
}

/** The full byId map of open reports. */
export const selectReportsById = (state: WithReports) => state.reports.byId;

/** Report state for a given id, or undefined when not opened. */
export const selectReportById = (
  state: WithReports,
  reportId: string
): ReportState | undefined => state.reports.byId[reportId];

/**
 * Factory returning a memoized selector for one report's state.
 * Use one instance per component to keep memoization effective.
 */
export const makeSelectReportById = (reportId: string) =>
  createSelector(
    [selectReportsById],
    (byId): ReportState | undefined => byId[reportId]
  );

/** Ids of all currently opened reports. */
export const selectOpenReportIds = createSelector([selectReportsById], (byId) =>
  Object.keys(byId)
);

/** True when the given report is paused (WS reports only). */
export const selectIsReportPaused = (
  state: WithReports,
  reportId: string
): boolean => Boolean(state.reports.byId[reportId]?.paused);

/** Connection status for the given report ('idle' when not opened). */
export const selectReportConnectionStatus = (
  state: WithReports,
  reportId: string
): ReportState['connectionStatus'] =>
  state.reports.byId[reportId]?.connectionStatus ?? 'idle';
