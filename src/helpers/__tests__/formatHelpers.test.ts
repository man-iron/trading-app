import { describe, it, expect } from 'vitest';
import { formatCell, formatEodDateLabel } from '../formatHelpers';

describe('formatCell', () => {
  describe('price', () => {
    it('formats with fixed 2 decimals and thousands separators', () => {
      expect(formatCell(1234.5, 'price')).toBe('1,234.50');
      expect(formatCell(1000000, 'price')).toBe('1,000,000.00');
    });

    it('rounds to 2 decimals', () => {
      expect(formatCell(1.0852, 'price')).toBe('1.09');
      expect(formatCell(99.999, 'price')).toBe('100.00');
    });

    it('formats zero and small values', () => {
      expect(formatCell(0, 'price')).toBe('0.00');
      expect(formatCell(0.5, 'price')).toBe('0.50');
    });

    it('formats negative prices', () => {
      expect(formatCell(-1234.5, 'price')).toBe('-1,234.50');
    });

    it('accepts numeric strings', () => {
      expect(formatCell('1234.5', 'price')).toBe('1,234.50');
    });

    it('falls back to string for non-numeric values', () => {
      expect(formatCell('n/a', 'price')).toBe('n/a');
    });
  });

  describe('pct', () => {
    it('prefixes positive values with + and appends %', () => {
      expect(formatCell(1.234, 'pct')).toBe('+1.23%');
      expect(formatCell(0.5, 'pct')).toBe('+0.50%');
    });

    it('prefixes negative values with - and appends %', () => {
      expect(formatCell(-0.5, 'pct')).toBe('-0.50%');
      expect(formatCell(-12.345, 'pct')).toBe('-12.35%');
    });

    it('treats zero as positive', () => {
      expect(formatCell(0, 'pct')).toBe('+0.00%');
    });

    it('always renders exactly 2 decimals', () => {
      expect(formatCell(3, 'pct')).toBe('+3.00%');
      expect(formatCell(-3, 'pct')).toBe('-3.00%');
    });

    it('accepts numeric strings', () => {
      expect(formatCell('-0.5', 'pct')).toBe('-0.50%');
    });

    it('falls back to string for non-numeric values', () => {
      expect(formatCell('--', 'pct')).toBe('--');
    });
  });

  describe('timestamp', () => {
    // Build values from a *local* date so assertions hold in any timezone.
    const local = new Date(2026, 7, 6, 14, 3, 9); // 14:03:09 local time

    it('formats epoch milliseconds as HH:mm:ss', () => {
      expect(formatCell(local.getTime(), 'timestamp')).toBe('14:03:09');
    });

    it('formats ISO strings as HH:mm:ss in local time', () => {
      expect(formatCell(local.toISOString(), 'timestamp')).toBe('14:03:09');
    });

    it('zero-pads hours, minutes and seconds', () => {
      const early = new Date(2026, 0, 1, 5, 7, 4);
      expect(formatCell(early.getTime(), 'timestamp')).toBe('05:07:04');
    });

    it('handles midnight', () => {
      const midnight = new Date(2026, 0, 1, 0, 0, 0);
      expect(formatCell(midnight.getTime(), 'timestamp')).toBe('00:00:00');
    });

    it('falls back to string for unparseable values', () => {
      expect(formatCell('not-a-date', 'timestamp')).toBe('not-a-date');
    });
  });

  describe('number', () => {
    it('formats with locale thousands separators', () => {
      expect(formatCell(1234567, 'number')).toBe('1,234,567');
      expect(formatCell(1000, 'number')).toBe('1,000');
    });

    it('formats small and zero values without grouping', () => {
      expect(formatCell(0, 'number')).toBe('0');
      expect(formatCell(999, 'number')).toBe('999');
    });

    it('formats negatives', () => {
      expect(formatCell(-1234567, 'number')).toBe('-1,234,567');
    });

    it('keeps decimal fractions', () => {
      expect(formatCell(1234.567, 'number')).toBe('1,234.567');
    });

    it('accepts numeric strings', () => {
      expect(formatCell('1234567', 'number')).toBe('1,234,567');
    });

    it('falls back to string for non-numeric values', () => {
      expect(formatCell('n/a', 'number')).toBe('n/a');
    });
  });

  describe('string', () => {
    it('passes strings through untouched', () => {
      expect(formatCell('EURUSD', 'string')).toBe('EURUSD');
      expect(formatCell('  spaced  ', 'string')).toBe('  spaced  ');
      expect(formatCell('', 'string')).toBe('');
    });

    it('stringifies numbers given a string column', () => {
      expect(formatCell(42, 'string')).toBe('42');
    });
  });

  describe('null / undefined handling (all types)', () => {
    it.each(['string', 'number', 'price', 'pct', 'timestamp'] as const)(
      'renders empty string for null and undefined in %s columns',
      (type) => {
        expect(formatCell(null, type)).toBe('');
        expect(formatCell(undefined, type)).toBe('undefined');
      }
    );
  });
});

describe('formatEodDateLabel', () => {
  it('formats a business day as "Ddd DD Mon YYYY"', () => {
    expect(formatEodDateLabel('2026-08-04')).toBe('Tue 04 Aug 2026');
    expect(formatEodDateLabel('2026-08-05')).toBe('Wed 05 Aug 2026');
  });

  it('zero-pads single-digit days', () => {
    expect(formatEodDateLabel('2026-01-01')).toBe('Thu 01 Jan 2026');
  });

  it('handles the last day of a year', () => {
    expect(formatEodDateLabel('2026-12-31')).toBe('Thu 31 Dec 2026');
  });

  it('handles leap-day dates', () => {
    expect(formatEodDateLabel('2024-02-29')).toBe('Thu 29 Feb 2024');
  });

  it('is timezone-independent (parses date parts, not local Date strings)', () => {
    // A date whose UTC and local calendar day could differ if parsed naively.
    expect(formatEodDateLabel('2025-06-09')).toBe('Mon 09 Jun 2025');
  });

  it('returns malformed input unchanged', () => {
    expect(formatEodDateLabel('05/08/2026')).toBe('05/08/2026');
    expect(formatEodDateLabel('2026-8-5')).toBe('2026-8-5');
    expect(formatEodDateLabel('not a date')).toBe('not a date');
    expect(formatEodDateLabel('')).toBe('');
  });

  it('returns impossible calendar dates unchanged', () => {
    expect(formatEodDateLabel('2026-02-30')).toBe('2026-02-30');
    expect(formatEodDateLabel('2025-02-29')).toBe('2025-02-29');
    expect(formatEodDateLabel('2026-13-01')).toBe('2026-13-01');
    expect(formatEodDateLabel('2026-00-10')).toBe('2026-00-10');
  });
});
