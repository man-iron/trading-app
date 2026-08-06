/**
 * Invariant tests for servers/data/mockData.js — the single source of truth
 * shared by the mock REST and WS servers.
 */
import { describe, it, expect } from 'vitest';
import {
  menuData,
  userData,
  eodDates,
  reports,
  getReport,
  mutateRowsForDate,
  driftRow,
  lastBusinessDays,
  mulberry32,
  hashString,
} from '../data/mockData.js';

/** Expected report ids and transports, straight from the contract. */
const EXPECTED_REPORTS = {
  'fx-spot': 'ws',
  'fx-forwards': 'rest',
  'rates-govt': 'ws',
  'rates-irs': 'rest',
  'credit-cds': 'rest',
  swaps: 'rest',
  'commod-energy': 'ws',
  'commod-metals': 'rest',
  stocks: 'ws',
  etfs: 'rest',
};

const COLUMN_TYPES = ['string', 'number', 'price', 'pct', 'timestamp'];
const NUMERIC_COLUMN_TYPES = ['number', 'price', 'pct', 'timestamp'];

/** Flatten the menu tree into { node, depth } entries (iterative walk). */
function walkMenu(nodes) {
  const out = [];
  const stack = nodes.map((node) => ({ node, depth: 1 })).reverse();
  while (stack.length > 0) {
    const entry = stack.pop();
    out.push(entry);
    const children = entry.node.children ?? [];
    for (let i = children.length - 1; i >= 0; i -= 1) {
      stack.push({ node: children[i], depth: entry.depth + 1 });
    }
  }
  return out;
}

const allNodes = walkMenu(menuData);
const reportNodes = allNodes.filter(({ node }) => node.type === 'report');

