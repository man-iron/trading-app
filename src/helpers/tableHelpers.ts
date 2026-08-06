/**
 * Table helpers: sorting, filtering and sort-state cycling for ReportTable.
 *
 * All functions are pure — they never mutate their inputs.
 */
import type {
  ColumnDef,
  ColumnType,
  FilterState,
  ReportRow,
  SortState,
} from '../types';

/** Column types whose raw values compare numerically. */
const NUMERIC_TYPES: ReadonlySet<ColumnType> = new Set(['number', 'price', 'pct']);

/** Supported comparison operators for numeric column filters, longest first. */
const NUMERIC_OPERATORS = ['>=', '<=', '>', '<', '='] as const;

type NumericOperator = (typeof NUMERIC_OPERATORS)[number];

/**
 * Look up a column definition by key.
 */
function findColumn(columns: ColumnDef[], key: string | null): ColumnDef | undefined {
  if (key === null) return undefined;
  return columns.find((col) => col.key === key);
}

/**
 * Coerce a cell value to a number for numeric comparison.
 * Non-coercible values yield NaN and are pushed to the end when sorting.
 */
function toNumber(value: string | number | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return Number.NaN;
}

/**
 * Coerce a cell value to epoch milliseconds for timestamp comparison.
 * Accepts epoch numbers or parseable date strings (e.g. ISO timestamps).
 */
function toEpochMs(value: string | number | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return Number.NaN;
}

/**
 * Compare two cell values according to the column type.
 * NaN / missing values sort after comparable values in ascending order.
 */
function compareValues(
  a: string | number | undefined,
  b: string | number | undefined,
  type: ColumnType
): number {
  if (type === 'timestamp') {
    const na = toEpochMs(a);
    const nb = toEpochMs(b);
    if (Number.isNaN(na) && Number.isNaN(nb)) return 0;
    if (Number.isNaN(na)) return 1;
    if (Number.isNaN(nb)) return -1;
    return na - nb;
  }
  if (NUMERIC_TYPES.has(type)) {
    const na = toNumber(a);
    const nb = toNumber(b);
    if (Number.isNaN(na) && Number.isNaN(nb)) return 0;
    if (Number.isNaN(na)) return 1;
    if (Number.isNaN(nb)) return -1;
    return na - nb;
  }
  // String (and any unknown type): locale-aware, case-insensitive-ish compare.
  return String(a ?? '').localeCompare(String(b ?? ''), undefined, { sensitivity: 'base' });
}

/**
 * Sort report rows by the active sort state. Stable: rows with equal sort keys
 * keep their original relative order. Type-aware: numeric columns (`number`,
 * `price`, `pct`) compare numerically, `timestamp` compares chronologically,
 * `string` uses locale comparison.
 *
 * Returns a new array; the input is never mutated. When no sort column is
 * active (or the key matches no column) a shallow copy in original order is
 * returned.
 */
export function sortRows(
  rows: ReportRow[],
  sort: SortState,
  columns: ColumnDef[]
): ReportRow[] {
  const column = findColumn(columns, sort.columnKey);
  if (!column) {
    return rows.slice();
  }
  const directionSign = sort.direction === 'desc' ? -1 : 1;
  // Decorate with the original index so the sort is stable on every engine.
  const decorated = rows.map((row, index) => ({ row, index }));
  decorated.sort((a, b) => {
    const result = compareValues(a.row[column.key], b.row[column.key], column.type);
    if (result !== 0) return result * directionSign;
    return a.index - b.index;
  });
  return decorated.map((entry) => entry.row);
}

/**
 * Parse a numeric filter expression of the form `>x`, `<x`, `>=x`, `<=x`, `=x`.
 * Returns null when the text does not start with an operator or the operand is
 * not a valid number (callers then fall back to substring matching).
 */
function parseNumericFilter(
  text: string
): { operator: NumericOperator; operand: number } | null {
  const trimmed = text.trim();
  for (const operator of NUMERIC_OPERATORS) {
    if (trimmed.startsWith(operator)) {
      const operandText = trimmed.slice(operator.length).trim();
      if (operandText === '') return null;
      const operand = Number(operandText);
      if (Number.isNaN(operand)) return null;
      return { operator, operand };
    }
  }
  return null;
}

/**
 * Evaluate a numeric operator filter against a cell value.
 */
function matchesNumericFilter(
  value: string | number | undefined,
  operator: NumericOperator,
  operand: number
): boolean {
  const numeric = toNumber(value);
  if (Number.isNaN(numeric)) return false;
  switch (operator) {
    case '>':
      return numeric > operand;
    case '<':
      return numeric < operand;
    case '>=':
      return numeric >= operand;
    case '<=':
      return numeric <= operand;
    case '=':
      return numeric === operand;
    default:
      return false;
  }
}

/**
 * Case-insensitive substring match against the cell's string representation.
 */
function matchesSubstring(value: string | number | undefined, filterText: string): boolean {
  return String(value ?? '').toLowerCase().includes(filterText.trim().toLowerCase());
}

/**
 * Filter report rows by per-column filter text. All active filters must match
 * (logical AND). Empty / whitespace-only filter entries are ignored.
 *
 * - String / timestamp columns: case-insensitive substring match.
 * - Numeric columns (`number`, `price`, `pct`): supports `>x`, `<x`, `>=x`,
 *   `<=x`, `=x` prefixes; anything else (including malformed operators) falls
 *   back to case-insensitive substring matching on the raw value.
 *
 * Returns a new array; the input is never mutated.
 */
export function filterRows(
  rows: ReportRow[],
  filters: FilterState,
  columns: ColumnDef[]
): ReportRow[] {
  const active = Object.entries(filters ?? {}).filter(
    ([, text]) => typeof text === 'string' && text.trim() !== ''
  );
  if (active.length === 0) {
    return rows.slice();
  }
  return rows.filter((row) =>
    active.every(([columnKey, text]) => {
      const column = findColumn(columns, columnKey);
      const value = row[columnKey];
      if (column && NUMERIC_TYPES.has(column.type)) {
        const numericFilter = parseNumericFilter(text);
        if (numericFilter) {
          return matchesNumericFilter(value, numericFilter.operator, numericFilter.operand);
        }
      }
      return matchesSubstring(value, text);
    })
  );
}

/**
 * Compute the next sort state after a header click.
 *
 * - Clicking a new column sorts it ascending.
 * - Clicking the active column cycles direction: asc -> desc -> asc -> ...
 */
export function nextSortState(current: SortState, columnKey: string): SortState {
  if (current.columnKey === columnKey) {
    return {
      columnKey,
      direction: current.direction === 'asc' ? 'desc' : 'asc',
    };
  }
  return { columnKey, direction: 'asc' };
}
