# Retro Trading Terminal — Architecture Contract

This document is the **binding contract** for all implementation work. Do not deviate
from file paths, type shapes, action type strings, or API protocols defined here.

## Concept

A trading dashboard mixing **retro class-based React (JS)** with **modern functional
React + hooks (TS)**. Redux-connected **containers** are isolated from purely
presentational **components** (local state only). Helpers, constants, and JSS style
files live *outside* component/container folders. Every component/container folder has
an `index` barrel file.

Styling: **MUI v5** for widgets + **react-jss** for custom styling.
- Class components use `withStyles(styles)(Component)` HOC from `react-jss`.
- Functional components use `createUseStyles(styles)` hooks from `react-jss`.
- Style objects live in `src/styles/components/<Name>.styles.{js,ts}` — NEVER inside
  the component folder.

## Paradigm assignment (deliberately mixed — this is the point)

| Unit | Paradigm | Lang |
|---|---|---|
| `containers/AppContainer` | class + `connect()` | JS |
| `containers/SidebarContainer` | class + `connect()` | JS |
| `containers/ReportContainer` (REST/EOD) | functional + `useSelector`/`useDispatch` | TS |
| `containers/LiveReportContainer` (WS) | functional + hooks | TS |
| `components/TreeMenu` | class, local expand state via props-callback | JS |
| `components/ReportTable` | functional + hooks (sort/filter local state) | TS |
| `components/LiveControls` (pause/play) | class | JS |
| `components/EodSelector` | functional | TS |
| `components/StatusBar` | class | JS |
| `components/ErrorBoundary` | class (must be — retro win) | JS |
| store/reducers `app`, `menu` | classic hand-rolled switch reducers | JS |
| store/reducer `reports` | Redux Toolkit `createSlice` | TS |
| hooks (`useWebSocket`, `useReportData`) | modern | TS |

## Directory layout (final)

```
servers/
  data/mockData.js          # shared instruments, seed rows, menu tree (used by BOTH servers)
  rest-server.js            # express, port 4000
  ws-server.js              # ws, port 4001
src/
  main.tsx                  # entry: ThemeProvider (MUI) + JSS ThemeProvider + Redux Provider
  App.tsx                   # layout shell (functional TS)
  setupTests.ts
  api/
    restClient.ts           # fetch wrapper: getInit, getReport, getEodReport, getEodDates
    wsClient.ts             # WebSocket wrapper class w/ subscribe/unsubscribe/reconnect
  constants/
    actionTypes.js          # classic string constants (app/menu)
    reportConstants.ts      # transports, column types, WS message types, EOD, ports/URLs
  helpers/
    menuHelpers.js          # flattenMenuForRender (LOOPS, NO RECURSION — see below), findNodeById
    tableHelpers.ts         # sortRows, filterRows, comparators, formatters (price, pct, ts)
    formatHelpers.ts        # number/date formatting
  hooks/
    useWebSocket.ts         # manages ws subscription lifecycle + pause buffering
    useReportData.ts        # REST fetch lifecycle for a report (loading/error/data)
  store/
    index.ts                # configureStore, typed RootState/AppDispatch hooks
    rootReducer.ts
    app/    { actions.js, reducer.js, selectors.js }        # userData, init status
    menu/   { actions.js, reducer.js, selectors.js }        # menuData, expanded, selected
    reports/{ reportsSlice.ts, selectors.ts }               # RTK slice
    initThunk.ts            # async init: GET /api/init -> dispatches app + menu actions
  components/
    TreeMenu/      { TreeMenu.jsx, index.js }
    ReportTable/   { ReportTable.tsx, index.ts }
    LiveControls/  { LiveControls.jsx, index.js }
    EodSelector/   { EodSelector.tsx, index.ts }
    StatusBar/     { StatusBar.jsx, index.js }
    ErrorBoundary/ { ErrorBoundary.jsx, index.js }
  containers/
    AppContainer/       { AppContainer.jsx, index.js }
    SidebarContainer/   { SidebarContainer.jsx, index.js }
    ReportContainer/    { ReportContainer.tsx, index.ts }
    LiveReportContainer/{ LiveReportContainer.tsx, index.ts }
  styles/
    theme.ts                # shared MUI theme + JSS theme object (dark trading terminal)
    components/<Name>.styles.js|ts   # one file per component/container
  types/
    index.ts                # ALL shared TS types (below)
```

