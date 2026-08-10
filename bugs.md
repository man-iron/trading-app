# Planted Bugs

Nineteen deliberate bugs. This file lists **symptoms only** — what you can
observe going wrong, in roughly the order you'll hit them. No file names, no
causes, no fixes here: work them out yourself. If you're stuck, `hints.md` has
a per-bug pointer (file + the concept involved); the full walkthrough lives in
`solutions.md` on the `solutions` branch.

**Fix-verification suite:** `src/__tests__/bugFixes.test.tsx` has one test per
numbered bug (same numbering) asserting the *correct* behavior. Note: the suite
cannot even run until the startup bugs (0a/0b) are fixed, and `npx tsc -b`
stays red until bug #11 is fixed. Run it with:

```bash
npx vitest run src/__tests__/bugFixes.test.tsx
```

## Startup — the app won't boot at all

### 0a. The dev server refuses to compile
- **Symptom:** `npm run me` starts, but opening http://localhost:3000 shows
  Vite's red error overlay instead of the app; `npx vite build` fails the same
  way. Fix this before anything else — the test suite can't collect either.

### 0b. Blank page after 0a is fixed
- **Symptom:** once 0a compiles, the page is completely blank — no chrome, no
  skeleton. The browser console shows an uncaught `ReferenceError` thrown
  before React renders anything.

## Logic — equality

### 1. Undefined cells render the text "undefined"
- **Symptom:** any report cell whose value is `undefined` displays the literal
  string `undefined` instead of an empty cell.

### 2. Malformed numeric filters match nothing
- **Symptom:** typing a broken operator filter (e.g. `>abc`) into a numeric
  column hides every row. It should fall back to substring matching.

### 3. Empty cells match text filters they shouldn't
- **Symptom:** filtering a string column with e.g. `n` or `und` also matches
  rows whose cell is missing entirely.

### 4. Status bar crashes for a signed-out user
- **Symptom:** when there is no signed-in user, the status bar throws
  `Cannot read properties of null (reading 'name')` instead of showing
  `NOT SIGNED IN`.

## Logic — not-defined variables (runtime ReferenceErrors)

### 5. Status bar crashes when no report is selected
- **Symptom:** `ReferenceError: noReportText is not defined` whenever the
  "NO REPORT" placeholder should render.

### 6. Selecting any EOD (REST) report crashes the app
- **Symptom:** clicking an EOD report (Swaps, FX Forwards, …) shows the
  "System Fault" panel — `ReferenceError: nodeId is not defined`.

### 7. Menu lookup throws instead of returning
- **Symptom (a):** looking up some menu nodes throws
  `Cannot read properties of undefined (reading 'length')`.
- **Symptom (b):** looking up an id that doesn't exist at all throws
  `ReferenceError: node is not defined` instead of returning `null`.

## Logic — tree traversal depth

### 8. Third menu level never renders
- **Symptom:** expanding FX / Rates / Credit / Commodities shows nothing —
  all level-3 reports (FX Spot, Govt Bonds, Energy, …) are missing from the
  sidebar.

## Logic — state updates that don't show up

### 9. Clicking a menu group appears to do nothing
- **Symptom:** expanding or collapsing a group has no visible effect. The
  sidebar only catches up later, when something unrelated happens (e.g. a
  live WS tick arrives).

## Architecture inconsistency

### 10. Backend menu changes never reach the UI
- **Symptom:** edit the menu the backend sends (e.g. rename a group in
  `servers/data/mockData.js`, restart) — the sidebar doesn't change. The
  frontend and backend menus can drift apart silently.

## Types

### 11. Theme mode accepts any string
- **Symptom:** a misspelled theme mode (`'ligt'`, `'DARK'`, …) compiles
  without complaint and silently falls back to the dark palette. `npx tsc -b`
  should catch this — make it.

## Styles

### 12. Report table ignores the light theme
- **Symptom:** toggling to the light theme switches the whole app except the
  data table — panel, rows, borders and footer stay dark.

### 13. Table body paints over the sticky header
- **Symptom:** while scrolling, flashing (recently ticked) body cells render
  on top of the sticky column headers.

### 14. Loading skeleton sidebar is wider than the real sidebar
- **Symptom:** during the init skeleton, the fake sidebar is visibly wider
  than the real one, then snaps narrower once loaded — a layout shift.

### 15. Sidebar's blinking cursor floats out of place
- **Symptom:** the amber block cursor in the "NAVIGATOR" header renders far
  from where it should sit.

### 16. Status bar sections are misaligned
- **Symptom:** the three status bar sections have wrong inner spacing and
  vertical centering, and the report section is no longer centered.

## Tests

### 17. A test that asserts a bug is correct
- **Symptom:** one existing unit test encodes bug #1's wrong behavior as the
  expected result — it passes today and will fail once you fix the bug. Find
  it and fix the assertion too.
