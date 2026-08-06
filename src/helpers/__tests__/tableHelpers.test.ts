import { describe, it, expect } from 'vitest';
import { sortRows, filterRows, nextSortState } from '../tableHelpers';
import type { ColumnDef, ReportRow, SortState } from '../../types';

const columns: ColumnDef[] = [
  { key: 'symbol', label: 'Symbol', type: 'string', align: 'left' },
  { key: 'qty', label: 'Qty', type: 'number', align: 'right' },
  { key: 'px', label: 'Price', type: 'price', align: 'right' },
  { key: 'chg', label: 'Chg %', type: 'pct', align: 'right' },
  { key: 'ts', label: 'Updated', type: 'timestamp', align: 'right' },
];

const rows: ReportRow[] = [
  { id: 'r1', symbol: 'gbpusd', qty: 500, px: 1.2731, chg: -0.34, ts: '2026-08-06T09:30:05.000Z' },
  { id: 'r2', symbol: 'EURUSD', qty: 1000, px: 1.0852, chg: 0.12, ts: '2026-08-06T09:30:01.000Z' },
  { id: 'r3', symbol: 'USDJPY', qty: 750, px: 148.02, chg: 0.05, ts: '2026-08-06T09:30:03.000Z' },
  { id: 'r4', symbol: 'AUDUSD', qty: 750, px: 0.6543, chg: -1.2, ts: '2026-08-06T09:29:59.000Z' },
];

const ids = (list: ReportRow[]) => list.map((r) => r.id);

describe('sortRows', () => {
  it('returns rows in original order when no sort column is active', () => {
    const result = sortRows(rows, { columnKey: null, direction: 'asc' }, columns);
    expect(ids(result)).toEqual(['r1', 'r2', 'r3', 'r4']);
  });

  it('returns a new array (does not mutate input) even when unsorted', () => {
    const result = sortRows(rows, { columnKey: null, direction: 'asc' }, columns);
    expect(result).not.toBe(rows);
  });

  it('returns original order for an unknown column key', () => {
    const result = sortRows(rows, { columnKey: 'nope', direction: 'desc' }, columns);
    expect(ids(result)).toEqual(['r1', 'r2', 'r3', 'r4']);
  });

  it('sorts string columns with locale comparison, case-insensitively', () => {
    const result = sortRows(rows, { columnKey: 'symbol', direction: 'asc' }, columns);
    expect(result.map((r) => r.symbol)).toEqual(['AUDUSD', 'EURUSD', 'gbpusd', 'USDJPY']);
  });

  it('sorts string columns descending', () => {
    const result = sortRows(rows, { columnKey: 'symbol', direction: 'desc' }, columns);
    expect(result.map((r) => r.symbol)).toEqual(['USDJPY', 'gbpusd', 'EURUSD', 'AUDUSD']);
  });

  it('sorts number columns numerically ascending', () => {
    const result = sortRows(rows, { columnKey: 'qty', direction: 'asc' }, columns);
    expect(result.map((r) => r.qty)).toEqual([500, 750, 750, 1000]);
  });

  it('sorts number columns numerically, not lexically', () => {
    const numeric: ReportRow[] = [
      { id: 'a', symbol: 'A', qty: 9, px: 0, chg: 0, ts: 0 },
      { id: 'b', symbol: 'B', qty: 100, px: 0, chg: 0, ts: 0 },
      { id: 'c', symbol: 'C', qty: 20, px: 0, chg: 0, ts: 0 },
    ];
    const result = sortRows(numeric, { columnKey: 'qty', direction: 'asc' }, columns);
    expect(result.map((r) => r.qty)).toEqual([9, 20, 100]);
  });

  it('sorts price columns numerically descending', () => {
    const result = sortRows(rows, { columnKey: 'px', direction: 'desc' }, columns);
    expect(result.map((r) => r.px)).toEqual([148.02, 1.2731, 1.0852, 0.6543]);
  });

  it('sorts pct columns numerically with negatives first ascending', () => {
    const result = sortRows(rows, { columnKey: 'chg', direction: 'asc' }, columns);
    expect(result.map((r) => r.chg)).toEqual([-1.2, -0.34, 0.05, 0.12]);
  });

  it('sorts timestamp columns chronologically (ISO strings)', () => {
    const result = sortRows(rows, { columnKey: 'ts', direction: 'asc' }, columns);
    expect(ids(result)).toEqual(['r4', 'r2', 'r3', 'r1']);
  });

  it('sorts timestamp columns given epoch millisecond numbers', () => {
    const epochRows: ReportRow[] = [
      { id: 'a', symbol: 'A', qty: 0, px: 0, chg: 0, ts: 3000 },
      { id: 'b', symbol: 'B', qty: 0, px: 0, chg: 0, ts: 1000 },
      { id: 'c', symbol: 'C', qty: 0, px: 0, chg: 0, ts: 2000 },
    ];
    const result = sortRows(epochRows, { columnKey: 'ts', direction: 'asc' }, columns);
    expect(ids(result)).toEqual(['b', 'c', 'a']);
  });

  it('accepts numeric values encoded as strings in numeric columns', () => {
    const mixed: ReportRow[] = [
      { id: 'a', symbol: 'A', qty: '30', px: 0, chg: 0, ts: 0 },
      { id: 'b', symbol: 'B', qty: 4, px: 0, chg: 0, ts: 0 },
      { id: 'c', symbol: 'C', qty: '200', px: 0, chg: 0, ts: 0 },
    ];
    const result = sortRows(mixed, { columnKey: 'qty', direction: 'asc' }, columns);
    expect(ids(result)).toEqual(['b', 'a', 'c']);
  });

  it('is stable: equal keys preserve original relative order (asc and desc)', () => {
    const asc = sortRows(rows, { columnKey: 'qty', direction: 'asc' }, columns);
    // r3 (qty 750) appears before r4 (qty 750) in the source array.
    expect(ids(asc)).toEqual(['r1', 'r3', 'r4', 'r2']);
    const desc = sortRows(rows, { columnKey: 'qty', direction: 'desc' }, columns);
    expect(ids(desc)).toEqual(['r2', 'r3', 'r4', 'r1']);
  });

  it('pushes non-numeric values to the end in numeric sorts', () => {
    const dirty: ReportRow[] = [
      { id: 'a', symbol: 'A', qty: 'n/a', px: 0, chg: 0, ts: 0 },
      { id: 'b', symbol: 'B', qty: 5, px: 0, chg: 0, ts: 0 },
      { id: 'c', symbol: 'C', qty: 1, px: 0, chg: 0, ts: 0 },
    ];
    const result = sortRows(dirty, { columnKey: 'qty', direction: 'asc' }, columns);
    expect(ids(result)).toEqual(['c', 'b', 'a']);
  });

  it('does not mutate the input rows array', () => {
    const before = ids(rows);
    sortRows(rows, { columnKey: 'symbol', direction: 'desc' }, columns);
    expect(ids(rows)).toEqual(before);
  });

  it('handles empty row arrays', () => {
    expect(sortRows([], { columnKey: 'symbol', direction: 'asc' }, columns)).toEqual([]);
  });
});

