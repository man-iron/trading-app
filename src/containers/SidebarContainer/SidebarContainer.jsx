import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withStyles } from 'react-jss';
import TreeMenu from '../../components/TreeMenu';
import { flattenMenuForRender } from '../../helpers/menuHelpers';
import {
  selectMenuItems,
  selectExpandedIds,
  selectSelectedReportId,
} from '../../store/menu/selectors';
import { toggleMenuNode, selectReport } from '../../store/menu/actions';
import { reportOpened } from '../../store/reports/reportsSlice';
import styles from '../../styles/components/SidebarContainer.styles';

/**
 * SidebarContainer — retro class-based, Redux-`connect()`ed left navigation
 * panel. Renders the terminal-style "MARKETS NAVIGATOR" header and the
 * TreeMenu, wired to the `menu` branch of the store.
 *
 * State mapping: menu items + expandedIds are flattened via
 * `flattenMenuForRender` (loops, no recursion) so TreeMenu receives a flat
 * render list. Dispatch mapping: group clicks toggle MENU_TOGGLE_NODE; report
 * clicks dispatch MENU_SELECT_REPORT *and* the RTK `reportOpened` action so a
 * `reports.byId` entry exists before the report area mounts.
 *
 * @class SidebarContainer
 *
 * Props (all injected — `connect` + `withStyles`):
 * @property {Object} classes
 *   JSS classes injected by `withStyles(styles)` (SidebarContainer.styles.js).
 * @property {Array<{node: import('../../types').MenuNode, depth: number, isExpanded: boolean, visible: boolean}>} items
 *   Flat render list derived from the menu state.
 * @property {string|null} selectedReportId
 *   Currently selected report id from menu state.
 * @property {(nodeId: string) => void} onToggleGroup
 *   Dispatches MENU_TOGGLE_NODE for the clicked group.
 * @property {(node: import('../../types').MenuNode) => void} onSelectReport
 *   Dispatches MENU_SELECT_REPORT + reports/reportOpened for the clicked report.
 */
class SidebarContainer extends Component {
  render() {
    const { classes, items, selectedReportId, onToggleGroup, onSelectReport } = this.props;
    return (
      <aside className={classes.root} data-testid="sidebar">
        <header className={classes.header}>
          <span className={classes.prompt} aria-hidden="true">
            &gt;
          </span>
          MARKETS NAVIGATOR
          <span className={classes.cursor} aria-hidden="true" />
        </header>
        <nav className={classes.scrollArea} aria-label="Markets navigator">
          <TreeMenu
            items={items}
            selectedReportId={selectedReportId}
            onToggleGroup={onToggleGroup}
            onSelectReport={onSelectReport}
          />
        </nav>
      </aside>
    );
  }
}

/**
 * @param {*} state Root Redux state.
 */
const mapStateToProps = (state) => ({
  items: flattenMenuForRender(selectMenuItems(state), selectExpandedIds(state)),
  selectedReportId: selectSelectedReportId(state),
});

/**
 * @param {Function} dispatch Store dispatch.
 */
const mapDispatchToProps = (dispatch) => ({
  onToggleGroup: (nodeId) => dispatch(toggleMenuNode(nodeId)),
  onSelectReport: (node) => {
    dispatch(selectReport(node.id));
    dispatch(reportOpened({ reportId: node.id, transport: node.transport }));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(SidebarContainer));
export { SidebarContainer as UnconnectedSidebarContainer, mapStateToProps, mapDispatchToProps };
