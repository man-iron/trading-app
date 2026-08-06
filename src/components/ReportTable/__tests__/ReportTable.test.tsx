/**
 * Tests for ReportTable: sorting cycles (per nextSortState), per-column
 * filtering (incl. numeric operators + fallback), cell formatting, pct sign
 * coloring, flash class for recently ticked rows, empty state and the
 * "x of y rows" footer.
 */
import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import renderWithProviders from '../../../testUtils/renderWithProviders';
import { formatCell } from '../../../helpers/formatHelpers';
import { LAST_TICK_FIELD } from '../../../constants/reportConstants';
import type { ColumnDef, ReportRow } from '../../../types';
import ReportTable from '../ReportTable';

const columns: ColumnDef[] = [
  { key: 'symbol', label: 'Symbol', type: 'string', align: 'left' },
  { key: 'qty', label: 'Qty', type: 'number', align: 'right' },
  { key: 'px', label: 'Price', type: 'price', align: 'right' },
  { key: 'chg', label: 'Chg %', type: 'pct', align: 'right' },
];

const rows: ReportRow[] = [
  { id: 'r1', symbol: 'EURUSD', qty: 1000000, px: 1.0852, chg: 0.12 },
  { id: 'r2', symbol: 'GBPUSD', qty: 500000, px: 1.2731, chg: -0.34 },
  { id: 'r3', symbol: 'USDJPY', qty: 750000, px: 148.02, chg: 0 },
];

/** Text of the first (symbol) cell of every body row, in display order. */
function symbolColumn(): string[] {
  const table = screen.getByRole('table', { name: 'report table' });
  const bodyRows = within(table).getAllByRole('row').slice(2); // 2 header rows
  return bodyRows.map((row) => within(row).getAllByRole('cell')[0].textContent ?? '');
}

/** The body-row cell that displays the given text. */
function cellByText(text: string): HTMLElement {
  return screen.getByText(text).closest('td') as HTMLElement;
}

