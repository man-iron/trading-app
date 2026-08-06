import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../api/restClient', () => ({
  getInit: vi.fn(),
}));

import { getInit } from '../../api/restClient';
import { initApp } from '../initThunk';
import {
  APP_INIT_REQUEST,
  APP_INIT_SUCCESS,
  APP_INIT_FAILURE,
} from '../../constants/actionTypes';
import { setupStore } from '../index';
import type { InitResponse } from '../../types';

const initResponse: InitResponse = {
  userData: {
    id: 'u1',
    name: 'Ada Trader',
    role: 'trader',
    email: 'ada@example.com',
    desk: 'FX',
    preferences: { theme: 'dark', defaultReportId: 'fx-spot' },
  },
  menuData: [
    {
      id: 'markets',
      label: 'Markets',
      type: 'group',
      children: [
        { id: 'fx-spot', label: 'FX Spot', type: 'report', transport: 'ws' },
      ],
    },
  ],
  eodDates: ['2026-08-05', '2026-08-04'],
};

describe('initApp thunk', () => {
  beforeEach(() => {
    vi.mocked(getInit).mockReset();
  });

  it('dispatches REQUEST then SUCCESS with the InitResponse on success', async () => {
    vi.mocked(getInit).mockResolvedValue(initResponse);
    const dispatch = vi.fn();

    await initApp()(dispatch);

    expect(getInit).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenNthCalledWith(1, { type: APP_INIT_REQUEST });
    expect(dispatch).toHaveBeenNthCalledWith(2, {
      type: APP_INIT_SUCCESS,
      payload: initResponse,
    });
  });

  it('dispatches REQUEST then FAILURE with the error message on failure', async () => {
    vi.mocked(getInit).mockRejectedValue(new Error('init exploded'));
    const dispatch = vi.fn();

    await initApp()(dispatch);

    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(dispatch).toHaveBeenNthCalledWith(1, { type: APP_INIT_REQUEST });
    expect(dispatch).toHaveBeenNthCalledWith(2, {
      type: APP_INIT_FAILURE,
      payload: 'init exploded',
    });
  });

  it('falls back to a generic message for non-Error rejections', async () => {
    vi.mocked(getInit).mockRejectedValue('string failure');
    const dispatch = vi.fn();

    await initApp()(dispatch);

    expect(dispatch).toHaveBeenNthCalledWith(2, {
      type: APP_INIT_FAILURE,
      payload: 'Failed to initialize app',
    });
  });

  it('drives the real store: app ready + menu seeded + default report selected', async () => {
    vi.mocked(getInit).mockResolvedValue(initResponse);
    const store = setupStore();

    await store.dispatch(initApp() as never);

    const state = store.getState();
    expect(state.app.status).toBe('ready');
    expect(state.app.userData).toEqual(initResponse.userData);
    expect(state.app.eodDates).toEqual(initResponse.eodDates);
    expect(state.menu.items).toEqual(initResponse.menuData);
    expect(state.menu.expandedIds).toEqual([]);
    expect(state.menu.selectedReportId).toBe('fx-spot');
  });

  it('drives the real store into the error state on failure', async () => {
    vi.mocked(getInit).mockRejectedValue(new Error('server down'));
    const store = setupStore();

    await store.dispatch(initApp() as never);

    const state = store.getState();
    expect(state.app.status).toBe('error');
    expect(state.app.error).toBe('server down');
    expect(state.menu.items).toEqual([]);
  });
});
