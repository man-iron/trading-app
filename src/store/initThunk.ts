import type { Dispatch, UnknownAction } from '@reduxjs/toolkit';
import { getInit } from '../api/restClient';
// Classic JS action creators (retro side of the store).
import { appInitRequest, appInitSuccess, appInitFailure } from './app/actions';

/**
 * Plain thunk (RTK ships thunk middleware by default) that bootstraps the app:
 * dispatches APP_INIT_REQUEST, calls GET /api/init, then APP_INIT_SUCCESS with
 * the full InitResponse (the menu reducer also listens to it to seed the tree)
 * or APP_INIT_FAILURE with the error message.
 */
export const initApp =
  () =>
  async (dispatch: Dispatch<UnknownAction>): Promise<void> => {
    dispatch(appInitRequest());
    try {
      const initResponse = await getInit();
      dispatch(appInitSuccess(initResponse));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to initialize app';
      dispatch(appInitFailure(message));
    }
  };

export default initApp;
