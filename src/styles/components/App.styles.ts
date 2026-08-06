/**
 * JSS styles for the `App` shell (functional TS component).
 *
 * The shell only establishes the full-viewport dark canvas and base
 * typography; all interior chrome (header strip, sidebar, main area) is
 * styled by `AppContainer.styles.js`.
 *
 * Consumed via `createUseStyles(styles)` from `react-jss`.
 */
import type { JssTheme } from '../theme';

const styles = (theme: JssTheme) =>
  ({
    root: {
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      backgroundColor: theme.colors.background,
      color: theme.colors.text,
      fontFamily: theme.fonts.ui,
    },
  } as const);

export default styles;
