import { createUseStyles } from 'react-jss';
import ErrorBoundary from './components/ErrorBoundary';
import AppContainer from './containers/AppContainer';
import styles from './styles/components/App.styles';
import type { JssTheme } from './styles/theme';

const useStyles = createUseStyles<string, unknown, JssTheme>(styles);

/**
 * App — modern functional TS shell (the other side of the paradigm split
 * from the class-based `AppContainer` it hosts). Establishes the
 * full-viewport dark canvas and guards the whole tree with the class-based
 * `ErrorBoundary`.
 */
export default function App(): JSX.Element {
  const classes = useStyles();
  return (
    <div className={classes.root}>
      <ErrorBoundary>
        <AppContainer />
      </ErrorBoundary>
    </div>
  );
}