describe('menuData tree', () => {
  it('contains exactly the contract report ids with the contract transports', () => {
    const found = Object.fromEntries(
      reportNodes.map(({ node }) => [node.id, node.transport]),
    );
    expect(found).toEqual(EXPECTED_REPORTS);
  });

  it('is exactly 3 levels deep: max depth 3 and nothing deeper', () => {
    const depths = allNodes.map(({ depth }) => depth);
    expect(Math.max(...depths)).toBe(3);
    expect(depths.every((d) => d >= 1 && d <= 3)).toBe(true);
  });

  it('has only leaf reports at level 3 (no groups at level 3)', () => {
    const level3 = allNodes.filter(({ depth }) => depth === 3);
    expect(level3.length).toBeGreaterThan(0);
    for (const { node } of level3) {
      expect(node.type).toBe('report');
      expect(node.children).toBeUndefined();
    }
  });

  it('has level-1 nodes that are all groups', () => {
    for (const node of menuData) {
      expect(node.type).toBe('group');
      expect(Array.isArray(node.children)).toBe(true);
      expect(node.children.length).toBeGreaterThan(0);
    }
  });

  it('gives every node an id, a label and a valid type', () => {
    for (const { node } of allNodes) {
      expect(typeof node.id).toBe('string');
      expect(node.id.length).toBeGreaterThan(0);
      expect(typeof node.label).toBe('string');
      expect(node.label.length).toBeGreaterThan(0);
      expect(['group', 'report']).toContain(node.type);
    }
  });

  it('puts transport only on reports, children only on groups, and unique ids everywhere', () => {
    const ids = allNodes.map(({ node }) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const { node } of allNodes) {
      if (node.type === 'report') {
        expect(['ws', 'rest']).toContain(node.transport);
        expect(node.children).toBeUndefined();
      } else {
        expect(node.transport).toBeUndefined();
        expect(node.children.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('userData', () => {
  it('matches the UserData shape', () => {
    expect(typeof userData.id).toBe('string');
    expect(typeof userData.name).toBe('string');
    expect(typeof userData.role).toBe('string');
    expect(typeof userData.email).toBe('string');
    expect(typeof userData.desk).toBe('string');
    expect(['dark', 'light']).toContain(userData.preferences.theme);
  });

  it('has a defaultReportId that is null or a known report id', () => {
    const { defaultReportId } = userData.preferences;
    if (defaultReportId !== null) {
      expect(Object.keys(EXPECTED_REPORTS)).toContain(defaultReportId);
    }
  });
});

describe('eodDates', () => {
  it('is the last 10 business days ending 2026-08-05, newest first', () => {
    expect(eodDates).toHaveLength(10);
    expect(eodDates[0]).toBe('2026-08-05');
    expect(eodDates).toEqual([
      '2026-08-05',
      '2026-08-04',
      '2026-08-03',
      '2026-07-31',
      '2026-07-30',
      '2026-07-29',
      '2026-07-28',
      '2026-07-27',
      '2026-07-24',
      '2026-07-23',
    ]);
  });

  it('contains only well-formed weekday dates, strictly descending', () => {
    for (const date of eodDates) {
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const day = new Date(`${date}T00:00:00Z`).getUTCDay();
      expect(day).not.toBe(0);
      expect(day).not.toBe(6);
    }
    for (let i = 1; i < eodDates.length; i += 1) {
      expect(eodDates[i] < eodDates[i - 1]).toBe(true);
    }
  });

  it('lastBusinessDays skips weekends when walking back', () => {
    expect(lastBusinessDays('2026-08-03', 2)).toEqual(['2026-08-03', '2026-07-31']);
    expect(lastBusinessDays('2026-08-05', 1)).toEqual(['2026-08-05']);
  });
});

describe('reports registry', () => {
  it('has an entry with columns and rows for EVERY menu report id', () => {
    for (const reportId of Object.keys(EXPECTED_REPORTS)) {
      const report = getReport(reportId);
      expect(report, `missing report: ${reportId}`).not.toBeNull();
      expect(Array.isArray(report.columns)).toBe(true);
      expect(report.columns.length).toBeGreaterThan(0);
      expect(Array.isArray(report.rows)).toBe(true);
    }
  });

  it('has no extra registry entries beyond the menu report ids', () => {
    expect(Object.keys(reports).sort()).toEqual(Object.keys(EXPECTED_REPORTS).sort());
  });

  it('seeds 15-30 realistic rows per report', () => {
    for (const [reportId, report] of Object.entries(reports)) {
      expect(
        report.rows.length,
        `${reportId} row count out of range: ${report.rows.length}`,
      ).toBeGreaterThanOrEqual(15);
      expect(report.rows.length).toBeLessThanOrEqual(30);
    }
  });

  it('has valid ColumnDef entries with unique keys', () => {
    for (const [reportId, report] of Object.entries(reports)) {
      const keys = report.columns.map((c) => c.key);
      expect(new Set(keys).size, `${reportId} duplicate column keys`).toBe(keys.length);
      for (const column of report.columns) {
        expect(typeof column.key).toBe('string');
        expect(typeof column.label).toBe('string');
        expect(COLUMN_TYPES).toContain(column.type);
        if (column.align !== undefined) {
          expect(['left', 'right']).toContain(column.align);
        }
      }
    }
  });

  it('gives every row a unique non-empty string id', () => {
    for (const [reportId, report] of Object.entries(reports)) {
      const ids = report.rows.map((row) => row.id);
      expect(new Set(ids).size, `${reportId} duplicate row ids`).toBe(ids.length);
      for (const id of ids) {
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
      }
    }
  });

  it('populates every column key in every row with the declared value type', () => {
    for (const [reportId, report] of Object.entries(reports)) {
      for (const row of report.rows) {
        for (const column of report.columns) {
          const value = row[column.key];
          const expected = NUMERIC_COLUMN_TYPES.includes(column.type) ? 'number' : 'string';
          expect(
            typeof value,
            `${reportId} row ${row.id} field ${column.key}`,
          ).toBe(expected);
          if (typeof value === 'number') {
            expect(Number.isFinite(value)).toBe(true);
          }
        }
      }
    }
  });

  it('has no row keys outside id + declared columns', () => {
    for (const [reportId, report] of Object.entries(reports)) {
      const allowed = new Set(['id', ...report.columns.map((c) => c.key)]);
      for (const row of report.rows) {
        for (const key of Object.keys(row)) {
          expect(allowed.has(key), `${reportId} row ${row.id} stray key ${key}`).toBe(true);
        }
      }
    }
  });

  it('keeps bid <= ask on seeded two-sided quotes', () => {
    for (const row of reports['fx-spot'].rows.concat(reports.swaps.rows)) {
      expect(Number(row.bid)).toBeLessThanOrEqual(Number(row.ask));
    }
  });

  it('getReport returns null for unknown report ids', () => {
    expect(getReport('nope')).toBeNull();
    expect(getReport('')).toBeNull();
    expect(getReport('toString')).toBeNull(); // prototype pollution guard
  });
});

describe('mutateRowsForDate', () => {
  const date = '2026-08-04';

  it('is deterministic: same rows + same date -> identical output', () => {
    for (const [reportId, report] of Object.entries(reports)) {
      const a = mutateRowsForDate(report.rows, date);
      const b = mutateRowsForDate(report.rows, date);
      expect(a, `${reportId} not deterministic`).toEqual(b);
    }
  });

  it('produces different rows for different dates', () => {
    const a = mutateRowsForDate(reports.stocks.rows, '2026-08-04');
    const b = mutateRowsForDate(reports.stocks.rows, '2026-08-03');
    expect(a).not.toEqual(b);
  });

  it('does not mutate the input rows', () => {
    const rows = reports['fx-spot'].rows;
    const snapshot = JSON.parse(JSON.stringify(rows));
    mutateRowsForDate(rows, date);
    expect(rows).toEqual(snapshot);
  });

  it('preserves length, order, ids and every string field', () => {
    for (const [reportId, report] of Object.entries(reports)) {
      const mutated = mutateRowsForDate(report.rows, date);
      expect(mutated).toHaveLength(report.rows.length);
      mutated.forEach((row, i) => {
        const original = report.rows[i];
        expect(row.id, reportId).toBe(original.id);
        for (const key of Object.keys(original)) {
          if (typeof original[key] === 'string') {
            expect(row[key], `${reportId} ${row.id} ${key}`).toBe(original[key]);
          }
        }
      });
    }
  });

  it('shifts price-like fields by a bounded amount and stamps the EOD timestamp', () => {
    const mutated = mutateRowsForDate(reports.stocks.rows, date);
    mutated.forEach((row, i) => {
      const original = reports.stocks.rows[i];
      const ratio = Number(row.price) / Number(original.price);
      expect(ratio).toBeGreaterThan(0.97);
      expect(ratio).toBeLessThan(1.03);
      // volume is not a price/change/pct field and must not move
      expect(row.volume).toBe(original.volume);
      expect(new Date(Number(row.updated)).toISOString().startsWith(date)).toBe(true);
    });
  });

  it('keeps bid <= ask after mutation on two-sided quotes', () => {
    for (const reportId of ['fx-spot', 'swaps']) {
      for (const row of mutateRowsForDate(reports[reportId].rows, date)) {
        expect(Number(row.bid), `${reportId} ${row.id}`).toBeLessThanOrEqual(Number(row.ask));
      }
    }
  });
});

describe('driftRow', () => {
  it('returns a new object and never mutates the input row', () => {
    const row = reports['fx-spot'].rows[0];
    const snapshot = { ...row };
    const next = driftRow(row);
    expect(next).not.toBe(row);
    expect(row).toEqual(snapshot);
  });

  it('only touches numeric fields: id and all string fields are unchanged', () => {
    for (const [reportId, report] of Object.entries(reports)) {
      for (const row of report.rows) {
        const next = driftRow(row);
        expect(Object.keys(next).sort()).toEqual(Object.keys(row).sort());
        expect(next.id, reportId).toBe(row.id);
        for (const key of Object.keys(row)) {
          if (typeof row[key] === 'string') {
            expect(next[key], `${reportId} ${row.id} ${key}`).toBe(row[key]);
          } else {
            expect(typeof next[key], `${reportId} ${row.id} ${key}`).toBe('number');
          }
        }
      }
    }
  });

  it('leaves non-price numeric fields (volume, aum, coupon) untouched', () => {
    for (const row of reports['commod-energy'].rows) {
      expect(driftRow(row).volume).toBe(row.volume);
    }
    for (const row of reports.etfs.rows) {
      expect(driftRow(row).aum).toBe(row.aum);
    }
    for (const row of reports['rates-govt'].rows) {
      expect(driftRow(row).coupon).toBe(row.coupon);
    }
  });

  it('is deterministic when given a seeded rng', () => {
    const row = reports.stocks.rows[0];
    const a = driftRow(row, mulberry32(hashString('tick-1')));
    const b = driftRow(row, mulberry32(hashString('tick-1')));
    expect(a).toEqual(b);
  });

  it('drifts price fields by at most ~0.1 percent', () => {
    for (const row of reports.stocks.rows) {
      const next = driftRow(row);
      const ratio = Number(next.price) / Number(row.price);
      expect(ratio).toBeGreaterThan(0.998);
      expect(ratio).toBeLessThan(1.002);
    }
  });

  it('keeps change and pctChange consistent with the price move', () => {
    // rng pinned high so the drift is guaranteed non-zero and positive
    const row = reports.stocks.rows[0];
    const next = driftRow(row, () => 1 - Number.EPSILON);
    const delta = Number(next.price) - Number(row.price);
    expect(delta).toBeGreaterThan(0);
    expect(Number(next.change)).toBeCloseTo(Number(row.change) + delta, 6);
    expect(Number(next.pctChange)).toBeCloseTo(
      Number(row.pctChange) + (delta / Number(row.price)) * 100,
      1,
    );
  });

  it('keeps bid <= ask on drifted two-sided quotes', () => {
    for (const reportId of ['fx-spot', 'swaps']) {
      for (const row of reports[reportId].rows) {
        const next = driftRow(row);
        expect(Number(next.bid), `${reportId} ${row.id}`).toBeLessThanOrEqual(Number(next.ask));
      }
    }
  });

  it('refreshes the numeric updated timestamp', () => {
    const row = reports['fx-spot'].rows[0];
    const before = Date.now();
    const next = driftRow(row);
    expect(typeof next.updated).toBe('number');
    expect(Number(next.updated)).toBeGreaterThanOrEqual(before);
  });
});
