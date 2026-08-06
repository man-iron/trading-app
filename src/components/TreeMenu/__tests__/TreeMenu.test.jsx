/**
 * Tests for the class-based TreeMenu presentational component.
 *
 * TreeMenu receives the flat render list from `flattenMenuForRender` and maps
 * over it — these tests feed it real flattened fixtures and assert rendering,
 * callbacks, selection styling, and transport badges.
 */
import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import TreeMenu from '../TreeMenu';
import { flattenMenuForRender } from '../../../helpers/menuHelpers';
import {
  renderWithProviders,
  buildMenuFixture,
} from '../../../testUtils/renderWithProviders';

/** Render TreeMenu with sensible default props, overridable per test. */
function renderTree(overrides = {}) {
  const props = {
    items: flattenMenuForRender(buildMenuFixture(), []),
    selectedReportId: null,
    onToggleGroup: vi.fn(),
    onSelectReport: vi.fn(),
    ...overrides,
  };
  const result = renderWithProviders(<TreeMenu {...props} />);
  return { ...result, props };
}

/** Flatten the standard fixture with the given expanded ids. */
function flatten(expandedIds) {
  return flattenMenuForRender(buildMenuFixture(), expandedIds);
}

describe('TreeMenu', () => {
  describe('rendering', () => {
    it('renders only top-level groups when nothing is expanded', () => {
      renderTree();
      expect(screen.getByText('Markets')).toBeInTheDocument();
      expect(screen.getByText('Derivatives')).toBeInTheDocument();
      expect(screen.getByText('Equities')).toBeInTheDocument();
      expect(screen.queryByText('FX')).not.toBeInTheDocument();
      expect(screen.queryByText('FX Spot')).not.toBeInTheDocument();
      expect(screen.getAllByRole('button')).toHaveLength(3);
    });

    it('renders an accessible list with no rows for an empty items array', () => {
      renderTree({ items: [] });
      expect(
        screen.getByRole('list', { name: /report navigation tree/i })
      ).toBeInTheDocument();
      expect(screen.queryAllByRole('button')).toHaveLength(0);
    });

    it('tolerates a missing items prop', () => {
      renderTree({ items: undefined });
      expect(screen.queryAllByRole('button')).toHaveLength(0);
    });

    it('renders level-2 children when a level-1 group is expanded', () => {
      renderTree({ items: flatten(['markets']) });
      expect(screen.getByText('FX')).toBeInTheDocument();
      expect(screen.getByText('Rates')).toBeInTheDocument();
      expect(screen.getByText('Credit')).toBeInTheDocument();
      // Level-3 reports stay hidden until their own group is expanded.
      expect(screen.queryByText('FX Spot')).not.toBeInTheDocument();
    });

    it('renders level-3 reports when both ancestor groups are expanded', () => {
      renderTree({ items: flatten(['markets', 'markets-fx']) });
      expect(screen.getByText('FX Spot')).toBeInTheDocument();
      expect(screen.getByText('FX Forwards')).toBeInTheDocument();
    });

    it('shows a collapsed chevron for collapsed groups and an expand icon for expanded ones', () => {
      renderTree({ items: flatten(['markets']) });
      const markets = screen.getByRole('button', { name: /markets/i });
      expect(within(markets).getByTestId('ExpandMoreIcon')).toBeInTheDocument();
      const derivatives = screen.getByRole('button', { name: /derivatives/i });
      expect(within(derivatives).getByTestId('ChevronRightIcon')).toBeInTheDocument();
    });

    it('sets aria-expanded on group rows but not report rows', () => {
      renderTree({ items: flatten(['markets', 'markets-fx']) });
      expect(screen.getByRole('button', { name: /^markets$/i })).toHaveAttribute(
        'aria-expanded',
        'true'
      );
      expect(screen.getByRole('button', { name: /derivatives/i })).toHaveAttribute(
        'aria-expanded',
        'false'
      );
      expect(screen.getByRole('button', { name: /fx spot/i })).not.toHaveAttribute(
        'aria-expanded'
      );
    });

    it('applies depth classes matching each row depth', () => {
      renderTree({ items: flatten(['markets', 'markets-fx']) });
      expect(screen.getByRole('button', { name: /^markets$/i }).className).toMatch(/depth0/);
      expect(screen.getByRole('button', { name: /^fx$/i }).className).toMatch(/depth1/);
      expect(screen.getByRole('button', { name: /fx spot/i }).className).toMatch(/depth2/);
    });
  });

  describe('interaction', () => {
    it('clicking a group row calls onToggleGroup with the group id and never onSelectReport', async () => {
      const user = userEvent.setup();
      const { props } = renderTree();
      await user.click(screen.getByRole('button', { name: /markets/i }));
      expect(props.onToggleGroup).toHaveBeenCalledTimes(1);
      expect(props.onToggleGroup).toHaveBeenCalledWith('markets');
      expect(props.onSelectReport).not.toHaveBeenCalled();
    });

    it('clicking a nested group row calls onToggleGroup with the nested id', async () => {
      const user = userEvent.setup();
      const { props } = renderTree({ items: flatten(['markets']) });
      await user.click(screen.getByRole('button', { name: /^fx$/i }));
      expect(props.onToggleGroup).toHaveBeenCalledWith('markets-fx');
    });

    it('clicking a report row calls onSelectReport with the full node and never onToggleGroup', async () => {
      const user = userEvent.setup();
      const { props } = renderTree({ items: flatten(['markets', 'markets-fx']) });
      await user.click(screen.getByRole('button', { name: /fx spot/i }));
      expect(props.onSelectReport).toHaveBeenCalledTimes(1);
      expect(props.onSelectReport).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'fx-spot', label: 'FX Spot', type: 'report', transport: 'ws' })
      );
      expect(props.onToggleGroup).not.toHaveBeenCalled();
    });

    it('clicking a level-2 report row (e.g. Swaps) selects it', async () => {
      const user = userEvent.setup();
      const { props } = renderTree({ items: flatten(['derivatives']) });
      await user.click(screen.getByRole('button', { name: /swaps/i }));
      expect(props.onSelectReport).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'swaps', transport: 'rest' })
      );
    });
  });

  describe('selection styling', () => {
    it('marks the selected report row with the amber selected class and aria-current', () => {
      renderTree({
        items: flatten(['markets', 'markets-fx']),
        selectedReportId: 'fx-spot',
      });
      const selected = screen.getByRole('button', { name: /fx spot/i });
      expect(selected.className).toMatch(/rowSelected/);
      expect(selected).toHaveAttribute('aria-current', 'true');
    });

    it('does not mark unselected rows or groups as selected', () => {
      renderTree({
        items: flatten(['markets', 'markets-fx']),
        selectedReportId: 'fx-spot',
      });
      const other = screen.getByRole('button', { name: /fx forwards/i });
      expect(other.className).not.toMatch(/rowSelected/);
      expect(other).not.toHaveAttribute('aria-current');
      // A group with the same id would never be selected; groups are exempt.
      const group = screen.getByRole('button', { name: /^markets$/i });
      expect(group.className).not.toMatch(/rowSelected/);
    });

    it('applies no selected styling when selectedReportId is null', () => {
      renderTree({ items: flatten(['markets', 'markets-fx']), selectedReportId: null });
      screen.getAllByRole('button').forEach((row) => {
        expect(row.className).not.toMatch(/rowSelected/);
      });
    });
  });

  describe('transport badges', () => {
    it('shows a LIVE badge with pulse dot on ws reports', () => {
      renderTree({ items: flatten(['markets', 'markets-fx']) });
      const row = screen.getByRole('button', { name: /fx spot/i });
      const badge = within(row).getByTestId('badge-live');
      expect(badge).toHaveTextContent('LIVE');
      // The pulsing dot span is present inside the badge.
      expect(badge.querySelector('span')).not.toBeNull();
    });

    it('shows a grey EOD chip on rest reports', () => {
      renderTree({ items: flatten(['markets', 'markets-fx']) });
      const row = screen.getByRole('button', { name: /fx forwards/i });
      expect(within(row).getByTestId('badge-eod')).toHaveTextContent('EOD');
      expect(within(row).queryByTestId('badge-live')).not.toBeInTheDocument();
    });

    it('shows no badge on group rows', () => {
      renderTree({ items: flatten(['markets']) });
      const group = screen.getByRole('button', { name: /^markets$/i });
      expect(within(group).queryByTestId('badge-live')).not.toBeInTheDocument();
      expect(within(group).queryByTestId('badge-eod')).not.toBeInTheDocument();
    });

    it('renders one badge per report across a fully expanded tree', () => {
      renderTree({
        items: flatten([
          'markets',
          'markets-fx',
          'markets-rates',
          'markets-credit',
          'derivatives',
          'derivatives-commodities',
          'equities',
        ]),
      });
      // Fixture: 4 ws reports and 6 rest reports in total.
      expect(screen.getAllByTestId('badge-live')).toHaveLength(4);
      expect(screen.getAllByTestId('badge-eod')).toHaveLength(6);
    });
  });
});
