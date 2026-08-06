import React, { Component } from 'react';
import { withStyles } from 'react-jss';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { TRANSPORTS } from '../../constants/reportConstants';
import styles from '../../styles/components/TreeMenu.styles';

/**
 * TreeMenu — retro class-based sidebar navigation tree.
 *
 * Purely presentational: receives the ALREADY-FLATTENED render list produced
 * by `flattenMenuForRender` (src/helpers/menuHelpers.js) and simply maps over
 * it. There is deliberately NO recursion anywhere in this component — depth
 * comes pre-computed on each row (architecture-contract requirement).
 *
 * Group rows toggle expansion via `onToggleGroup`; report rows select via
 * `onSelectReport` and show a transport badge (pulsing green LIVE for `ws`,
 * grey EOD chip for `rest`).
 *
 * @class TreeMenu
 *
 * Props:
 * @property {Object} classes
 *   JSS classes injected by `withStyles(styles)` (TreeMenu.styles.js).
 * @property {Array<{node: import('../../types').MenuNode, depth: number, isExpanded: boolean, visible: boolean}>} items
 *   Flat, ordered render list from `flattenMenuForRender`.
 * @property {string|null} selectedReportId
 *   Id of the currently selected report node (amber highlight), or null.
 * @property {(nodeId: string) => void} onToggleGroup
 *   Called with the group node id when a group row is clicked.
 * @property {(node: import('../../types').MenuNode) => void} onSelectReport
 *   Called with the full report MenuNode when a report row is clicked.
 */
class TreeMenu extends Component {
  constructor(props) {
    super(props);
    // Retro pattern: bind instance handlers in the constructor.
    this.handleRowClick = this.handleRowClick.bind(this);
  }

  /**
   * Route a row click to the appropriate callback based on node type.
   * @param {{node: import('../../types').MenuNode}} row Flat render row.
   */
  handleRowClick(row) {
    const { onToggleGroup, onSelectReport } = this.props;
    if (row.node.type === 'group') {
      onToggleGroup(row.node.id);
    } else {
      onSelectReport(row.node);
    }
  }

  /**
   * Render the transport badge for a report row.
   * @param {import('../../types').Transport} transport 'ws' | 'rest'
   * @returns {React.ReactNode}
   */
  renderTransportBadge(transport) {
    const { classes } = this.props;
    if (transport === TRANSPORTS.WS) {
      return (
        <span className={`${classes.badge} ${classes.badgeLive}`} data-testid="badge-live">
          <span className={classes.liveDot} aria-hidden="true" />
          LIVE
        </span>
      );
    }
    return (
      <span className={`${classes.badge} ${classes.badgeEod}`} data-testid="badge-eod">
        EOD
      </span>
    );
  }

  /**
   * Render a single flat row (group or report). No recursion — depth is a
   * pre-computed property of the row.
   * @param {{node: import('../../types').MenuNode, depth: number, isExpanded: boolean}} row
   * @returns {React.ReactNode}
   */
  renderRow(row) {
    const { classes, selectedReportId } = this.props;
    const { node, depth, isExpanded } = row;
    const isGroup = node.type === 'group';
    const isSelected = !isGroup && node.id === selectedReportId;

    const className = [
      classes.row,
      classes[`depth${depth}`],
      isGroup ? classes.rowGroup : classes.rowReport,
      isSelected ? classes.rowSelected : null,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <ListItemButton
        key={node.id}
        dense
        disableGutters
        className={className}
        onClick={() => this.handleRowClick(row)}
        aria-expanded={isGroup ? isExpanded : undefined}
        aria-current={isSelected ? 'true' : undefined}
        data-node-id={node.id}
        data-depth={depth}
      >
        {isGroup &&
          (isExpanded ? (
            <ExpandMoreIcon className={classes.toggleIcon} />
          ) : (
            <ChevronRightIcon className={classes.toggleIcon} />
          ))}
        <span className={classes.label}>{node.label}</span>
        {!isGroup && this.renderTransportBadge(node.transport)}
      </ListItemButton>
    );
  }

  render() {
    const { classes, items } = this.props;
    const rows = Array.isArray(items) ? items : [];
    return (
      <List className={classes.root} disablePadding aria-label="Report navigation tree">
        {rows.map((row) => this.renderRow(row))}
      </List>
    );
  }
}

export default withStyles(styles)(TreeMenu);
export { TreeMenu as UnstyledTreeMenu };
