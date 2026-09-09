import React, { Component } from 'react';
import { withStyles } from 'react-jss';
import styles from '../../styles/components/StatusBar.styles';

/** Left-pad a non-negative integer to two digits. */
const pad2 = (n) => String(n).padStart(2, '0');

/**
 * Format a Date as a local 24h `HH:MM:SS` clock string.
 * @param {Date} date
 * @returns {string}
 */
export const formatClock = (date) =>
  `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;

/**
 * StatusBar — retro class-based bottom status strip.
 *
 * Shows (left to right): the signed-in user's name / desk / role, the
 * currently selected report label, and a live local-time clock. The clock is
 * driven by the classic retro pattern: an interval started in
 * `componentDidMount`, ticking local state every second, cleared in
 * `componentWillUnmount`.
 *
 * @class StatusBar
 *
 * Props:
 * @property {Object} classes
 *   JSS classes injected by `withStyles(styles)` (StatusBar.styles.js).
 * @property {import('../../types').UserData|null} [user]
 *   The signed-in user; renders a "NOT SIGNED IN" placeholder when absent.
 * @property {string|null} [selectedReportLabel]
 *   Label of the currently selected report; renders "NO REPORT" when absent.
 */
class StatusBar extends Component {
  constructor(props) {
    super(props);
    /** @type {{ now: Date }} */
    this.state = { now: new Date() };
    /** @type {ReturnType<typeof setInterval>|null} */
    this.intervalId = null;
    this.handleTick = this.handleTick.bind(this);
  }

  componentDidMount() {
    // Classic retro clock: tick once a second while mounted.
    this.intervalId = setInterval(this.handleTick, 1000);
  }

  componentWillUnmount() {
    // Always clear the interval so no setState fires after unmount.
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /** Advance the clock to the current time. */
  handleTick() {
    this.setState({ now: new Date() });
  }

  renderUserSection() {
    const { classes, user } = this.props;
    const userName = user.name;
    if (user == null) {
      return <span className={classes.placeholder}>NOT SIGNED IN</span>;
    }
    return (
      <>
        <span className={classes.userName}>{userName}</span>
        <span className={classes.separator}>{'//'}</span>
        <span>{user.desk}</span>
        <span className={classes.separator}>{'//'}</span>
        <span>{user.role}</span>
      </>
    );
  }

  renderReportSection() {
    const { classes, selectedReportLabel } = this.props;
    const emptyReportLabel = selectedReportLabel || noReportText;
    return (
      <>
        <span className={classes.fieldLabel}>RPT</span>
        {selectedReportLabel ? (
          <span className={classes.reportLabel}>{selectedReportLabel}</span>
        ) : (
          <span className={classes.placeholder}>{emptyReportLabel}</span>
        )}
      </>
    );
  }

  render() {
    const { classes } = this.props;
    const { now } = this.state;
    return (
      <footer className={classes.root} data-testid="status-bar">
        <div className={classes.section}>{this.renderUserSection()}</div>
        <div className={classes.section}>{this.renderReportSection()}</div>
        <div className={classes.section}>
          <time className={classes.clock} data-testid="status-clock">
            {formatClock(now)}
          </time>
        </div>
      </footer>
    );
  }
}

export default withStyles(styles)(StatusBar);
export { StatusBar as UnstyledStatusBar };
