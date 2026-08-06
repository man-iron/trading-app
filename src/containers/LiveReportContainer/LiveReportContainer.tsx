/**
 * `LiveReportContainer` — Redux-connected container for a live (WebSocket)
 * report. Modern functional TS side of the deliberately mixed paradigm split.
 *
 * Responsibilities:
 * - Reads the report's `ReportState` from the `reports` slice.
 * - Drives the WebSocket subscription + pause buffering via `useWebSocket`.
 * - Renders the panel header (report label from the menu tree, ticking as-of
 *   clock, `LiveControls` wired to the `pauseToggled` action).
 * - Renders `ReportTable` once data has arrived, an MUI Skeleton stack while
 *   connecting/waiting for the first snapshot, and an MUI Alert on error.
 */
import React, { useCallback, useEffect, useMemo } from 'react';
import { createUseStyles } from 'react-jss';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';

import ReportTable from '../../components/ReportTable';
import LiveControls from '../../components/LiveControls';
import useWebSocket, { type LiveWsClient } from '../../hooks/useWebSocket';
import { useAppDispatch, useAppSelector } from '../../store';
import { makeSelectReportById } from '../../store/reports/selectors';
import { pauseToggled, reportOpened } from '../../store/reports/reportsSlice';
import { selectMenuItems } from '../../store/menu/selectors';
import { findNodeById } from '../../helpers/menuHelpers';
import { formatCell } from '../../helpers/formatHelpers';
import { CONNECTION_STATUSES, TRANSPORTS } from '../../constants/reportConstants';
import styles from '../../styles/components/LiveReportContainer.styles';
import type { MenuNode } from '../../types';

const useStyles = createUseStyles(styles);

/** Number of placeholder rows in the connecting skeleton. */
const SKELETON_ROW_COUNT = 8;

export interface LiveReportContainerProps {
  /** Id of the live report to render (a `transport: 'ws'` menu node). */
  reportId: string;
  /**
   * Test seam: inject a fake WebSocket client. Omit in production to use the
   * shared module-level `WsClient` instance.
   */
  wsClient?: LiveWsClient;
}

/**
 * Container for one live WS report: header + controls + streaming table.
 */
export function LiveReportContainer({
  reportId,
  wsClient,
}: LiveReportContainerProps): React.ReactElement | null {
  const classes = useStyles();
  const dispatch = useAppDispatch();

  const selectReport = useMemo(() => makeSelectReportById(reportId), [reportId]);
  const report = useAppSelector(selectReport);
  const menuItems = useAppSelector(selectMenuItems) as MenuNode[];

  const paused = report?.paused ?? false;

  // Ensure the reports.byId entry exists even when this report was selected
  // outside the menu-click flow (e.g. the user's defaultReportId from init).
  // Idempotent: the slice only creates the entry if missing. Declared before
  // useWebSocket so the entry exists by the time the first snapshot lands.
  useEffect(() => {
    dispatch(reportOpened({ reportId, transport: TRANSPORTS.WS }));
  }, [dispatch, reportId]);

  // Subscribe for the lifetime of this container; pause toggles buffer ticks
  // client-side without re-subscribing. Passing `undefined` for wsClient
  // falls through to the shared module-level client.
  useWebSocket(reportId, paused, wsClient);

  const handleTogglePause = useCallback(() => {
    dispatch(pauseToggled({ reportId }));
  }, [dispatch, reportId]);

  if (!report) {
    // Not opened yet (reportOpened is dispatched by the menu flow); nothing
    // sensible to render.
    return null;
  }

  const label =
    (findNodeById(menuItems, reportId) as MenuNode | null)?.label ?? reportId;
  // A snapshot has arrived once columns exist (rows may legitimately be empty).
  const hasData = report.columns.length > 0;
  const showSkeleton =
    !hasData &&
    !report.error &&
    (report.connectionStatus === CONNECTION_STATUSES.CONNECTING ||
      report.connectionStatus === CONNECTION_STATUSES.IDLE ||
      report.connectionStatus === CONNECTION_STATUSES.OPEN);

  return (
    <section className={classes.root} aria-label={`${label} live report`}>
      <header className={classes.header}>
        <h2 className={classes.title}>{label}</h2>
        {report.asOf !== null && (
          <span className={classes.asOf} data-testid="live-as-of">
            as of {formatCell(report.asOf, 'timestamp')}
          </span>
        )}
        <div className={classes.spacer} />
        <LiveControls
          paused={report.paused}
          connectionStatus={report.connectionStatus}
          onTogglePause={handleTogglePause}
        />
      </header>

      {report.error !== null && (
        <Alert severity="error" className={classes.alert}>
          {report.error}
        </Alert>
      )}

      <div className={classes.body}>
        {showSkeleton ? (
          <div className={classes.skeletonWrap} data-testid="live-skeleton">
            <Skeleton variant="rectangular" height={28} />
            {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
              <Skeleton key={index} variant="rectangular" height={20} />
            ))}
          </div>
        ) : (
          hasData && <ReportTable columns={report.columns} rows={report.rows} />
        )}
      </div>
    </section>
  );
}

export default LiveReportContainer;
