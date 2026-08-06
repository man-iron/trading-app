/**
 * Shared test utilities.
 *
 * `renderWithProviders` wraps React Testing Library's `render` with the same
 * provider stack the real app uses in `main.tsx`:
 *   Redux `Provider` (fresh store per call, built from the real `rootReducer`)
 *   -> MUI `ThemeProvider` (muiTheme) -> react-jss `ThemeProvider` (jssTheme).
 *
 * Also exports contract-shaped fixtures: `buildMenuFixture()` (3-level menu
 * tree) and `buildReportStateFixture()` (a `ReportState` with overridable
 * defaults).
 */
import React from 'react';
import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import type { RenderOptions, RenderResult } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { ThemeProvider as JssThemeProvider } from 'react-jss';

import rootReducer from '../store/rootReducer';
import { muiTheme, jssTheme } from '../styles/theme';
import type { MenuNode, ReportState } from '../types';

/** Full store state shape, derived from the app's real root reducer. */
export type RootState = ReturnType<typeof rootReducer>;

/** A partial, deeply-optional preloaded state accepted by the test store. */
export type PreloadedRootState = Partial<RootState>;

/**
 * Create a fresh, fully-wired store for tests using the real root reducer.
 */
export function setupStore(preloadedState?: PreloadedRootState) {
  return configureStore({
    reducer: rootReducer,
    preloadedState: preloadedState as RootState | undefined,
  });
}

/** Store type produced by `setupStore` (real reducer + default middleware). */
export type AppTestStore = ReturnType<typeof setupStore>;

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Initial store state slices to preload into the fresh store. */
  preloadedState?: PreloadedRootState;
  /** Provide a pre-built store instead of creating a fresh one. */
  store?: AppTestStore;
}

export interface RenderWithProvidersResult extends RenderResult {
  /** The store backing the rendered tree — dispatch/getState in assertions. */
  store: AppTestStore;
}

/**
 * Render `ui` inside Redux + MUI + JSS providers.
 * Returns the RTL result plus the backing `store`.
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    preloadedState,
    store = setupStore(preloadedState),
    ...renderOptions
  }: RenderWithProvidersOptions = {}
): RenderWithProvidersResult {
  function Wrapper({ children }: { children?: ReactNode }): ReactElement {
    return (
      <Provider store={store}>
        <MuiThemeProvider theme={muiTheme}>
          <JssThemeProvider theme={jssTheme}>{children}</JssThemeProvider>
        </MuiThemeProvider>
      </Provider>
    );
  }
  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}

/**
 * Build the contract's 3-level menu tree fixture:
 * level-1 asset-class groups, level-2 sub-groups or reports, level-3 reports.
 * Mirrors the tree served by `GET /api/init` in `docs/ARCHITECTURE.md`.
 */
export function buildMenuFixture(): MenuNode[] {
  return [
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
          id: 'markets-rates',
          label: 'Rates',
          type: 'group',
          children: [
            { id: 'rates-govt', label: 'Govt Bonds', type: 'report', transport: 'ws' },
            { id: 'rates-irs', label: 'IRS Curve', type: 'report', transport: 'rest' },
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
    {
      id: 'equities',
      label: 'Equities',
      type: 'group',
      children: [
        { id: 'stocks', label: 'Stocks', type: 'report', transport: 'ws' },
        { id: 'etfs', label: 'ETFs', type: 'report', transport: 'rest' },
      ],
    },
  ];
}

/**
 * Build a contract-shaped `ReportState` with sensible defaults, overridable
 * per-test via `overrides`.
 */
export function buildReportStateFixture(
  overrides: Partial<ReportState> = {}
): ReportState {
  return {
    reportId: 'fx-forwards',
    transport: 'rest',
    columns: [
      { key: 'symbol', label: 'Symbol', type: 'string', align: 'left' },
      { key: 'qty', label: 'Qty', type: 'number', align: 'right' },
      { key: 'px', label: 'Price', type: 'price', align: 'right' },
      { key: 'chg', label: 'Chg %', type: 'pct', align: 'right' },
      { key: 'ts', label: 'Updated', type: 'timestamp', align: 'right' },
    ],
    rows: [
      { id: 'r1', symbol: 'EURUSD', qty: 1000000, px: 1.0852, chg: 0.12, ts: '2026-08-06T09:30:00.000Z' },
      { id: 'r2', symbol: 'GBPUSD', qty: 500000, px: 1.2731, chg: -0.34, ts: '2026-08-06T09:30:01.000Z' },
      { id: 'r3', symbol: 'USDJPY', qty: 750000, px: 148.02, chg: 0.05, ts: '2026-08-06T09:30:02.000Z' },
    ],
    loading: false,
    error: null,
    mode: 'live',
    paused: false,
    eodDate: null,
    asOf: '2026-08-06T09:30:02.000Z',
    connectionStatus: 'idle',
    ...overrides,
  };
}

export default renderWithProviders;
