/**
 * ReportTable — dumb, presentational data grid for report rows.
 *
 * Receives `columns` + `rows` and keeps sorting and per-column filtering as
 * purely LOCAL state (`SortState` / `FilterState`), piping the rows through
 * `filterRows` then `sortRows` from `src/helpers/tableHelpers`. Cells are
 * formatted with `formatCell`; pct cells are colored by sign and cells of rows
 * with a recent `_lastTick` stamp play the amber flash animation.
 */
import React, { useMemo, useState } from 'react';
import { createUseStyles } from 'react-jss';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import TextField from '@mui/material/TextField';

import type {
  ColumnDef,
  ColumnType,
  FilterState,
  ReportRow,
  SortState,
} from '../../types';
import { filterRows, nextSortState, sortRows } from '../../helpers/tableHelpers';
import { formatCell } from '../../helpers/formatHelpers';
import { LAST_TICK_FIELD } from '../../constants/reportConstants';
import styles from '../../styles/components/ReportTable.styles';

const useStyles = createUseStyles(styles);

/** How long after a row's `_lastTick` stamp its cells keep the flash class. */
export const FLASH_WINDOW_MS = 1200;

/** Column types rendered right-aligned with tabular numerals. */
const NUMERIC_TYPES: ReadonlySet<ColumnType> = new Set([
  'number',
  'price',
  'pct',
  'timestamp',
]);

/** Default message shown when no rows survive filtering (or none exist). */
const DEFAULT_EMPTY_MESSAGE = 'No rows to display';

export interface ReportTableProps {
  /** Column definitions in display order. */
  columns: ColumnDef[];
  /** Raw report rows (unsorted, unfiltered). */
  rows: ReportRow[];
  /** Message shown when zero rows are visible. */
  emptyMessage?: string;
}

/** True when the column should be right-aligned. */
function isRightAligned(column: ColumnDef): boolean {
  if (column.align) return column.align === 'right';
  return NUMERIC_TYPES.has(column.type);
}

/** True when the row was ticked within the flash window before `now`. */
function isRecentlyTicked(row: ReportRow, now: number): boolean {
  const lastTick = row[LAST_TICK_FIELD];
  return (
    typeof lastTick === 'number' &&
    now - lastTick >= 0 &&
    now - lastTick < FLASH_WINDOW_MS
  );
}

/** Sign-based class for pct cells; zero stays neutral. */
function pctClass(
  value: string | number | undefined,
  classes: { pctUp: string; pctDown: string }
): string | null {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric === 0) return null;
  return numeric > 0 ? classes.pctUp : classes.pctDown;
}

const ReportTable: React.FC<ReportTableProps> = ({
  columns,
  rows,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
}) => {
  const classes = useStyles();

  const [sort, setSort] = useState<SortState>({ columnKey: null, direction: 'asc' });
  const [filters, setFilters] = useState<FilterState>({});

  // Derived rows: filter first, then sort — both memoized.
  const filteredRows = useMemo(
    () => filterRows(rows, filters, columns),
    [rows, filters, columns]
  );
  const visibleRows = useMemo(
    () => sortRows(filteredRows, sort, columns),
    [filteredRows, sort, columns]
  );

  const now = Date.now();

  const handleSortClick = (columnKey: string) => {
    setSort((current) => nextSortState(current, columnKey));
  };

  const handleFilterChange = (columnKey: string, text: string) => {
    setFilters((current) => ({ ...current, [columnKey]: text }));
  };

  return (
    <div className={classes.root} data-testid="report-table">
      <div className={classes.scroller}>
        <Table stickyHeader size="small" aria-label="report table">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  className={classes.headerCell}
                  align={isRightAligned(column) ? 'right' : 'left'}
                  sortDirection={sort.columnKey === column.key ? sort.direction : false}
                >
                  <TableSortLabel
                    active={sort.columnKey === column.key}
                    direction={sort.columnKey === column.key ? sort.direction : 'asc'}
                    onClick={() => handleSortClick(column.key)}
                  >
                    {column.label}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column.key} className={classes.filterCell}>
                  <TextField
                    className={classes.filterInput}
                    variant="standard"
                    size="small"
                    placeholder="Filter"
                    value={filters[column.key] ?? ''}
                    onChange={(event) =>
                      handleFilterChange(column.key, event.target.value)
                    }
                    inputProps={{ 'aria-label': `Filter ${column.label}` }}
                  />
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.length === 0 ? (
              <TableRow>
                <TableCell
                  className={classes.emptyCell}
                  colSpan={Math.max(columns.length, 1)}
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              visibleRows.map((row) => {
                const flashing = isRecentlyTicked(row, now);
                return (
                  <TableRow key={row.id} className={classes.row} hover>
                    {columns.map((column) => {
                      const value = row[column.key];
                      const cellClasses = [classes.cell];
                      if (isRightAligned(column)) cellClasses.push(classes.numericCell);
                      if (column.type === 'pct') {
                        const signClass = pctClass(value, classes);
                        if (signClass) cellClasses.push(signClass);
                      }
                      if (flashing) cellClasses.push(classes.flashCell);
                      return (
                        <TableCell
                          key={column.key}
                          className={cellClasses.join(' ')}
                          align={isRightAligned(column) ? 'right' : 'left'}
                        >
                          {formatCell(value, column.type)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <div className={classes.footer} data-testid="report-table-footer">
        {`${visibleRows.length} of ${rows.length} rows`}
      </div>
    </div>
  );
};

export default ReportTable;
