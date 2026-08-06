import {
  MENU_SET_ITEMS,
  MENU_TOGGLE_NODE,
  MENU_SELECT_REPORT,
} from '../../constants/actionTypes';

/**
 * Replaces the menu tree.
 * @param {import('../../types').MenuNode[]} items
 * @returns {{ type: string, payload: import('../../types').MenuNode[] }}
 */
export const setMenuItems = (items) => ({
  type: MENU_SET_ITEMS,
  payload: items,
});

/**
 * Toggles a group's expanded/collapsed state.
 * @param {string} nodeId
 * @returns {{ type: string, payload: string }}
 */
export const toggleMenuNode = (nodeId) => ({
  type: MENU_TOGGLE_NODE,
  payload: nodeId,
});

/**
 * Selects a report node in the menu.
 * @param {string} reportId
 * @returns {{ type: string, payload: { reportId: string } }}
 */
export const selectReport = (reportId) => ({
  type: MENU_SELECT_REPORT,
  payload: { reportId },
});
