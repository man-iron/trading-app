import {
  APP_INIT_REQUEST,
  APP_INIT_SUCCESS,
  APP_INIT_FAILURE,
  APP_TOGGLE_THEME,
} from '../../constants/actionTypes';

/**
 * App init started.
 * @returns {{ type: string }}
 */
export const appInitRequest = () => ({ type: APP_INIT_REQUEST });

/**
 * App init succeeded.
 * @param {import('../../types').InitResponse} initResponse full /api/init payload
 * @returns {{ type: string, payload: import('../../types').InitResponse }}
 */
export const appInitSuccess = (initResponse) => ({
  type: APP_INIT_SUCCESS,
  payload: initResponse,
});

/**
 * App init failed.
 * @param {string} error human-readable error message
 * @returns {{ type: string, payload: string }}
 */
export const appInitFailure = (error) => ({
  type: APP_INIT_FAILURE,
  payload: error,
});

/**
 * Flip the UI theme between dark and light.
 * @returns {{ type: string }}
 */
export const toggleTheme = () => ({ type: APP_TOGGLE_THEME });
