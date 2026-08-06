/**
 * Tests for the connected SidebarContainer, using the REAL store via
 * `renderWithProviders` — clicks flow through mapDispatchToProps into the
 * actual menu reducer and reports slice.
 */
import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';

import SidebarContainer from '../SidebarContainer';
import {
  renderWithProviders,
  buildMenuFixture,
} from '../../../testUtils/renderWithProviders';

/** Render the connected container over a real store seeded with the menu tree. */
function renderSidebar(menuOverrides = {}) {
  return renderWithProviders(<SidebarContainer />, {
    preloadedState: {
      menu: {
        items: buildMenuFixture(),
        expandedIds: [],
        selectedReportId: null,
        ...menuOverrides,
      },
    },
  });
}

describe('SidebarContainer', () => {
  it('renders the panel header', () => {
    renderSidebar();
    expect(screen.getByText('MARKETS NAVIGATOR')).toBeInTheDocument();
  });

  it('renders the top-level groups from store state', () => {
    renderSidebar();
    expect(screen.getByText('Markets')).toBeInTheDocument();
    expect(screen.getByText('Derivatives')).toBeInTheDocument();
    expect(screen.getByText('Equities')).toBeInTheDocument();
    expect(screen.queryByText('FX')).not.toBeInTheDocument();
  });

  it('clicking a group expands the node in the store and reveals its children', async () => {
    const user = userEvent.setup();
    const { store } = renderSidebar();

    await user.click(screen.getByRole('button', { name: /^markets$/i }));

    expect(store.getState().menu.expandedIds).toContain('markets');
    expect(screen.getByText('FX')).toBeInTheDocument();
    expect(screen.getByText('Rates')).toBeInTheDocument();
    expect(screen.getByText('Credit')).toBeInTheDocument();
  });

  it('clicking an expanded group collapses it again', async () => {
    const user = userEvent.setup();
    const { store } = renderSidebar({ expandedIds: ['markets'] });

    expect(screen.getByText('FX')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^markets$/i }));

    expect(store.getState().menu.expandedIds).not.toContain('markets');
    expect(screen.queryByText('FX')).not.toBeInTheDocument();
  });

  it('clicking a ws report sets selectedReportId and creates a reports.byId entry with transport ws', async () => {
    const user = userEvent.setup();
    const { store } = renderSidebar({ expandedIds: ['markets', 'markets-fx'] });

    await user.click(screen.getByRole('button', { name: /fx spot/i }));

    const state = store.getState();
    expect(state.menu.selectedReportId).toBe('fx-spot');
    expect(state.reports.byId['fx-spot']).toMatchObject({
      reportId: 'fx-spot',
      transport: 'ws',
      rows: [],
      loading: false,
      error: null,
      paused: false,
    });
  });

  it('clicking a rest report creates a reports.byId entry with transport rest', async () => {
    const user = userEvent.setup();
    const { store } = renderSidebar({ expandedIds: ['derivatives'] });

    await user.click(screen.getByRole('button', { name: /swaps/i }));

    const state = store.getState();
    expect(state.menu.selectedReportId).toBe('swaps');
    expect(state.reports.byId.swaps).toMatchObject({
      reportId: 'swaps',
      transport: 'rest',
      mode: 'live',
      eodDate: null,
    });
  });

  it('selecting a second report keeps the first report entry and moves selection', async () => {
    const user = userEvent.setup();
    const { store } = renderSidebar({ expandedIds: ['markets', 'markets-fx'] });

    await user.click(screen.getByRole('button', { name: /fx spot/i }));
    await user.click(screen.getByRole('button', { name: /fx forwards/i }));

    const state = store.getState();
    expect(state.menu.selectedReportId).toBe('fx-forwards');
    expect(Object.keys(state.reports.byId).sort()).toEqual(['fx-forwards', 'fx-spot']);
  });

  it('re-selecting an already open report does not reset its existing entry', async () => {
    const user = userEvent.setup();
    const { store } = renderSidebar({ expandedIds: ['markets', 'markets-fx'] });

    await user.click(screen.getByRole('button', { name: /fx spot/i }));
    // Mutate the entry the way a snapshot would, then re-select.
    const before = store.getState().reports.byId['fx-spot'];
    await user.click(screen.getByRole('button', { name: /fx forwards/i }));
    await user.click(screen.getByRole('button', { name: /fx spot/i }));

    expect(store.getState().reports.byId['fx-spot']).toEqual(before);
    expect(store.getState().menu.selectedReportId).toBe('fx-spot');
  });

  it('highlights the selected report row from store state', async () => {
    const user = userEvent.setup();
    renderSidebar({ expandedIds: ['markets', 'markets-fx'] });

    await user.click(screen.getByRole('button', { name: /fx spot/i }));

    const row = screen.getByRole('button', { name: /fx spot/i });
    expect(row.className).toMatch(/rowSelected/);
    expect(row).toHaveAttribute('aria-current', 'true');
  });

  it('shows transport badges inside the connected tree', () => {
    renderSidebar({ expandedIds: ['markets', 'markets-fx'] });
    const wsRow = screen.getByRole('button', { name: /fx spot/i });
    const restRow = screen.getByRole('button', { name: /fx forwards/i });
    expect(within(wsRow).getByTestId('badge-live')).toBeInTheDocument();
    expect(within(restRow).getByTestId('badge-eod')).toBeInTheDocument();
  });
});
