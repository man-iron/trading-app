/**
 * Formatting helpers for report cells and EOD date labels.
 *
 * All functions are pure and side-effect free. Numeric formatting is pinned to
 * the `en-US` locale so output is deterministic across environments (thousands
 * separator `,`, decimal point `.`), matching the terminal aesthetic.
 */
import type { ColumnType } from '../types';

/** Locale used for all numeric formatting (deterministic output). */
const NUMBER_LOCALE = 'en-US';

/** Fixed decimal places for `price` cells. */
const PRICE_DECIMALS = 2;

/** Fixed decimal places for `pct` cells. */
const PCT_DECIMALS = 2;

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/**
 * Coerce a raw cell value to a finite number, or null when not coercible.
 */
function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/** Left-pad a non-negative integer to two digits. */
function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Format a raw cell value for display according to its column type.
 *
 * - `price`     -> fixed 2 decimals with thousands separators, e.g. `1,234.50`
 * - `pct`       -> signed 2-decimal percent, e.g. `+1.25%` / `-0.40%`
 *                  (zero renders as `+0.00%`)
 * - `timestamp` -> local `HH:mm:ss` (accepts ISO strings or epoch millis)
 * - `number`    -> locale-grouped, e.g. `1,234,567`
 * - `string`    -> passthrough
 *
 * `null`/`undefined` render as an empty string. Values that cannot be coerced
 * for a numeric/timestamp type fall back to their string representation.
 */
export function formatCell(
  value: string | number | null | undefined,
  type: ColumnType
): string {
  if (value === null) {
    return '';
  }

  switch (type) {
    case 'price': {
      const numeric = toFiniteNumber(value);
      if (numeric === null) return String(value);
      return numeric.toLocaleString(NUMBER_LOCALE, {
        minimumFractionDigits: PRICE_DECIMALS,
        maximumFractionDigits: PRICE_DECIMALS,
      });
    }
    case 'pct': {
      const numeric = toFiniteNumber(value);
      if (numeric === null) return String(value);
      const sign = numeric < 0 ? '-' : '+';
      return `${sign}${Math.abs(numeric).toFixed(PCT_DECIMALS)}%`;
    }
    case 'timestamp': {
      const date =
        typeof value === 'number' ? new Date(value) : new Date(Date.parse(String(value)));
      if (Number.isNaN(date.getTime())) return String(value);
      return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
    }
    case 'number': {
      const numeric = toFiniteNumber(value);
      if (numeric === null) return String(value);
      return numeric.toLocaleString(NUMBER_LOCALE);
    }
    case 'string':
    default:
      return String(value);
  }
}

/**
 * Format an EOD date string (`YYYY-MM-DD`) as a human label like
 * `Tue 04 Aug 2026` (weekday, zero-padded day, short month, full year).
 *
 * Parsing is done in UTC from the date parts to avoid timezone drift.
 * Strings that are not valid `YYYY-MM-DD` calendar dates are returned as-is.
 */
export function formatEodDateLabel(date: string): string {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return String(date ?? '');
  }
  const [year, month, day] = date.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  // Reject impossible calendar dates (e.g. 2026-02-30 rolls over in Date).
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    return date;
  }
  return `${DAY_NAMES[utc.getUTCDay()]} ${pad2(day)} ${MONTH_NAMES[month - 1]} ${year}`;
}
