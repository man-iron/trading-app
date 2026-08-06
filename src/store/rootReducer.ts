import { combineReducers, type Reducer, type UnknownAction } from '@reduxjs/toolkit';
// Classic hand-rolled JS reducers (retro side of the store).
import appReducer from './app/reducer';
import menuReducer from './menu/reducer';
import reportsReducer from './reports/reportsSlice';
import type { MenuNode, UserData } from '../types';

/** Typed shape of the classic `app` branch (implemented in JS). */
export interface AppBranchState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  userData: UserData | null;
  eodDates: string[];
  themeMode: 'dark' | 'light';
}

/** Typed shape of the classic `menu` branch (implemented in JS). */
export interface MenuBranchState {
  items: MenuNode[];
  expandedIds: string[];
  selectedReportId: string | null;
}

const rootReducer = combineReducers({
  app: appReducer as unknown as Reducer<AppBranchState, UnknownAction>,
  menu: menuReducer as unknown as Reducer<MenuBranchState, UnknownAction>,
  reports: reportsReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export default rootReducer;
