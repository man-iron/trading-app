import { configureStore } from '@reduxjs/toolkit';
import {
  useDispatch,
  useSelector,
  type TypedUseSelectorHook,
} from 'react-redux';
import rootReducer, { type RootState } from './rootReducer';

/**
 * Builds the app store. Accepts a preloaded state so tests and Storybook can
 * start from a known state. RTK's default middleware already includes thunk.
 */
export const setupStore = (preloadedState?: Partial<RootState>) =>
  configureStore({
    reducer: rootReducer,
    preloadedState,
  });

export const store = setupStore();

export type AppStore = ReturnType<typeof setupStore>;
export type AppDispatch = AppStore['dispatch'];
export type { RootState };

/** Typed dispatch hook — use instead of plain `useDispatch`. */
export const useAppDispatch: () => AppDispatch = useDispatch;

/** Typed selector hook — use instead of plain `useSelector`. */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export default store;
