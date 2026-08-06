/**
 * ReportContainer — Redux-connected panel for a REST report.
 *
 * Reads the report's `ReportState` via `makeSelectReportById`, drives the
 * REST fetch lifecycle with `useReportData`, and renders:
 *  - a panel header: report label (from the menu tree), as-of stamp and the
 *    `EodSelector` (wired to `modeChanged` / `eodDateSelected`),
 *  - a `LinearProgress` while loading,
 *  - an error `Alert` with a Retry action on failure,
 *  - the presentational `ReportTable`.
 */
import React, { useCallback, useEffect, useMemo } from 'react';
import { createUseStyles } from 'react-jss';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';

import { useAppDispatch, useAppSelector } from '../../store';
import { makeSelectReportById } from '../../store/reports/selectors';
import {
  eodDateSelected,
  modeChanged,
  reportOpened,
} from '../../store/reports/reportsSlice';
import { selectEodDates } from '../../store/app/selectors';
import { findNodeById } from '../../helpers/menuHelpers';
import { formatCell, formatEodDateLabel } from '../../helpers/formatHelpers';
import { REPORT_MODES, TRANSPORTS } from '../../constants/reportConstants';
import { useReportData } from '../../hooks/useReportData';
import ReportTable from '../../components/ReportTable';
import EodSelector, {
  type EodSelectorChange,
} from '../../components/EodSelector';
import type { MenuNode, ReportMode } from '../../types';
import styles from '../../styles/components/ReportContainer.styles';

const useStyles = createUseStyles(styles);

export interface ReportContainerProps {
  /** Id of the REST report to display (e.g. 'fx-forwards'). */
  reportId: string;
}

const ReportContainer: React.FC<ReportContainerProps> = ({ reportId }) => {
  const classes = useStyles();
  const dispatch = useAppDispatch();

  // One memoized selector instance per reportId keeps memoization effective.
  const selectReport = useMemo(() => makeSelectReportById(reportId), [reportId]);
  const report = useAppSelector(selectReport);
  const eodDates = useAppSelector(selectEodDates) as string[];
  const menuItems = useAppSelector((state) => state.menu.items);

  // Defensive open: idempotent — creates the entry only when missing, so the
  // container also works standalone (tests, Storybook). Registered before
  // useReportData so its effect runs first.
  useEffect(() => {
    dispatch(reportOpened({ reportId, transport: TRANSPORTS.REST }));
  }, [dispatch, reportId]);

  const mode: ReportMode = report?.mode ?? REPORT_MODES.LIVE;
  const eodDate = report?.eodDate ?? null;

  const { refetch } = useReportData(reportId, mode, eodDate);

  const handleEodChange = useCallback(
    (change: EodSelectorChange) => {
      dispatch(modeChanged({ reportId, mode: change.mode }));
      if (change.mode === REPORT_MODES.EOD && change.date !== null) {
        dispatch(eodDateSelected({ reportId, date: change.date }));
      }
    },
    [dispatch, reportId]
  );

  const label = useMemo(() => {
    const node = findNodeById(menuItems, reportId) as MenuNode | null;
    return node?.label ?? reportId;
  }, [menuItems, reportId]);

  if (!report) {
    // First render before the defensive `reportOpened` effect has run.
    return null;
  }

  const asOfLabel =
    mode === REPORT_MODES.EOD && eodDate !== null
      ? `As of ${formatEodDateLabel(eodDate)} (EOD)`
      : report.asOf !== null
        ? `As of ${formatCell(report.asOf, 'timestamp')}`
        : null;

  return (
    <section className={classes.root} aria-label={`${label} report`}>
      <header className={classes.header}>
        <h2 className={classes.title}>{label}</h2>
        {asOfLabel !== null && <span className={classes.asOf}>{asOfLabel}</span>}
        <div className={classes.spacer} />
        <EodSelector
          eodDates={eodDates}
          mode={mode}
          eodDate={eodDate}
          onChange={handleEodChange}
        />
      </header>

      <div className={classes.progressSlot}>
        {report.loading && <LinearProgress color="primary" />}
      </div>

      {report.error !== null && (
        <Alert
          severity="error"
          className={classes.errorAlert}
          action={
            <Button color="inherit" size="small" onClick={refetch}>
              Retry
            </Button>
          }
        >
          {report.error}
        </Alert>
      )}

      <div className={classes.body}>
        <ReportTable columns={report.columns} rows={report.rows} />
      </div>
    </section>
  );
};

export default ReportContainer;
