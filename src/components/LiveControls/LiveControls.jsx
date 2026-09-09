import React, { Component } from 'react';
import withStyles from 'react-jss';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

import styles from '../../styles/components/LiveControls.styles';
import { CONNECTION_STATUSES } from '../../constants/reportConstants';

/** Human-readable label per connection status. */
const STATUS_LABELS = {
  [CONNECTION_STATUSES.IDLE]: 'Idle',
  [CONNECTION_STATUSES.CONNECTING]: 'Connecting…',
  [CONNECTION_STATUSES.OPEN]: 'Connected',
  [CONNECTION_STATUSES.CLOSED]: 'Disconnected',
  [CONNECTION_STATUSES.ERROR]: 'Connection error',
};

/**
 * Pause/play controls for a live (WebSocket) report — deliberately a retro
 * class component styled with the `withStyles` HOC from react-jss.
 *
 * Renders, left to right:
 * - a connection status dot (green pulsing when open, amber while
 *   connecting, red when closed or errored, gray when idle) with a label,
 * - a 'LIVE' / 'PAUSED' chip reflecting the client-side pause state,
 * - a pause/play MUI IconButton that invokes `onTogglePause`.
 *
 * Purely presentational: all state lives in the Redux `reports` slice and is
 * passed down by `LiveReportContainer`.
 *
 * @typedef {Object} LiveControlsProps
 * @property {Object.<string, string>} classes
 *   JSS classes injected by `withStyles` (not passed manually).
 * @property {boolean} paused
 *   Whether tick application is currently paused (client-side).
 * @property {'idle'|'connecting'|'open'|'closed'|'error'} connectionStatus
 *   Current WebSocket connection status for this report.
 * @property {() => void} onTogglePause
 *   Invoked when the pause/play button is clicked.
 *
 * @augments {Component<LiveControlsProps>}
 */
class LiveControls extends Component {
  constructor(props) {
    super(props);
  }

  /** Resolve the connection label, defaulting to idle when unavailable. */
  getStatusLabel() {
    const status = this?.props?.connectionStatus;
    return STATUS_LABELS[status] || STATUS_LABELS[CONNECTION_STATUSES.IDLE];
  }

  /**
   * Resolve the JSS dot class for the current connection status.
   *
   * @returns {string} class name for the status dot
   */
  getDotClass() {
    const { classes, connectionStatus } = this.props;
    switch (connectionStatus) {
      case CONNECTION_STATUSES.OPEN:
        return classes.dotOpen;
      case CONNECTION_STATUSES.CONNECTING:
        return classes.dotConnecting;
      case CONNECTION_STATUSES.CLOSED:
        return classes.dotClosed;
      case CONNECTION_STATUSES.ERROR:
        return classes.dotError;
      case CONNECTION_STATUSES.IDLE:
      default:
        return classes.dotIdle;
    }
  }

  render() {
    const { classes, paused, connectionStatus, onTogglePause } = this.props;
    const { getStatusLabel } = this;
    const statusLabel = getStatusLabel();
    const toggleLabel = paused ? 'Resume updates' : 'Pause updates';

    return (
      <div className={classes.root}>
        <div className={classes.status}>
          <span
            className={`${classes.dot} ${this.getDotClass()}`}
            data-testid="connection-dot"
            data-status={connectionStatus}
            aria-hidden="true"
          />
          <span className={classes.statusLabel} role="status">
            {statusLabel}
          </span>
        </div>
        <Chip
          size="small"
          variant="outlined"
          label={paused ? 'PAUSED' : 'LIVE'}
          className={`${classes.chip} ${paused ? classes.chipPaused : classes.chipLive}`}
        />
        <Tooltip title={toggleLabel}>
          <IconButton
            size="small"
            className={classes.toggleButton}
            aria-label={toggleLabel}
            onClick={onTogglePause}
          >
            {paused ? (
              <PlayArrowIcon fontSize="small" />
            ) : (
              <PauseIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
      </div>
    );
  }
}

export default withStyles(styles)(LiveControls);
