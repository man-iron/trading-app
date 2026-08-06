import { describe, it, expect } from 'vitest';
import menuReducer, { initialState } from '../reducer';
import { setMenuItems, toggleMenuNode, selectReport } from '../actions';
import {
  MENU_SET_ITEMS,
  MENU_TOGGLE_NODE,
  MENU_SELECT_REPORT,
} from '../../../constants/actionTypes';
import { appInitSuccess } from '../../app/actions';

const menuData = [
  {
    id: 'markets',
    label: 'Markets',
    type: 'group',
    children: [
      {
        id: 'fx',
        label: 'FX',
        type: 'group',
        children: [
          { id: 'fx-spot', label: 'FX Spot', type: 'report', transport: 'ws' },
        ],
      },
    ],
  },
];

const makeInitResponse = (defaultReportId) => ({
  userData: {
    id: 'u1',
    name: 'Ada Trader',
    role: 'trader',
    email: 'ada@example.com',
    desk: 'FX',
    preferences: { theme: 'dark', defaultReportId },
  },
  menuData,
  eodDates: ['2026-08-05'],
});

describe('menu action creators', () => {
  it('setMenuItems creates MENU_SET_ITEMS with the items payload', () => {
    expect(setMenuItems(menuData)).toEqual({
      type: MENU_SET_ITEMS,
      payload: menuData,
    });
  });

  it('toggleMenuNode creates MENU_TOGGLE_NODE with the node id payload', () => {
    expect(toggleMenuNode('fx')).toEqual({
      type: MENU_TOGGLE_NODE,
      payload: 'fx',
    });
  });

  it('selectReport creates MENU_SELECT_REPORT with { reportId } payload', () => {
    expect(selectReport('fx-spot')).toEqual({
      type: MENU_SELECT_REPORT,
      payload: { reportId: 'fx-spot' },
    });
  });
});

describe('menu reducer', () => {
  it('returns the initial state for an unknown action', () => {
    expect(menuReducer(undefined, { type: '@@INIT' })).toEqual(initialState);
  });

  it('has the contract initial shape', () => {
    expect(initialState).toEqual({
      items: [],
      expandedIds: [],
      selectedReportId: null,
    });
  });

  describe('APP_INIT_SUCCESS', () => {
    it('seeds items, expands nothing, selects the default report id', () => {
      const next = menuReducer(
        initialState,
        appInitSuccess(makeInitResponse('fx-spot'))
      );
      expect(next.items).toBe(menuData);
      expect(next.expandedIds).toEqual([]);
      expect(next.selectedReportId).toBe('fx-spot');
    });

    it('leaves selection null when defaultReportId is null', () => {
      const next = menuReducer(
        initialState,
        appInitSuccess(makeInitResponse(null))
      );
      expect(next.selectedReportId).toBeNull();
    });

    it('resets expandedIds even if previously expanded', () => {
      const prior = { ...initialState, expandedIds: ['markets', 'fx'] };
      const next = menuReducer(prior, appInitSuccess(makeInitResponse(null)));
      expect(next.expandedIds).toEqual([]);
    });
  });

  describe('MENU_SET_ITEMS', () => {
    it('replaces the items without touching selection or expansion', () => {
      const prior = {
        items: [],
        expandedIds: ['markets'],
        selectedReportId: 'fx-spot',
      };
      const next = menuReducer(prior, setMenuItems(menuData));
      expect(next.items).toBe(menuData);
      expect(next.expandedIds).toEqual(['markets']);
      expect(next.selectedReportId).toBe('fx-spot');
    });
  });

  describe('MENU_TOGGLE_NODE', () => {
    it('expands a collapsed node', () => {
      const next = menuReducer(initialState, toggleMenuNode('markets'));
      expect(next.expandedIds).toEqual(['markets']);
    });

    it('collapses an expanded node', () => {
      const expanded = menuReducer(initialState, toggleMenuNode('markets'));
      const next = menuReducer(expanded, toggleMenuNode('markets'));
      expect(next.expandedIds).toEqual([]);
    });

    it('keeps other expanded nodes intact when toggling', () => {
      let state = menuReducer(initialState, toggleMenuNode('markets'));
      state = menuReducer(state, toggleMenuNode('fx'));
      state = menuReducer(state, toggleMenuNode('markets'));
      expect(state.expandedIds).toEqual(['fx']);
    });
  });

  describe('MENU_SELECT_REPORT', () => {
    it('sets the selected report id', () => {
      const next = menuReducer(initialState, selectReport('rates-irs'));
      expect(next.selectedReportId).toBe('rates-irs');
    });

    it('replaces a previous selection', () => {
      const prior = { ...initialState, selectedReportId: 'fx-spot' };
      const next = menuReducer(prior, selectReport('etfs'));
      expect(next.selectedReportId).toBe('etfs');
    });
  });

  it('does not mutate the previous state', () => {
    const prior = { items: [], expandedIds: ['a'], selectedReportId: null };
    const snapshot = JSON.parse(JSON.stringify(prior));
    menuReducer(prior, toggleMenuNode('b'));
    menuReducer(prior, selectReport('x'));
    expect(prior).toEqual(snapshot);
  });

  it('returns the same reference for unrelated actions', () => {
    const state = menuReducer(initialState, toggleMenuNode('markets'));
    expect(menuReducer(state, { type: 'other/ACTION' })).toBe(state);
  });
});