describe('ReportTable', () => {
  describe('rendering & formatting', () => {
    it('renders one header cell per column', () => {
      renderWithProviders(<ReportTable columns={columns} rows={rows} />);
      for (const column of columns) {
        expect(screen.getByText(column.label)).toBeInTheDocument();
      }
    });

    it('formats cells via formatCell per column type', () => {
      renderWithProviders(<ReportTable columns={columns} rows={rows} />);
      // number -> grouped
      expect(screen.getByText('1,000,000')).toBeInTheDocument();
      // price -> 2 decimals
      expect(screen.getByText(formatCell(148.02, 'price'))).toBeInTheDocument();
      expect(screen.getByText('148.02')).toBeInTheDocument();
      // pct -> signed
      expect(screen.getByText('+0.12%')).toBeInTheDocument();
      expect(screen.getByText('-0.34%')).toBeInTheDocument();
      expect(screen.getByText('+0.00%')).toBeInTheDocument();
    });

    it('right-aligns numeric columns and left-aligns strings', () => {
      renderWithProviders(<ReportTable columns={columns} rows={rows} />);
      expect(cellByText('1,000,000').className).toMatch(/numericCell/);
      expect(cellByText('EURUSD').className).not.toMatch(/numericCell/);
    });

    it('colors pct cells by sign and leaves zero neutral', () => {
      renderWithProviders(<ReportTable columns={columns} rows={rows} />);
      expect(cellByText('+0.12%').className).toMatch(/pctUp/);
      expect(cellByText('-0.34%').className).toMatch(/pctDown/);
      const zeroCell = cellByText('+0.00%');
      expect(zeroCell.className).not.toMatch(/pctUp/);
      expect(zeroCell.className).not.toMatch(/pctDown/);
    });
  });

  describe('sorting', () => {
    it('sorts ascending on first header click', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ReportTable columns={columns} rows={rows} />);
      await user.click(screen.getByText('Qty'));
      expect(symbolColumn()).toEqual(['GBPUSD', 'USDJPY', 'EURUSD']);
    });

    it('cycles asc -> desc -> asc on repeated clicks (nextSortState)', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ReportTable columns={columns} rows={rows} />);
      const header = screen.getByText('Qty');
      await user.click(header);
      expect(symbolColumn()).toEqual(['GBPUSD', 'USDJPY', 'EURUSD']);
      await user.click(header);
      expect(symbolColumn()).toEqual(['EURUSD', 'USDJPY', 'GBPUSD']);
      await user.click(header);
      expect(symbolColumn()).toEqual(['GBPUSD', 'USDJPY', 'EURUSD']);
    });

    it('switching to a new column restarts at ascending', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ReportTable columns={columns} rows={rows} />);
      await user.click(screen.getByText('Qty'));
      await user.click(screen.getByText('Qty')); // qty desc
      await user.click(screen.getByText('Symbol')); // new column -> asc
      expect(symbolColumn()).toEqual(['EURUSD', 'GBPUSD', 'USDJPY']);
    });

    it('renders rows in original order when unsorted', () => {
      renderWithProviders(<ReportTable columns={columns} rows={rows} />);
      expect(symbolColumn()).toEqual(['EURUSD', 'GBPUSD', 'USDJPY']);
    });
  });

  describe('filtering', () => {
    it('filters string columns by case-insensitive substring', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ReportTable columns={columns} rows={rows} />);
      await user.type(screen.getByLabelText('Filter Symbol'), 'eur');
      expect(symbolColumn()).toEqual(['EURUSD']);
      expect(screen.getByTestId('report-table-footer')).toHaveTextContent(
        '1 of 3 rows'
      );
    });

    it('supports numeric operator filters (> / <= / =)', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ReportTable columns={columns} rows={rows} />);
      const qtyFilter = screen.getByLabelText('Filter Qty');

      await user.type(qtyFilter, '>600000');
      expect(symbolColumn()).toEqual(['EURUSD', 'USDJPY']);

      await user.clear(qtyFilter);
      await user.type(qtyFilter, '<=500000');
      expect(symbolColumn()).toEqual(['GBPUSD']);

      await user.clear(qtyFilter);
      await user.type(qtyFilter, '=750000');
      expect(symbolColumn()).toEqual(['USDJPY']);
    });

    it('falls back to substring matching on numeric columns without an operator', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ReportTable columns={columns} rows={rows} />);
      await user.type(screen.getByLabelText('Filter Price'), '148');
      expect(symbolColumn()).toEqual(['USDJPY']);
    });

    it('combines filters across columns with logical AND', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ReportTable columns={columns} rows={rows} />);
      await user.type(screen.getByLabelText('Filter Symbol'), 'usd');
      expect(symbolColumn()).toEqual(['EURUSD', 'GBPUSD', 'USDJPY']);
      await user.type(screen.getByLabelText('Filter Qty'), '>600000');
      expect(symbolColumn()).toEqual(['EURUSD', 'USDJPY']);
    });

    it('clearing a filter restores the hidden rows', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ReportTable columns={columns} rows={rows} />);
      const filter = screen.getByLabelText('Filter Symbol');
      await user.type(filter, 'eur');
      expect(symbolColumn()).toEqual(['EURUSD']);
      await user.clear(filter);
      expect(symbolColumn()).toEqual(['EURUSD', 'GBPUSD', 'USDJPY']);
    });
  });

  describe('empty state & footer', () => {
    it('shows the default empty message when there are no rows', () => {
      renderWithProviders(<ReportTable columns={columns} rows={[]} />);
      expect(screen.getByText('No rows to display')).toBeInTheDocument();
      expect(screen.getByTestId('report-table-footer')).toHaveTextContent(
        '0 of 0 rows'
      );
    });

    it('shows a custom empty message', () => {
      renderWithProviders(
        <ReportTable columns={columns} rows={[]} emptyMessage="Nothing here" />
      );
      expect(screen.getByText('Nothing here')).toBeInTheDocument();
    });

    it('shows the empty message when filters exclude every row', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ReportTable columns={columns} rows={rows} />);
      await user.type(screen.getByLabelText('Filter Symbol'), 'zzz');
      expect(screen.getByText('No rows to display')).toBeInTheDocument();
      expect(screen.getByTestId('report-table-footer')).toHaveTextContent(
        '0 of 3 rows'
      );
    });

    it('footer reports total visible vs total rows', () => {
      renderWithProviders(<ReportTable columns={columns} rows={rows} />);
      expect(screen.getByTestId('report-table-footer')).toHaveTextContent(
        '3 of 3 rows'
      );
    });
  });

  describe('flash on recent ticks', () => {
    it('applies the flash class to cells of rows ticked within the window', () => {
      const ticked: ReportRow[] = [
        { ...rows[0], [LAST_TICK_FIELD]: Date.now() },
        rows[1],
      ];
      renderWithProviders(<ReportTable columns={columns} rows={ticked} />);
      expect(cellByText('EURUSD').className).toMatch(/flashCell/);
      expect(cellByText('GBPUSD').className).not.toMatch(/flashCell/);
    });

    it('does not flash rows whose tick is older than the window', () => {
      const stale: ReportRow[] = [
        { ...rows[0], [LAST_TICK_FIELD]: Date.now() - 5000 },
      ];
      renderWithProviders(<ReportTable columns={columns} rows={stale} />);
      expect(cellByText('EURUSD').className).not.toMatch(/flashCell/);
    });
  });
});
