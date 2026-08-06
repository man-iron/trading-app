import {
  APP_INIT_SUCCESS,
  MENU_SET_ITEMS,
  MENU_TOGGLE_NODE,
  MENU_SELECT_REPORT,
} from '../../constants/actionTypes';
import MENU_DATA from '../../constants/menuData';

/**
 * @typedef {Object} MenuState
 * @property {import('../../types').MenuNode[]} items
 * @property {string[]} expandedIds
 * @property {string|null} selectedReportId
 */

/** @type {MenuState} */
export const initialState = {
  items: [],
  expandedIds: [],
  selectedReportId: null,
};

/**
 * Classic hand-rolled switch reducer for the sidebar menu. Also listens to
 * APP_INIT_SUCCESS to seed the tree from /api/init: items are set, nothing is
 * expanded, and the user's preferred default report (if any) is pre-selected.
 * @param {MenuState} state
 * @param {{ type: string, payload?: * }} action
 * @returns {MenuState}
 */
export default function menuReducer(state = initialState, action = {}) {
  switch (action.type) {
    case APP_INIT_SUCCESS: {
      const { userData } = action.payload;
      const defaultReportId =
        (userData && userData.preferences && userData.preferences.defaultReportId) ||
        null;
      return {
        ...state,
        items: MENU_DATA,
        expandedIds: [],
        selectedReportId: defaultReportId,
      };
    }
    case MENU_SET_ITEMS:
      return {
        ...state,
        items: action.payload,
      };
    case MENU_TOGGLE_NODE: {
      const nodeId = action.payload;
      const isExpanded = state.expandedIds.includes(nodeId);
      if (isExpanded) {
        state.expandedIds.splice(state.expandedIds.indexOf(nodeId), 1);
      } else {
        state.expandedIds.push(nodeId);
      }
      return state;
    }
    case MENU_SELECT_REPORT:
      return {
        ...state,
        selectedReportId: action.payload.reportId,
      };
    default:
      return state;
  }
}
