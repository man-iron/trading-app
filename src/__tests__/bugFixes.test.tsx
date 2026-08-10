/**
 * Fix-verification suite — one test per bug in `bugs.md` (same numbering).
 *
 * Every test here asserts the CORRECT behavior, so with the bugs in place the
 * whole file is red. The app is fixed when this suite is fully green
 * (bug #11 additionally needs `npx tsc -b` to pass — see below).
 */
import React from 'react';
// @ts-ignore -- node builtin; the app tsconfig has no node types, vitest provides it
import fs from 'node:fs';
import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { formatCell } from '../helpers/formatHelpers';
import { filterRows } from '../helpers/tableHelpers';
import { findNodeById, flattenMenuForRender } from '../helpers/menuHelpers';
import menuReducer from '../store/menu/reducer';
import { appInitSuccess } from '../store/app/actions';
import { MENU_TOGGLE_NODE } from '../constants/actionTypes';
import { getJssTheme, lightColors } from '../styles/theme';
import type { ThemeMode } from '../styles/theme';
import reportTableStyles from '../styles/components/ReportTable.styles';
import appContainerStyles from '../styles/components/AppContainer.styles';
import sidebarStyles from '../styles/components/SidebarContainer.styles';
import statusBarStyles from '../styles/components/StatusBar.styles';
import StatusBar from '../components/StatusBar';
import AppContainer from '../containers/AppContainer';
import { getInit } from '../api/restClient';
import {
  renderWithProviders,
  buildMenuFixture,
} from '../testUtils/renderWithProviders';
import type { ColumnDef, MenuNode, ReportRow, UserData } from '../types';

// Bug #6 needs AppContainer in isolation: stub the api layer and the heavy
// child containers (each is tested in its own suite). StatusBar stays real —
// bugs #4/#5 render it directly.
vi.mock('../api/restClient', () => ({
  getInit: vi.fn(),
  getReport: vi.fn(),
  getEodReport: vi.fn(),
  getEodDates: vi.fn(),
}));
vi.mock('../containers/SidebarContainer', async () => {
  const { createElement } = await import('react');
  return { default: () => createElement('div', { 'data-testid': 'sidebar-container' }) };
});
vi.mock('../containers/ReportContainer', async () => {
  const { createElement } = await import('react');
  return {
    default: ({ reportId }: { reportId: string }) =>
      createElement('div', { 'data-testid': 'report-container' }, reportId),
  };
});
vi.mock('../containers/LiveReportContainer', async () => {
  const { createElement } = await import('react');
  return {
    default: ({ reportId }: { reportId: string }) =>
      createElement('div', { 'data-testid': 'live-report-container' }, reportId),
  };
});

const testUser: UserData = {
  id: 'u-1',
  name: 'Ada Vantage',
  role: 'Trader',
  email: 'ada.vantage@example.com',
  desk: 'FX-DESK-7',
  preferences: { theme: 'dark', defaultReportId: null },
};

describe('bug #1 — formatCell renders undefined as empty string', () => {
  it('returns "" for undefined in every column type', () => {
    (['string', 'number', 'price', 'pct', 'timestamp'] as const).forEach((type) => {
      expect(formatCell(undefined, type)).toBe('');
    });
  });
});

describe('bug #2 — malformed numeric filters fall back to substring matching', () => {
  const columns: ColumnDef[] = [
    { key: 'qty', label: 'Qty', type: 'number', align: 'right' },
  ];

  it('keeps rows whose raw value contains the malformed filter text', () => {
    const rows = [
      { id: 'a', qty: 12 },
      { id: 'b', qty: '>x12' },
    ];
    // '>x1' is not a valid operator expression (operand 'x1' is NaN), so it
    // must degrade to a substring match on the raw value — not match nothing.
    const result = filterRows(rows, { qty: '>x1' }, columns);
    expect(result.map((r) => r.id)).toEqual(['b']);
  });
});

describe('bug #3 — missing cells never match text filters', () => {
  const columns: ColumnDef[] = [
    { key: 'name', label: 'Name', type: 'string', align: 'left' },
  ];

  it('does not match rows whose cell is undefined', () => {
    const rows: ReportRow[] = [
      { id: 'a', name: 'undefined behaviour' },
      { id: 'b' }, // no `name` cell at all
    ];
    const result = filterRows(rows, { name: 'undefined' }, columns);
    expect(result.map((r) => r.id)).toEqual(['a']);
  });
});

describe('bug #4 — StatusBar shows the signed-out placeholder for a null user', () => {
  it('renders NOT SIGNED IN instead of crashing', () => {
    renderWithProviders(<StatusBar user={null} selectedReportLabel="FX Spot" />);
    expect(screen.getByText('NOT SIGNED IN')).toBeInTheDocument();
  });
});

describe('bug #5 — StatusBar shows NO REPORT when nothing is selected', () => {
  it('renders the NO REPORT placeholder instead of crashing', () => {
    renderWithProviders(<StatusBar user={testUser} selectedReportLabel={null} />);
    expect(screen.getByText('NO REPORT')).toBeInTheDocument();
  });
});

describe('bug #6 — selecting an EOD (REST) report renders ReportContainer', () => {
  beforeEach(() => {
    vi.mocked(getInit).mockReset();
  });

  it('mounts ReportContainer with the selected report id', async () => {
    // The mount thunk re-seeds menu state from this response, so the default
    // report must match the preloaded selection.
    vi.mocked(getInit).mockResolvedValue({
      userData: {
        ...testUser,
        preferences: { ...testUser.preferences, defaultReportId: 'fx-forwards' },
      },
      menuData: buildMenuFixture(),
      eodDates: ['2026-08-05'],
    });
    renderWithProviders(<AppContainer />, {
      preloadedState: {
        app: {
          status: 'ready',
          error: null,
          userData: testUser,
          eodDates: ['2026-08-05'],
          themeMode: 'dark',
        },
        menu: {
          items: buildMenuFixture(),
          expandedIds: [],
          selectedReportId: 'fx-forwards',
        },
      },
    });
    const restContainer = await screen.findByTestId('report-container');
    expect(restContainer).toHaveTextContent('fx-forwards');
  });
});

