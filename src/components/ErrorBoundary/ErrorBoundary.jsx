import React, { Component } from 'react';
import Button from '@mui/material/Button';
import withStyles from 'react-jss';
import styles from '../../styles/components/ErrorBoundary.styles';

/**
 * ErrorBoundary — deliberately retro class component (error boundaries can
 * only be classes, which is exactly why this one exists on the class side of
 * the paradigm split).
 *
 * Catches render/lifecycle errors anywhere in its subtree via
 * `getDerivedStateFromError` + `componentDidCatch`, logs the error with its
 * component stack, and renders a styled "SYSTEM FAULT" terminal panel showing
 * the error message plus a reload button.
 *
 * Props:
 * @param {Object} props
 * @param {import('react').ReactNode} props.children Subtree to guard.
 * @param {Object} props.classes JSS classes (injected by `withStyles`).
 * @param {() => void} [props.onReload] Optional reload handler; defaults to a
 *   full `window.location.reload()`. Injectable for tests and Storybook.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);

    /**
     * @type {{ hasError: boolean, error: Error|null }}
     */
    this.state = { hasError: false, error: null };

    this.handleReload = this.handleReload.bind(this);
  }

  /**
   * Switches to the fallback UI as soon as a descendant throws.
   * @param {Error} error the thrown value
   * @returns {{ hasError: boolean, error: Error }}
   */
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  /**
   * Side-effect hook for caught errors — logs the error and the React
   * component stack for diagnostics.
   * @param {Error} error the thrown value
   * @param {{ componentStack: string }} errorInfo React error info
   */
  componentDidCatch(error, errorInfo) {
    // eslint-disable-next-line no-console
    console.error(
      '[ErrorBoundary] Caught rendering error:',
      error,
      errorInfo && errorInfo.componentStack
    );
  }

  /**
   * Reload button handler — delegates to the injected `onReload` when
   * provided, otherwise performs a hard page reload.
   */
  handleReload() {
    const { onReload } = this.props;
    if (typeof onReload === 'function') {
      onReload();
      return;
    }
    window.location.reload();
  }

  /**
   * Renders the guarded children, or the styled fault panel after a crash.
   * @returns {import('react').ReactNode}
   */
  render() {
    const { classes, children } = this.props;
    const { hasError, error } = this.state;

    if (!hasError) {
      return children;
    }

    const message =
      (error && error.message) || String(error) || 'Unknown error';

    return (
      <div className={classes.root} role="alert">
        <div className={classes.panel}>
          <span className={classes.glyph} aria-hidden="true">
            ▚▚
          </span>
          <h1 className={classes.title}>System Fault</h1>
          <p className={classes.subtitle}>
            The terminal hit an unrecoverable rendering error.
          </p>
          <pre className={classes.message}>{message}</pre>
          <Button
            variant="outlined"
            color="error"
            size="small"
            onClick={this.handleReload}
          >
            Reload Terminal
          </Button>
        </div>
      </div>
    );
  }
}

export default withStyles(styles)(ErrorBoundary);
