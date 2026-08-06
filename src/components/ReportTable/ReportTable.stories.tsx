/**
 * Storybook stories for ReportTable: a populated FX-style grid, a variant
 * with freshly ticked rows (flash animation), pre-sorted and pre-filtered
 * states (driven via play functions on the LOCAL sort/filter state), and the
 * empty state.
 */
import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { ThemeProvider as JssThemeProvider } from 'react-jss';

import { muiTheme, jssTheme } from '../../styles/theme';
import { LAST_TICK_FIELD } from '../../constants/reportConstants';
import type { ColumnDef, ReportRow } from '../../types';
import ReportTable from './ReportTable';

const columns: ColumnDef[] = [
  { key: 'symbol', label: 'Symbol', type: 'string', align: 'left' },
  { key: 'qty', label: 'Qty', type: 'number', align: 'right' },
  { key: 'px', label: 'Price', type: 'price', align: 'right' },
  { key: 'chg', label: 'Chg %', type: 'pct', align: 'right' },
  { key: 'ts', label: 'Updated', type: 'timestamp', align: 'right' },
];

const rows: ReportRow[] = [
  { id: 'r1', symbol: 'EURUSD', qty: 1000000, px: 1.0852, chg: 0.12, ts: '2026-08-06T09:30:00.000Z' },
  { id: 'r2', symbol: 'GBPUSD', qty: 500000, px: 1.2731, chg: -0.34, ts: '2026-08-06T09:30:01.000Z' },
  { id: 'r3', symbol: 'USDJPY', qty: 750000, px: 148.02, chg: 0.05, ts: '2026-08-06T09:30:02.000Z' },
  { id: 'r4', symbol: 'AUDUSD', qty: 2500000, px: 0.6549, chg: -0.81, ts: '2026-08-06T09:30:03.000Z' },
  { id: 'r5', symbol: 'USDCHF', qty: 1250000, px: 0.8712, chg: 0.27, ts: '2026-08-06T09:30:04.000Z' },
  { id: 'r6', symbol: 'USDCAD', qty: 900000, px: 1.3654, chg: 0, ts: '2026-08-06T09:30:05.000Z' },
  { id: 'r7', symbol: 'NZDUSD', qty: 300000, px: 0.5998, chg: -1.12, ts: '2026-08-06T09:30:06.000Z' },
  { id: 'r8', symbol: 'EURGBP', qty: 675000, px: 0.8525, chg: 0.44, ts: '2026-08-06T09:30:07.000Z' },
];

const meta: Meta<typeof ReportTable> = {
  title: 'Components/ReportTable',
  component: ReportTable,
  decorators: [
    (Story) => (
      <MuiThemeProvider theme={muiTheme}>
        <JssThemeProvider theme={jssTheme}>
          <div style={{ height: 420, display: 'flex' }}>
            <Story />
          </div>
        </JssThemeProvider>
      </MuiThemeProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof ReportTable>;

/** FX-style grid with the full column-type spread. */
export const Populated: Story = {
  args: { columns, rows },
};

/** Rows ticked moments ago play the amber flash animation on load. */
export const WithRecentTicks: Story = {
  render: (args) => {
    const ticked = rows.map((row, index) =>
      index % 3 === 0 ? { ...row, [LAST_TICK_FIELD]: Date.now() } : row
    );
    return <ReportTable {...args} rows={ticked} />;
  },
  args: { columns, rows },
};

/** Sorted descending by Qty via two header clicks (local SortState). */
export const Sorted: Story = {
  args: { columns, rows },
  play: async ({ canvasElement }) => {
    const header = Array.from(canvasElement.querySelectorAll('span')).find(
      (el) => el.textContent === 'Qty'
    );
    header?.click();
    header?.click();
  },
};

/** Filtered to EUR pairs via the Symbol filter field (local FilterState). */
export const Filtered: Story = {
  args: { columns, rows },
  play: async ({ canvasElement }) => {
    const input = canvasElement.querySelector<HTMLInputElement>(
      'input[aria-label="Filter Symbol"]'
    );
    if (!input) return;
    const valueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;
    valueSetter?.call(input, 'EUR');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  },
};

/** No rows at all — shows the (custom) empty message. */
export const Empty: Story = {
  args: { columns, rows: [], emptyMessage: 'No positions for this desk' },
};