describe('filterRows', () => {
  it('returns all rows for an empty filter object', () => {
    expect(ids(filterRows(rows, {}, columns))).toEqual(['r1', 'r2', 'r3', 'r4']);
  });

  it('returns a new array even when no filters are active', () => {
    const result = filterRows(rows, {}, columns);
    expect(result).not.toBe(rows);
  });

  it('ignores empty and whitespace-only filter values', () => {
    const result = filterRows(rows, { symbol: '', qty: '   ' }, columns);
    expect(ids(result)).toEqual(['r1', 'r2', 'r3', 'r4']);
  });

  it('matches string columns by case-insensitive substring', () => {
    expect(ids(filterRows(rows, { symbol: 'usd' }, columns))).toEqual(['r1', 'r2', 'r3', 'r4']);
    expect(ids(filterRows(rows, { symbol: 'EUR' }, columns))).toEqual(['r2']);
    expect(ids(filterRows(rows, { symbol: 'GBP' }, columns))).toEqual(['r1']);
    expect(ids(filterRows(rows, { symbol: 'zzz' }, columns))).toEqual([]);
  });

  it('supports > on numeric columns', () => {
    expect(ids(filterRows(rows, { qty: '>700' }, columns))).toEqual(['r2', 'r3', 'r4']);
  });

  it('supports < on numeric columns', () => {
    expect(ids(filterRows(rows, { qty: '<700' }, columns))).toEqual(['r1']);
  });

  it('supports >= on numeric columns (boundary included)', () => {
    expect(ids(filterRows(rows, { qty: '>=750' }, columns))).toEqual(['r2', 'r3', 'r4']);
    expect(ids(filterRows(rows, { qty: '>750' }, columns))).toEqual(['r2']);
  });

  it('supports <= on numeric columns (boundary included)', () => {
    expect(ids(filterRows(rows, { qty: '<=750' }, columns))).toEqual(['r1', 'r3', 'r4']);
    expect(ids(filterRows(rows, { qty: '<750' }, columns))).toEqual(['r1']);
  });

  it('supports = exact match on numeric columns', () => {
    expect(ids(filterRows(rows, { qty: '=750' }, columns))).toEqual(['r3', 'r4']);
    expect(ids(filterRows(rows, { qty: '=751' }, columns))).toEqual([]);
  });

  it('supports operators on price and pct columns, including negatives and decimals', () => {
    expect(ids(filterRows(rows, { px: '>100' }, columns))).toEqual(['r3']);
    expect(ids(filterRows(rows, { chg: '<0' }, columns))).toEqual(['r1', 'r4']);
    expect(ids(filterRows(rows, { chg: '>=-0.34' }, columns))).toEqual(['r1', 'r2', 'r3']);
    expect(ids(filterRows(rows, { px: '=1.0852' }, columns))).toEqual(['r2']);
  });

  it('tolerates whitespace around operator and operand', () => {
    expect(ids(filterRows(rows, { qty: '  >= 750 ' }, columns))).toEqual(['r2', 'r3', 'r4']);
  });

  it('falls back to substring on numeric columns for plain text', () => {
    // '75' is not an operator expression -> substring against raw value.
    expect(ids(filterRows(rows, { qty: '75' }, columns))).toEqual(['r3', 'r4']);
    expect(ids(filterRows(rows, { qty: '00' }, columns))).toEqual(['r1', 'r2']);
  });

  it('falls back to substring when the operand is not numeric', () => {
    // '>abc' cannot be parsed as a numeric comparison -> substring (no match).
    expect(ids(filterRows(rows, { qty: '>abc' }, columns))).toEqual([]);
    // A bare operator with no operand also falls back to substring.
    expect(ids(filterRows(rows, { qty: '>' }, columns))).toEqual([]);
  });

  it('excludes rows with non-numeric values from operator matches', () => {
    const dirty: ReportRow[] = [
      { id: 'a', symbol: 'A', qty: 'n/a', px: 0, chg: 0, ts: 0 },
      { id: 'b', symbol: 'B', qty: 900, px: 0, chg: 0, ts: 0 },
    ];
    expect(ids(filterRows(dirty, { qty: '>100' }, columns))).toEqual(['b']);
  });

  it('matches timestamp columns by substring', () => {
    expect(ids(filterRows(rows, { ts: '09:30:0' }, columns))).toEqual(['r1', 'r2', 'r3']);
    expect(ids(filterRows(rows, { ts: '09:29' }, columns))).toEqual(['r4']);
  });

  it('combines multiple column filters with logical AND', () => {
    const result = filterRows(rows, { symbol: 'usd', qty: '>=750', chg: '>0' }, columns);
    expect(ids(result)).toEqual(['r2', 'r3']);
  });

  it('treats filters on unknown columns as substring against the raw value', () => {
    expect(ids(filterRows(rows, { missing: 'x' }, columns))).toEqual([]);
  });

  it('does not mutate the input rows array', () => {
    const before = ids(rows);
    filterRows(rows, { symbol: 'EUR' }, columns);
    expect(ids(rows)).toEqual(before);
  });

  it('handles empty row arrays', () => {
    expect(filterRows([], { symbol: 'a' }, columns)).toEqual([]);
  });
});

describe('nextSortState', () => {
  const none: SortState = { columnKey: null, direction: 'asc' };

  it('starts ascending on a fresh column', () => {
    expect(nextSortState(none, 'symbol')).toEqual({ columnKey: 'symbol', direction: 'asc' });
  });

  it('cycles asc -> desc on the same column', () => {
    expect(nextSortState({ columnKey: 'qty', direction: 'asc' }, 'qty')).toEqual({
      columnKey: 'qty',
      direction: 'desc',
    });
  });

  it('cycles desc -> asc on the same column (full cycle)', () => {
    expect(nextSortState({ columnKey: 'qty', direction: 'desc' }, 'qty')).toEqual({
      columnKey: 'qty',
      direction: 'asc',
    });
  });

  it('resets to asc when switching to a different column, even from desc', () => {
    expect(nextSortState({ columnKey: 'qty', direction: 'desc' }, 'px')).toEqual({
      columnKey: 'px',
      direction: 'asc',
    });
  });

  it('does not mutate the current state object', () => {
    const current: SortState = { columnKey: 'qty', direction: 'asc' };
    const next = nextSortState(current, 'qty');
    expect(next).not.toBe(current);
    expect(current).toEqual({ columnKey: 'qty', direction: 'asc' });
  });
});
