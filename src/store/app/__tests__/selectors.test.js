import { describe, it, expect } from 'vitest';
import {
  selectAppStatus,
  selectAppError,
  selectUserData,
  selectEodDates,
  selectIsAppLoading,
  selectIsAppReady,
  selectThemeMode,
} from '../selectors';

const userData = {
  id: 'u1',
  name: 'Ada Trader',
  role: 'trader',
  email: 'ada@example.com',
  desk: 'FX',
  preferences: { theme: 'dark', defaultReportId: null },
};

const makeState = (app) => ({ app });

describe('app selectors', () => {
  it('selectAppStatus returns the status', () => {
    const state = makeState({ status: 'ready', error: null, userData, eodDates: [] });
    expect(selectAppStatus(state)).toBe('ready');
  });

  it('selectAppError returns the error message', () => {
    const state = makeState({ status: 'error', error: 'nope', userData: null, eodDates: [] });
    expect(selectAppError(state)).toBe('nope');
  });

  it('selectUserData returns the user data object', () => {
    const state = makeState({ status: 'ready', error: null, userData, eodDates: [] });
    expect(selectUserData(state)).toBe(userData);
  });

  it('selectEodDates returns the eod dates array', () => {
    const dates = ['2026-08-05', '2026-08-04'];
    const state = makeState({ status: 'ready', error: null, userData, eodDates: dates });
    expect(selectEodDates(state)).toBe(dates);
  });

  it('selectIsAppLoading is true only while loading', () => {
    expect(selectIsAppLoading(makeState({ status: 'loading' }))).toBe(true);
    expect(selectIsAppLoading(makeState({ status: 'idle' }))).toBe(false);
    expect(selectIsAppLoading(makeState({ status: 'ready' }))).toBe(false);
    expect(selectIsAppLoading(makeState({ status: 'error' }))).toBe(false);
  });

  it('selectThemeMode returns the theme mode', () => {
    expect(selectThemeMode(makeState({ themeMode: 'dark' }))).toBe('dark');
    expect(selectThemeMode(makeState({ themeMode: 'light' }))).toBe('light');
  });

  it('selectIsAppReady is true only when ready', () => {
    expect(selectIsAppReady(makeState({ status: 'ready' }))).toBe(true);
    expect(selectIsAppReady(makeState({ status: 'idle' }))).toBe(false);
    expect(selectIsAppReady(makeState({ status: 'loading' }))).toBe(false);
    expect(selectIsAppReady(makeState({ status: 'error' }))).toBe(false);
  });
});
