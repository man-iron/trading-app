/**
 * Selectors for the `app` state branch.
 * State shape: { status, error, userData, eodDates, themeMode }
 */

/** @param {*} state root state */
export const selectAppStatus = (state) => state.app.status;

/** @param {*} state root state */
export const selectAppError = (state) => state.app.error;

/** @param {*} state root state */
export const selectUserData = (state) => state.app.userData;

/** @param {*} state root state */
export const selectEodDates = (state) => state.app.eodDates;

/**
 * Current UI theme mode.
 * @param {*} state root state
 * @returns {'dark'|'light'}
 */
export const selectThemeMode = (state) => state.app.themeMode;

/**
 * True while the initial /api/init request is in flight.
 * @param {*} state root state
 */
export const selectIsAppLoading = (state) => state.app.status === 'loading';

/**
 * True once init completed successfully.
 * @param {*} state root state
 */
export const selectIsAppReady = (state) => state.app.status === 'ready';
