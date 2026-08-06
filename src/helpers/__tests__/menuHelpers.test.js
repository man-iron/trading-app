import { describe, it, expect } from 'vitest';
import { findNodeById, flattenMenuForRender } from '../menuHelpers';

/**
 * 3-level fixture mirroring the contract menu tree (subset):
 * Level 1 groups -> Level 2 sub-groups OR reports -> Level 3 report leaves.
 */
const menuData = [
  {
    id: 'markets',
    label: 'Markets',
    type: 'group',
    children: [
      {
        id: 'markets-fx',
        label: 'FX',
        type: 'group',
        children: [
          { id: 'fx-spot', label: 'FX Spot', type: 'report', transport: 'ws' },
          { id: 'fx-forwards', label: 'FX Forwards', type: 'report', transport: 'rest' },
        ],
      },
      {
        id: 'markets-credit',
        label: 'Credit',
        type: 'group',
        children: [
          { id: 'credit-cds', label: 'CDS Indices', type: 'report', transport: 'rest' },
        ],
      },
    ],
  },
  {
    id: 'derivatives',
    label: 'Derivatives',
    type: 'group',
    children: [
      { id: 'swaps', label: 'Swaps', type: 'report', transport: 'rest' },
      {
        id: 'derivatives-commodities',
        label: 'Commodities',
        type: 'group',
        children: [
          { id: 'commod-energy', label: 'Energy', type: 'report', transport: 'ws' },
          { id: 'commod-metals', label: 'Metals', type: 'report', transport: 'rest' },
        ],
      },
    ],
  },
  { id: 'lonely-report', label: 'Lonely Report', type: 'report', transport: 'rest' },
];

const ids = (rows) => rows.map((r) => r.node.id);

describe('findNodeById', () => {
  it('finds a level-1 node', () => {
    expect(findNodeById(menuData, 'markets')).toBe(menuData[0]);
  });

  it('finds a top-level report node', () => {
    expect(findNodeById(menuData, 'lonely-report')).toBe(menuData[2]);
  });

  it('finds a level-2 group node', () => {
    const node = findNodeById(menuData, 'markets-fx');
    expect(node).not.toBeNull();
    expect(node.label).toBe('FX');
    expect(node.type).toBe('group');
  });

  it('finds a level-2 report node', () => {
    const node = findNodeById(menuData, 'swaps');
    expect(node).toEqual({ id: 'swaps', label: 'Swaps', type: 'report', transport: 'rest' });
  });

  it('finds a level-3 leaf node', () => {
    const node = findNodeById(menuData, 'commod-metals');
    expect(node).toEqual({ id: 'commod-metals', label: 'Metals', type: 'report', transport: 'rest' });
  });

  it('returns null for an unknown id', () => {
    expect(findNodeById(menuData, 'does-not-exist')).toBeNull();
  });

  it('returns null for an empty tree', () => {
    expect(findNodeById([], 'markets')).toBeNull();
  });

  it('returns null for null/undefined input', () => {
    expect(findNodeById(null, 'markets')).toBeNull();
    expect(findNodeById(undefined, 'markets')).toBeNull();
  });

  it('handles nodes without children arrays', () => {
    const flat = [{ id: 'a', label: 'A', type: 'report' }];
    expect(findNodeById(flat, 'a')).toBe(flat[0]);
    expect(findNodeById(flat, 'b')).toBeNull();
  });
});

