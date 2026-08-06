/**
 * useReportData — REST fetch lifecycle for a report.
 *
 * Given `(reportId, mode, eodDate)` it:
 *  1. dispatches `loadingStarted`,
 *  2. fetches `getReport` (live mode) or `getEodReport` (eod mode + date),
 *  3. dispatches `snapshotReceived` on success or `loadFailed` on error.
 *
 * Refetches whenever the report id, mode or eod date changes. Responses that
 * resolve after their triggering effect was cleaned up (report/mode/date
 * changed or component unmounted) are ignored — the stale-response guard —
 * so an out-of-order resolution can never clobber fresher data.
 *
 * In eod mode with no date selected yet, nothing is fetched (the report
 * waits for the user to pick a date).
 */
import { useCallback, useEffect, useState } from 'react';

import type { ReportMode, ReportPayload } from '../types';
import { getEodReport, getReport } from '../api/restClient';
import { useAppDispatch } from '../store';
import {
  loadFailed,
  loadingStarted,
  snapshotReceived,
} from '../store/reports/reportsSlice';
import { REPORT_MODES } from '../constants/reportConstants';

export interface UseReportDataResult {
  /** Re-runs the current fetch (e.g. from an error-state Retry button). */
  refetch: () => void;
}

/** Normalize any thrown value to a display string. */
function toErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return String(err ?? 'Unknown error');
}

export function useReportData(
  reportId: string,
  mode: ReportMode,
  eodDate: string | null
): UseReportDataResult {
  const dispatch = useAppDispatch();
  // Bumping the nonce re-runs the fetch effect with identical inputs.
  const [fetchNonce, setFetchNonce] = useState(0);

  useEffect(() => {
    // EOD mode without a chosen date: nothing to fetch yet.
    if (mode === REPORT_MODES.EOD && eodDate === null) {
      return undefined;
    }

    // Stale-response guard: flips when this effect is cleaned up because the
    // inputs changed (or the component unmounted); late resolutions are dropped.
    let cancelled = false;

    dispatch(loadingStarted({ reportId }));

    const request: Promise<ReportPayload> =
      mode === REPORT_MODES.EOD && eodDate !== null
        ? getEodReport(reportId, eodDate)
        : getReport(reportId);

    request
      .then((payload) => {
        if (cancelled) return;
        dispatch(
          snapshotReceived({
            reportId,
            columns: payload.columns,
            rows: payload.rows,
            asOf: payload.asOf,
          })
        );
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        dispatch(loadFailed({ reportId, error: toErrorMessage(err) }));
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch, reportId, mode, eodDate, fetchNonce]);

  const refetch = useCallback(() => {
    setFetchNonce((nonce) => nonce + 1);
  }, []);

  return { refetch };
}

export default useReportData;