describe('bug #7 — findNodeById is safe on leaves and misses', () => {
  it('finds a level-3 node that sits after a level-2 leaf in tree order', () => {
    const node = findNodeById(buildMenuFixture(), 'commod-energy');
    expect(node).toMatchObject({ id: 'commod-energy', type: 'report' });
  });

  it('returns null (not a crash) when the id does not exist', () => {
    expect(findNodeById(buildMenuFixture(), 'no-such-node')).toBeNull();
  });
});

describe('bug #8 — flattenMenuForRender emits the third level', () => {
  it('includes level-3 report rows at depth 2 when their ancestors are expanded', () => {
    const rows = flattenMenuForRender(buildMenuFixture(), ['markets', 'markets-fx']);
    const fxSpot = rows.find((row: any) => row.node.id === 'fx-spot');
    expect(fxSpot).toBeDefined();
    expect(fxSpot?.depth).toBe(2);
  });
});

describe('bug #9 — MENU_TOGGLE_NODE never mutates, always returns new state', () => {
  it('returns a new state object and leaves the previous one untouched', () => {
    const prior = { items: [], expandedIds: [], selectedReportId: null };
    const next = menuReducer(prior, { type: MENU_TOGGLE_NODE, payload: 'markets' });
    expect(next).not.toBe(prior);
    expect(next.expandedIds).toEqual(['markets']);
    expect(prior.expandedIds).toEqual([]); // no in-place mutation
  });

  it('collapse also produces a fresh state object', () => {
    const prior = { items: [], expandedIds: ['markets'], selectedReportId: null };
    const next = menuReducer(prior, { type: MENU_TOGGLE_NODE, payload: 'markets' });
    expect(next).not.toBe(prior);
    expect(next.expandedIds).toEqual([]);
    expect(prior.expandedIds).toEqual(['markets']);
  });
});

describe('bug #10 — menu tree comes from the /api/init payload, not a frontend copy', () => {
  it('seeds items from the APP_INIT_SUCCESS payload menuData', () => {
    const customMenu: MenuNode[] = [
      { id: 'custom-root', label: 'Custom Root', type: 'group', children: [] },
    ];
    const next = menuReducer(
      undefined,
      appInitSuccess({ userData: testUser, menuData: customMenu, eodDates: [] })
    );
    expect(next.items).toEqual(customMenu);
  });
});

describe('bug #11 — ThemeMode is a strict union', () => {
  // Compile-time half: with the correct union this suppression is needed;
  // with `ThemeMode = string` it is flagged unused and `npx tsc -b` fails.
  const acceptsMode = (m: ThemeMode): ThemeMode => m;
  // @ts-expect-error -- 'neon' must not be assignable to ThemeMode
  acceptsMode('neon');

  it("declares ThemeMode as the 'dark' | 'light' union", () => {
    // Relative to the vitest working directory (the repo root).
    const src = fs.readFileSync('src/styles/theme.ts', 'utf8');
    expect(src).toMatch(
      /export type ThemeMode\s*=\s*(['"]dark['"]\s*\|\s*['"]light['"]|['"]light['"]\s*\|\s*['"]dark['"])/
    );
  });
});

describe('bug #12 — ReportTable surfaces follow the active theme', () => {
  it('uses light tokens when styled with the light JSS theme', () => {
    const light: any = reportTableStyles(getJssTheme('light'));
    expect(light.root.backgroundColor).toBe(lightColors.panel);
    expect(light.cell.color).toBe(lightColors.text);
    expect(light.footer.backgroundColor).toBe(lightColors.panelRaised);
    expect(light.filterCell.backgroundColor).toBe(lightColors.panelRaised);
  });
});

describe('bug #13 — sticky header stays above flashing body cells', () => {
  it('headerCell carries a positive z-index', () => {
    const s: any = reportTableStyles(getJssTheme('dark'));
    expect(Number(s.headerCell.zIndex ?? 0)).toBeGreaterThanOrEqual(1);
  });
});

describe('bug #14 — skeleton sidebar matches the real sidebar width', () => {
  it('skeletonSidebar uses border-box sizing', () => {
    const s: any = appContainerStyles(getJssTheme('dark'));
    expect(s.skeletonSidebar.boxSizing).toBe('border-box');
  });
});

describe('bug #15 — sidebar cursor stays in normal flow', () => {
  it('cursor is not absolutely positioned', () => {
    const s: any = sidebarStyles(getJssTheme('dark'));
    expect(s.cursor.position).not.toBe('absolute');
  });
});

describe('bug #16 — StatusBar lays out with flex, not floats', () => {
  it('root is a flex row and sections do not float', () => {
    const s: any = statusBarStyles(getJssTheme('dark'));
    expect(s.root.display).toBe('flex');
    expect(s.section.float).toBeUndefined();
  });
});

describe('bug #17 — the formatHelpers suite asserts the correct behavior', () => {
  it('does not bless formatCell(undefined) rendering "undefined"', () => {
    // Relative to the vitest working directory (the repo root).
    const src = fs.readFileSync('src/helpers/__tests__/formatHelpers.test.ts', 'utf8');
    expect(src).not.toMatch(/toBe\(\s*['"]undefined['"]\s*\)/);
  });
});
