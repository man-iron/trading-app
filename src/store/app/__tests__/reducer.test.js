import { describe, it, expect } from 'vitest';
import appReducer, { initialState } from '../reducer';
import {
  appInitRequest,
  appInitSuccess,
  appInitFailure,
  toggleTheme,
} from '../actions';
import {
  APP_INIT_REQUEST,
  APP_INIT_SUCCESS,
  APP_INIT_FAILURE,
  APP_TOGGLE_THEME,
} from '../../../constants/actionTypes';

const initResponse = {
  userData: {
    id: 'u1',
    name: 'Ada Trader',
    role: 'trader',
    email: 'ada@example.com',
    desk: 'FX',
    preferences: { theme: 'dark', defaultReportId: 'fx-spot' },
  },
  menuData: [{ id: 'markets', label: 'Markets', type: 'group', children: [] }],
  eodDates: ['2026-08-05', '2026-08-04'],
};

describe('app action creators', () => {
  it('appInitRequest creates the request action', () => {
    expect(appInitRequest()).toEqual({ type: APP_INIT_REQUEST });
  });

  it('appInitSuccess carries the full InitResponse payload', () => {
    expect(appInitSuccess(initResponse)).toEqual({
      type: APP_INIT_SUCCESS,
      payload: initResponse,
    });
  });

  it('appInitFailure carries the error message payload', () => {
    expect(appInitFailure('boom')).toEqual({
      type: APP_INIT_FAILURE,
      payload: 'boom',
    });
  });

  it('toggleTheme creates the toggle action', () => {
    expect(toggleTheme()).toEqual({ type: APP_TOGGLE_THEME });
  });
});

describe('app reducer', () => {
  it('returns the initial state for an unknown action', () => {
    expect(appReducer(undefined, { type: '@@INIT' })).toEqual(initialState);
  });

  it('has the contract initial shape', () => {
    expect(initialState).toEqual({
      status: 'idle',
      error: null,
      userData: null,
      eodDates: [],
      themeMode: 'dark',
    });
  });

  it('APP_INIT_REQUEST sets status loading and clears error', () => {
    const prior = { ...initialState, status: 'error', error: 'old failure' };
    const next = appReducer(prior, appInitRequest());
    expect(next.status).toBe('loading');
    expect(next.error).toBeNull();
  });

  it('APP_INIT_SUCCESS stores userData and eodDates and sets status ready', () => {
    const loading = appReducer(initialState, appInitRequest());
    const next = appReducer(loading, appInitSuccess(initResponse));
    expect(next).toEqual({
      status: 'ready',
      error: null,
      userData: initResponse.userData,
      eodDates: initResponse.eodDates,
      themeMode: 'dark',
    });
  });

  it('APP_TOGGLE_THEME flips dark -> light -> dark', () => {
    const light = appReducer(initialState, toggleTheme());
    expect(light.themeMode).toBe('light');
    const dark = appReducer(light, toggleTheme());
    expect(dark.themeMode).toBe('dark');
  });

  it('APP_TOGGLE_THEME leaves the rest of the state untouched', () => {
    const ready = appReducer(initialState, appInitSuccess(initResponse));
    const toggled = appReducer(ready, toggleTheme());
    expect(toggled).toEqual({ ...ready, themeMode: 'light' });
  });

  it('APP_INIT_SUCCESS does not store menuData on the app branch', () => {
    const next = appReducer(initialState, appInitSuccess(initResponse));
    expect(next.menuData).toBeUndefined();
  });

  it('APP_INIT_FAILURE sets status error and stores the message', () => {
    const loading = appReducer(initialState, appInitRequest());
    const next = appReducer(loading, appInitFailure('init exploded'));
    expect(next.status).toBe('error');
    expect(next.error).toBe('init exploded');
  });

  it('does not mutate the previous state', () => {
    const prior = { ...initialState };
    appReducer(prior, appInitSuccess(initResponse));
    expect(prior).toEqual(initialState);
  });

  it('returns the same reference for unrelated actions', () => {
    const state = appReducer(initialState, appInitSuccess(initResponse));
    expect(appReducer(state, { type: 'other/ACTION' })).toBe(state);
  });
});