describe('flattenMenuForRender', () => {
  it('returns only level-1 rows when nothing is expanded', () => {
    const rows = flattenMenuForRender(menuData, []);
    expect(ids(rows)).toEqual(['markets', 'derivatives', 'lonely-report']);
    expect(rows.every((r) => r.depth === 0)).toBe(true);
    expect(rows.every((r) => r.isExpanded === false)).toBe(true);
    expect(rows.every((r) => r.visible === true)).toBe(true);
  });

  it('returns an empty array for empty or missing menu data', () => {
    expect(flattenMenuForRender([], [])).toEqual([]);
    expect(flattenMenuForRender(null, [])).toEqual([]);
    expect(flattenMenuForRender(undefined, undefined)).toEqual([]);
  });

  it('shows level-2 children when a level-1 group is expanded', () => {
    const rows = flattenMenuForRender(menuData, ['markets']);
    expect(ids(rows)).toEqual([
      'markets', 'markets-fx', 'markets-credit', 'derivatives', 'lonely-report',
    ]);
    const byId = Object.fromEntries(rows.map((r) => [r.node.id, r]));
    expect(byId['markets'].isExpanded).toBe(true);
    expect(byId['markets'].depth).toBe(0);
    expect(byId['markets-fx'].depth).toBe(1);
    expect(byId['markets-fx'].isExpanded).toBe(false);
    expect(byId['markets-credit'].depth).toBe(1);
  });

  it('hides level-3 leaves while their level-2 group is collapsed', () => {
    const rows = flattenMenuForRender(menuData, ['markets']);
    expect(ids(rows)).not.toContain('fx-spot');
    expect(ids(rows)).not.toContain('fx-forwards');
    expect(ids(rows)).not.toContain('credit-cds');
  });

  it('shows level-3 leaves when both ancestor groups are expanded', () => {
    const rows = flattenMenuForRender(menuData, ['markets', 'markets-fx']);
    expect(ids(rows)).toEqual([
      'markets', 'markets-fx', 'fx-spot', 'fx-forwards',
      'markets-credit', 'derivatives', 'lonely-report',
    ]);
    const byId = Object.fromEntries(rows.map((r) => [r.node.id, r]));
    expect(byId['fx-spot'].depth).toBe(2);
    expect(byId['fx-forwards'].depth).toBe(2);
    expect(byId['fx-spot'].isExpanded).toBe(false);
  });

  it('omits descendants of a collapsed level-1 group even when its level-2 child id is expanded', () => {
    const rows = flattenMenuForRender(menuData, ['markets-fx']);
    expect(ids(rows)).toEqual(['markets', 'derivatives', 'lonely-report']);
  });

  it('renders level-2 reports alongside level-2 groups under an expanded level-1 group', () => {
    const rows = flattenMenuForRender(menuData, ['derivatives']);
    expect(ids(rows)).toEqual([
      'markets', 'derivatives', 'swaps', 'derivatives-commodities', 'lonely-report',
    ]);
    const swaps = rows.find((r) => r.node.id === 'swaps');
    expect(swaps.depth).toBe(1);
    expect(swaps.isExpanded).toBe(false);
  });

  it('produces the full ordered flat list when everything is expanded', () => {
    const rows = flattenMenuForRender(menuData, [
      'markets', 'markets-fx', 'markets-credit',
      'derivatives', 'derivatives-commodities',
    ]);
    expect(ids(rows)).toEqual([
      'markets',
      'markets-fx', 'fx-spot', 'fx-forwards',
      'markets-credit', 'credit-cds',
      'derivatives',
      'swaps',
      'derivatives-commodities', 'commod-energy', 'commod-metals',
      'lonely-report',
    ]);
    expect(rows.map((r) => r.depth)).toEqual([0, 1, 2, 2, 1, 2, 0, 1, 1, 2, 2, 0]);
    expect(rows.every((r) => r.visible === true)).toBe(true);
  });

  it('never marks report nodes as expanded even if their id is in expandedIds', () => {
    const rows = flattenMenuForRender(menuData, ['lonely-report', 'markets', 'swaps']);
    const byId = Object.fromEntries(rows.map((r) => [r.node.id, r]));
    expect(byId['lonely-report'].isExpanded).toBe(false);
  });

  it('accepts expandedIds as a Set as well as an array', () => {
    const fromSet = flattenMenuForRender(menuData, new Set(['markets', 'markets-fx']));
    const fromArray = flattenMenuForRender(menuData, ['markets', 'markets-fx']);
    expect(ids(fromSet)).toEqual(ids(fromArray));
  });

  it('handles an expanded group with no children array', () => {
    const data = [{ id: 'g', label: 'G', type: 'group' }];
    const rows = flattenMenuForRender(data, ['g']);
    expect(ids(rows)).toEqual(['g']);
    expect(rows[0].isExpanded).toBe(true);
  });

  it('does not mutate its inputs', () => {
    const snapshot = JSON.parse(JSON.stringify(menuData));
    const expandedIds = ['markets', 'markets-fx'];
    flattenMenuForRender(menuData, expandedIds);
    expect(menuData).toEqual(snapshot);
    expect(expandedIds).toEqual(['markets', 'markets-fx']);
  });

  it('references the original node objects (no cloning)', () => {
    const rows = flattenMenuForRender(menuData, ['markets']);
    expect(rows[0].node).toBe(menuData[0]);
    expect(rows[1].node).toBe(menuData[0].children[0]);
  });

  // Contract requirement: explicit nested for-loops, NO recursion.
  it('is implemented without recursion, using explicit for loops', () => {
    const src = flattenMenuForRender.toString();
    // The only occurrence of the function's own name is its declaration —
    // i.e. the body never calls itself.
    const selfReferences = src.match(/flattenMenuForRender/g) || [];
    expect(selfReferences).toHaveLength(1);
    // And it iterates with explicit for loops.
    expect(src).toMatch(/for\s*\(/);
  });
});
