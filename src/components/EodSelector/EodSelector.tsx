/**
 * EodSelector — MUI Select for choosing the REST report data vintage:
 * either the "Current" live REST snapshot or one of the available
 * end-of-day dates (rendered via `formatEodDateLabel`).
 *
 * Purely presentational: reports the choice through `onChange` as a
 * `{ mode, date }` payload the container maps onto slice actions.
 */
import React from 'react';
import { createUseStyles } from 'react-jss';
import MenuItem from '@mui/material/MenuItem';
import Select, { type SelectChangeEvent } from '@mui/material/Select';

import type { ReportMode } from '../../types';
import { formatEodDateLabel } from '../../helpers/formatHelpers';
import {
  EOD_CURRENT,
  EOD_CURRENT_LABEL,
  REPORT_MODES,
} from '../../constants/reportConstants';
import styles from '../../styles/components/EodSelector.styles';

const useStyles = createUseStyles(styles);

export interface EodSelectorChange {
  /** 'live' for the Current option, 'eod' for a concrete date. */
  mode: ReportMode;
  /** 'YYYY-MM-DD' when mode is 'eod', null for Current. */
  date: string | null;
}

export interface EodSelectorProps {
  /** Available EOD dates ('YYYY-MM-DD'), newest first. */
  eodDates: string[];
  /** Current report mode. */
  mode: ReportMode;
  /** Selected EOD date, or null when in live mode. */
  eodDate: string | null;
  /** Called with the new mode/date when the user picks an option. */
  onChange: (change: EodSelectorChange) => void;
}

const EodSelector: React.FC<EodSelectorProps> = ({
  eodDates,
  mode,
  eodDate,
  onChange,
}) => {
  const classes = useStyles();

  const value =
    mode === REPORT_MODES.EOD && eodDate !== null ? eodDate : EOD_CURRENT;

  const handleChange = (event: SelectChangeEvent<string>) => {
    const selected = event.target.value;
    if (selected === EOD_CURRENT) {
      onChange({ mode: REPORT_MODES.LIVE, date: null });
    } else {
      onChange({ mode: REPORT_MODES.EOD, date: selected });
    }
  };

  return (
    <Select<string>
      className={`${classes.root} ${classes.select}`}
      value={value}
      onChange={handleChange}
      size="small"
      inputProps={{ 'aria-label': 'Report date' }}
      data-testid="eod-selector"
    >
      <MenuItem
        value={EOD_CURRENT}
        className={`${classes.menuItem} ${classes.currentItem}`}
      >
        {EOD_CURRENT_LABEL}
      </MenuItem>
      {eodDates.map((date) => (
        <MenuItem key={date} value={date} className={classes.menuItem}>
          {formatEodDateLabel(date)}
        </MenuItem>
      ))}
    </Select>
  );
};

export default EodSelector;