Tests are colocated: `__tests__/` inside each folder (e.g.
`src/components/ReportTable/__tests__/ReportTable.test.tsx`,
`src/helpers/__tests__/tableHelpers.test.ts`). Stories colocated as
`<Name>.stories.tsx` inside the component folder.

## Shared types — `src/types/index.ts` (exact)

```ts
export type Transport = 'ws' | 'rest';

export interface MenuNode {
  id: string;
  label: string;
  type: 'group' | 'report';
  transport?: Transport;      // only on type==='report'
  children?: MenuNode[];      // backend sends up to 3 levels deep
}

export interface UserData {
  id: string;
  name: string;
  role: string;
  email: string;
  desk: string;
  preferences: { theme: 'dark' | 'light'; defaultReportId: string | null };
}

export type ColumnType = 'string' | 'number' | 'price' | 'pct' | 'timestamp';

export interface ColumnDef {
  key: string;
  label: string;
  type: ColumnType;
  align?: 'left' | 'right';
}

export interface ReportRow {
  id: string;
  [key: string]: string | number;
}

export interface ReportPayload {
  reportId: string;
  columns: ColumnDef[];
  rows: ReportRow[];
  asOf: string;               // ISO timestamp; for EOD it's the selected date
}

export type ReportMode = 'live' | 'eod';

export interface ReportState {
  reportId: string;
  transport: Transport;
  columns: ColumnDef[];
  rows: ReportRow[];
  loading: boolean;
  error: string | null;
  mode: ReportMode;           // rest reports: 'live'(=current REST snapshot) | 'eod'
  paused: boolean;            // ws reports only
  eodDate: string | null;     // 'YYYY-MM-DD', rest reports only
  asOf: string | null;
  connectionStatus: 'idle' | 'connecting' | 'open' | 'closed' | 'error';
}

export interface InitResponse {
  userData: UserData;
  menuData: MenuNode[];
  eodDates: string[];         // available EOD dates, newest first
}

export interface WsTickUpdate { id: string; changes: Record<string, string | number> }
export type WsServerMessage =
  | { type: 'snapshot'; reportId: string; columns: ColumnDef[]; rows: ReportRow[]; asOf: string }
  | { type: 'tick'; reportId: string; updates: WsTickUpdate[]; asOf: string }
  | { type: 'error'; message: string };
export type WsClientMessage =
  | { type: 'subscribe'; reportId: string }
  | { type: 'unsubscribe'; reportId: string };

export type SortDirection = 'asc' | 'desc';
export interface SortState { columnKey: string | null; direction: SortDirection }
export type FilterState = Record<string, string>; // columnKey -> filter text
```

## Menu tree data (served by /api/init, defined once in servers/data/mockData.js)

3 levels: Level 1 = asset-class groups, Level 2 = sub-groups OR reports, Level 3 = reports.

```
Markets (group)
├─ FX (group)
│   ├─ FX Spot        (report, ws)   id: fx-spot
│   └─ FX Forwards    (report, rest) id: fx-forwards
├─ Rates (group)
│   ├─ Govt Bonds     (report, ws)   id: rates-govt
│   └─ IRS Curve      (report, rest) id: rates-irs
└─ Credit (group)
    └─ CDS Indices    (report, rest) id: credit-cds
Derivatives (group)
├─ Swaps              (report, rest) id: swaps
└─ Commodities (group)
    ├─ Energy         (report, ws)   id: commod-energy
    └─ Metals         (report, rest) id: commod-metals
Equities (group)
├─ Stocks             (report, ws)   id: stocks
└─ ETFs               (report, rest) id: etfs
```

### Tree rendering rule (IMPORTANT, user requirement)

`flattenMenuForRender(menuData, expandedIds)` in `src/helpers/menuHelpers.js` must use
**explicit nested `for` loops, NOT recursion**, handling exactly 2 levels of group
nesting (level-3 nodes are leaves rendered inside the level-2 iteration). Returns a flat
array `{ node, depth, isExpanded, visible }` that `TreeMenu` maps over. Add a code
comment noting the deliberate non-recursive 2-level-loop constraint.

## REST API (express, port 4000, all JSON, CORS on)

- `GET /api/init` → `InitResponse` (~200ms simulated latency)
- `GET /api/reports/:reportId` → `ReportPayload` (current snapshot; REST reports)
- `GET /api/reports/:reportId/eod?date=YYYY-MM-DD` → `ReportPayload` (deterministic
  per-date variation of seed rows)
