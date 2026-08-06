import {
  APP_INIT_REQUEST,
  APP_INIT_SUCCESS,
  APP_INIT_FAILURE,
  APP_TOGGLE_THEME,
} from '../../constants/actionTypes';

/**
 * @typedef {Object} AppState
 * @property {'idle'|'loading'|'ready'|'error'} status
 * @property {string|null} error
 * @property {import('../../types').UserData|null} userData
 * @property {string[]} eodDates
 * @property {'dark'|'light'} themeMode
 */

/** @type {AppState} */
export const initialState = {
  status: 'idle',
  error: null,
  userData: null,
  eodDates: [],
  themeMode: 'dark',
};

/**
 * Classic hand-rolled switch reducer for global app/init state.
 * @param {AppState} state
 * @param {{ type: string, payload?: * }} action
 * @returns {AppState}
 */
export default function appReducer(state = initialState, action = {}) {
  switch (action.type) {
    case APP_INIT_REQUEST:
      return {
        ...state,
        status: 'loading',
        error: null,
      };
    case APP_INIT_SUCCESS:
      return {
        ...state,
        status: 'ready',
        error: null,
        userData: action.payload.userData,
        eodDates: action.payload.eodDates,
      };
    case APP_INIT_FAILURE:
      return {
        ...state,
        status: 'error',
        error: action.payload,
      };
    case APP_TOGGLE_THEME:
      return {
        ...state,
        themeMode: state.themeMode === 'dark' ? 'light' : 'dark',
      };
    default:
      return state;
  }
}
