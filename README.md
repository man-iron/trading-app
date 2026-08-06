# Retro Trading Terminal

A trading dashboard that deliberately mixes **retro class-based React (JS)** with
**modern functional React + hooks (TS)** â€” Redux-connected containers, presentational
components with local state, MUI v5 widgets styled with react-jss, a non-recursive
tree menu, and reports fed by two simulated backends (REST + WebSocket).

## Prerequisites

- Node.js 20+ (built and tested on Node 22)
- npm 10+

## Install

```bash
npm install
```

## How to start the app

One command starts everything (Vite dev server + both mock backends):

```bash
npm run me
```

| Process | Port | What it is |
|---|---|---|
| Vite dev server | http://localhost:3000 | The app (open this in your browser) |
| REST mock server | http://localhost:4000 | `/api/init`, `/api/reports/:id`, `/api/reports/:id/eod?date=`, `/api/eod-dates` (proxied via Vite under `/api`) |
| WS mock server | ws://localhost:4001 | Live tick streams for `transport: 'ws'` reports |

You can also run the backends individually:

```bash
npm run server:rest
```

```bash
npm run server:ws
```

Using the app: expand the groups in the **MARKETS NAVIGATOR** tree on the left and
click a report. Reports badged **LIVE** stream over WebSocket and have pause/play
controls; the others load over REST and have an **EOD date selector** ("Current" or a
past business day). Every table supports per-column filtering (numeric columns accept
`>`, `<`, `>=`, `<=`, `=` prefixes, e.g. `>100`) and click-to-sort headers.

## How to test the app

Run the full suite (Vitest + React Testing Library, 26 files / 381 tests covering
every component, container, hook, helper, store branch, API client, and the mock
server data):

```bash
npm test
```

Watch mode while developing:

```bash
npm run test:watch
```

Coverage report:

```bash
npm run test:coverage
```

Tests are colocated with the code they cover in `__tests__` folders, e.g.
`src/components/ReportTable/__tests__/ReportTable.test.tsx`.

## Storybook

Browse component stories (tree menu, tables, live controls, EOD selector, â€¦):

```bash
npm run storybook
```

## Production build

```bash
npm run build
```

## Project layout

```
servers/          mock REST (express) + WS (ws) servers, shared mock data
src/
  components/     presentational, local state only (each folder barrel-indexed)
  containers/     Redux-connected (class + connect() or hooks, per file)
  store/          classic switch reducers (app, menu) + RTK slice (reports)
  helpers/        pure functions (menu flattening, sort/filter, formatting)
  constants/      action types, transports, URLs
  styles/         JSS style files + shared MUI/JSS theme (outside components)
  hooks/          useWebSocket (live + pause buffering), useReportData (REST)
  api/            REST fetch wrapper + WebSocket client
docs/ARCHITECTURE.md   the full architecture contract
```