- `GET /api/eod-dates` → `{ dates: string[] }` (last 10 business days)
- Unknown reportId → 404 `{ error: 'Unknown report: <id>' }`

## WS protocol (ws, port 4001)

Client sends `WsClientMessage` JSON. On `subscribe`, server immediately sends
`snapshot`, then `tick` messages every 800–1500ms with 1–5 random row updates
(price/change/pct fields drift realistically). `unsubscribe` stops ticks for that
report. Multiple concurrent subscriptions per socket supported.

**Pause/play is CLIENT-side**: `useWebSocket` keeps receiving but buffers ticks while
`paused`, applying the buffered state on resume (keep only latest change per row id).

## Redux store shape

```ts
RootState = {
  app:   { status: 'idle'|'loading'|'ready'|'error', error: string|null, userData: UserData|null, eodDates: string[] },
  menu:  { items: MenuNode[], expandedIds: string[], selectedReportId: string|null },
  reports: { byId: Record<string, ReportState> },
}
```

### Classic action types — `src/constants/actionTypes.js`

```js
export const APP_INIT_REQUEST = 'app/INIT_REQUEST';
export const APP_INIT_SUCCESS = 'app/INIT_SUCCESS';   // payload: InitResponse
export const APP_INIT_FAILURE = 'app/INIT_FAILURE';   // payload: string (error)
export const MENU_SET_ITEMS = 'menu/SET_ITEMS';       // payload: MenuNode[]
export const MENU_TOGGLE_NODE = 'menu/TOGGLE_NODE';   // payload: nodeId
export const MENU_SELECT_REPORT = 'menu/SELECT_REPORT'; // payload: { reportId }
```

`app` reducer handles APP_INIT_*; `menu` reducer handles MENU_* **and**
APP_INIT_SUCCESS (to seed items). Both are hand-written switch statements (retro).

### RTK slice — `src/store/reports/reportsSlice.ts`

Slice name `'reports'`. Reducers: `reportOpened({reportId, transport})` (creates entry
if missing), `snapshotReceived({reportId, columns, rows, asOf})`,
`ticksApplied({reportId, updates, asOf})`, `loadingStarted`, `loadFailed`,
`pauseToggled({reportId})`, `modeChanged({reportId, mode})`,
`eodDateSelected({reportId, date})`, `connectionStatusChanged({reportId, status})`.

## Data flow

1. `main.tsx` renders Providers → `AppContainer`.
2. `AppContainer` (class, `connect`) dispatches `initApp()` thunk in
   `componentDidMount`; shows MUI skeleton while `status==='loading'`, error state on
   failure, else layout: `SidebarContainer` (left, tree) + report area + `StatusBar`.
3. Clicking a report node dispatches `MENU_SELECT_REPORT` + `reportOpened`.
4. Report area: transport `'ws'` → `LiveReportContainer` (uses `useWebSocket`);
   `'rest'` → `ReportContainer` (uses `useReportData`; EOD selector switches
   mode + refetches via `/eod?date=`).
5. `ReportTable` is dumb: gets `columns`, `rows`, renders MUI Table with **local**
   sort + per-column filter state (helpers from `tableHelpers.ts`). Live cell updates
   flash via JSS animation class.
6. WS reports show `LiveControls` (pause/play + connection dot); REST reports show
   `EodSelector` (MUI Select of `eodDates` + "Current" option).

## Conventions

- Barrel files: `index.js`/`index.ts` re-export default + named types.
- JSS style files export a plain `styles` object (theme-aware fn where needed).
- Class components: PropTypes not required; JSDoc the props instead.
- Tests: Vitest + RTL. Test store logic (reducers/slice/selectors/thunk), helpers
  (pure fns — exhaustive), hooks (via `renderHook` + mock WebSocket/fetch), components
  (RTL user-event), containers (RTL with real store via `configureStore`).
- A shared test util `src/testUtils/renderWithProviders.tsx` wraps RTL render with
  Redux Provider + theme providers, returns `{ store, ...rtl }`.
- Storybook: `.storybook/main.ts` (react-vite framework), `preview.tsx` adds theme +
  mock store decorator. Stories for every component + key container states.
- Theme: dark "terminal" aesthetic — near-black background `#0d1117`, panel `#161b22`,
  accent green `#00c805` (up) / red `#ff5000` (down), amber selection `#ffb000`,
  monospace numerals (`'JetBrains Mono', 'Consolas', monospace`) for cells.
```
