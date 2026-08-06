import { findNodeById } from '../../helpers/menuHelpers';

/**
 * Selectors for the `menu` state branch.
 * State shape: { items, expandedIds, selectedReportId }
 */

/** @param {*} state root state */
export const selectMenuItems = (state) => state.menu.items;

/** @param {*} state root state */
export const selectExpandedIds = (state) => state.menu.expandedIds;

/** @param {*} state root state */
export const selectSelectedReportId = (state) => state.menu.selectedReportId;

/**
 * The full MenuNode for the currently selected report, or null when nothing
 * is selected (or the id is not present in the tree).
 * @param {*} state root state
 * @returns {import('../../types').MenuNode|null}
 */
export const selectSelectedReportNode = (state) => {
  const { items, selectedReportId } = state.menu;
  if (!selectedReportId) {
    return null;
  }
  return findNodeById(items, selectedReportId) || null;
};
