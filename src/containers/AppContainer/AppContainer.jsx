import React, { Component } from 'react';
import { connect } from 'react-redux';
import withStyles from 'react-jss';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Skeleton from '@mui/material/Skeleton';

import initApp from '../../store/initThunk';
import {
  selectAppStatus,
  selectAppError,
  selectUserData,
} from '../../store/app/selectors';
import { selectSelectedReportNode } from '../../store/menu/selectors';
import { TRANSPORTS } from '../../constants/reportConstants';
import SidebarContainer from '../SidebarContainer';
import ReportContainer from '../ReportContainer';
import LiveReportContainer from '../LiveReportContainer';
import StatusBar from '../../components/StatusBar';
import styles from '../../styles/components/AppContainer.styles';

/**
 * AppContainer — the retro flagship: a class component wired to Redux with
 * `connect()`. Owns the top-level terminal chrome and orchestrates the app
 * lifecycle:
 *
 * - `componentDidMount` dispatches the `initApp` thunk (GET /api/init).
 * - While `status === 'loading'` (or still `'idle'`) it renders an MUI
 *   Skeleton mock of the final layout.
 * - On init failure it renders a styled error panel with a Retry button that
 *   re-dispatches the thunk.
 * - Once ready it renders the header strip ("RETRO TRADING TERMINAL" + user
 *   chip), the 300px `SidebarContainer` panel, the main report area, and the
 *   `StatusBar` pinned to the bottom.
 *
 * The main area switches on the selected menu node's transport:
 * `'ws'` -> `LiveReportContainer`, `'rest'` -> `ReportContainer`, and a
 * styled welcome/empty state when nothing is selected.
 *
 * Props (all injected):
 * @param {Object} props
 * @param {Object} props.classes JSS classes (injected by `withStyles`).
 * @param {'idle'|'loading'|'ready'|'error'} props.status App init status.
 * @param {string|null} props.error Init error message, when status==='error'.
 * @param {import('../../types').UserData|null} props.userData Current user.
 * @param {import('../../types').MenuNode|null} props.selectedNode Selected
 *   report node from the menu tree (null when nothing is selected).
 * @param {() => void} props.onInit Dispatches the init thunk.
 */
class AppContainer extends Component {
  constructor(props) {
    super(props);
    this.handleRetry = this.handleRetry.bind(this);
  }

  /** Kicks off the app bootstrap as soon as the shell mounts. */
  componentDidMount() {
    this.props.onInit();
  }

  /** Retry button handler — re-dispatches the init thunk after a failure. */
  handleRetry() {
    this.props.onInit();
  }

  /**
   * MUI Skeleton mock of the final layout (header + sidebar + main) shown
   * while /api/init is in flight.
   * @returns {import('react').ReactNode}
   */
  renderLoading() {
    const { classes } = this.props;
    return (
      <div className={classes.root} data-testid="app-skeleton">
        <div className={classes.skeletonHeader}>
          <Skeleton variant="text" width={260} height={24} />
          <Skeleton variant="rounded" width={140} height={24} />
        </div>
        <div className={classes.body}>
          <div className={classes.skeletonSidebar}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((row) => (
              <Skeleton
                key={row}
                variant="text"
                height={22}
                width={`${90 - (row % 4) * 12}%`}
              />
            ))}
          </div>
          <div className={classes.skeletonMain}>
            <Skeleton variant="text" width={220} height={28} />
            <Skeleton variant="rounded" height="70%" sx={{ mt: 2 }} />
          </div>
        </div>
      </div>
    );
  }

  /**
   * Styled error panel with a Retry button, shown when init fails.
   * @returns {import('react').ReactNode}
   */
  renderError() {
    const { classes, error } = this.props;
    return (
      <div className={classes.root}>
        <div className={classes.errorPanel} role="alert">
          <h2 className={classes.errorTitle}>Initialization Failed</h2>
          <pre className={classes.errorMessage}>
            {error || 'Unknown error'}
          </pre>
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={this.handleRetry}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  /**
   * Main report area content: welcome/empty state when nothing is selected,
   * otherwise the container matching the selected node's transport.
   * @returns {import('react').ReactNode}
   */
  renderMain() {
    const { classes, selectedNode } = this.props;

    if (!selectedNode || selectedNode.type !== 'report') {
      return (
        <div className={classes.welcome}>
          <span className={classes.welcomeGlyph} aria-hidden="true">
            ▄▀▄▀
          </span>
          <h2 className={classes.welcomeTitle}>No Report Loaded</h2>
          <p className={classes.welcomeHint}>
            Select a report from the navigator
          </p>
        </div>
      );
    }

    if (selectedNode.transport === TRANSPORTS.WS) {
      return <LiveReportContainer reportId={selectedNode.id} />;
    }
    return <ReportContainer reportId={selectedNode.id} />;
  }

  /**
   * Renders the shell for the current init status.
   * @returns {import('react').ReactNode}
   */
  render() {
    const { classes, status, userData, selectedNode } = this.props;

    if (status === 'idle' || status === 'loading') {
      return this.renderLoading();
    }
    if (status === 'error') {
      return this.renderError();
    }

    return (
      <div className={classes.root}>
        <header className={classes.header}>
          <h1 className={classes.title}>
            Retro Trading Terminal
            <span className={classes.titleCursor} aria-hidden="true" />
          </h1>
          <div className={classes.headerRight}>
            {userData && (
              <span className={classes.userDesk}>{userData.desk}</span>
            )}
            {userData && (
              <Chip
                className={classes.userChip}
                label={`${userData.name} · ${userData.role}`}
                size="small"
                variant="outlined"
              />
            )}
          </div>
        </header>
        <div className={classes.body}>
          <aside className={classes.sidebar}>
            <SidebarContainer />
          </aside>
          <main className={classes.main}>{this.renderMain()}</main>
        </div>
        <StatusBar
          user={userData}
          selectedReportLabel={
            selectedNode && selectedNode.type === 'report'
              ? selectedNode.label
              : null
          }
        />
      </div>
    );
  }
}

/**
 * Maps store state onto AppContainer props.
 * @param {*} state root Redux state
 */
const mapStateToProps = (state) => ({
  status: selectAppStatus(state),
  error: selectAppError(state),
  userData: selectUserData(state),
  selectedNode: selectSelectedReportNode(state),
});

const mapDispatchToProps = {
  onInit: initApp,
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withStyles(styles)(AppContainer));
