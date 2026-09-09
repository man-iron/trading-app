import {
  APP_INIT_SUCCESS,
  MENU_SET_ITEMS,
  MENU_TOGGLE_NODE,
  MENU_SELECT_REPORT,
} from '../../constants/actionTypes';

/**
 * Toggle one id in the caller-owned expansion list.
 * @param {string[]} expandedIds
 * @param {string} nodeId
 */
function toggleExpandedId(expandedIds, nodeId) {
  const existingIndex = expandedIds.indexOf(nodeId);
  if (existingIndex >= 0) {
    expandedIds.splice(existingIndex, 1);
  } else {
    expandedIds.push(nodeId);
  }
}

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
      const { menuData, userData } = action.payload;
      const defaultReportId =
        (userData && userData.preferences && userData.preferences.defaultReportId) ||
        null;
      return {
        ...state,
        items: menuData,
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
      toggleExpandedId(state.expandedIds, action.payload);
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
