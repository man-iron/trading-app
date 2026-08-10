# Planted Bugs

Nineteen deliberate bugs. This file lists **symptoms and how to reproduce
them** — what you can observe going wrong, in roughly the order you'll hit
them. No file names, no causes, no fixes here: work them out yourself. If
you're stuck, `hints.md` has a per-bug pointer (file + the concept involved);
the full walkthrough lives in `solutions.md` on the `solutions` branch.

**Fix-verification suite:** `src/__tests__/bugFixes.test.tsx` has one test per
numbered bug (same numbering) asserting the *correct* behavior. Note: the suite
cannot even run until the startup bugs (0a/0b) are fixed, and `npx tsc -b`
stays red until bug #11 is fixed. Run it with:

```bash
npx vitest run src/__tests__/bugFixes.test.tsx
```

You can also run a single bug's test by number, e.g.:

```bash
npx vitest run src/__tests__/bugFixes.test.tsx -t "bug #7"
```

## Startup — the app won't boot at all

### 0a. The dev server refuses to compile
- **Symptom:** Vite's red error overlay instead of the app; the test suite
  can't collect either. Fix this before anything else.
- **Reproduce:** `npm run me`, open http://localhost:3000. Same failure from
  `npx vite build`.

### 0b. Blank page after 0a is fixed
- **Symptom:** once 0a compiles, the page is completely blank — no chrome, no
  skeleton — with an uncaught `ReferenceError` thrown before React renders
  anything.
- **Reproduce:** fix 0a, reload http://localhost:3000, open the browser
  console (F12).

## Logic — equality

### 1. Undefined cells render the text "undefined"
- **Symptom:** cells the live feed doesn't quote display the literal string
  `undefined` instead of an empty cell.
- **Reproduce:** start the app — FX Spot loads by default; look at BID for
  USD/JPY and BID/ASK for USD/CHF. Also on Equities → Stocks: Volume for GS,
  Name for MSFT.

### 2. Malformed numeric filters match nothing
- **Symptom:** a broken operator filter in a numeric column hides every row
  instead of falling back to substring matching.
- **Reproduce:** on FX Spot, type `>abc` into the BID filter box — the table
  empties ("0 of 16 rows").

### 3. Empty cells match text filters they shouldn't
- **Symptom:** rows whose cell is missing entirely still match text filters.
- **Reproduce:** open Equities → Stocks, type `und` into the NAME filter —
  the Microsoft row (whose Name the feed didn't send) stays visible even
  though its name contains no such text.

### 4. Status bar crashes for a signed-out user
- **Symptom:** with no signed-in user the status bar throws
  `Cannot read properties of null (reading 'name')` instead of showing
  `NOT SIGNED IN`.
- **Reproduce:** the mock backend always returns a user, so drive the
  component directly:
  `npx vitest run src/__tests__/bugFixes.test.tsx -t "bug #4"`.

## Logic — not-defined variables (runtime ReferenceErrors)

### 5. Status bar crashes when no report is selected
- **Symptom:** `ReferenceError: noReportText is not defined` whenever the
  "NO REPORT" placeholder should render.
- **Reproduce:** set `preferences.defaultReportId` to `null` in
  `servers/data/mockData.js`, restart `npm run me`, reload — the whole app
  goes down with a System Fault. Or:
  `npx vitest run src/__tests__/bugFixes.test.tsx -t "bug #5"`.

### 6. Selecting any EOD (REST) report crashes the app
- **Symptom:** the "SYSTEM FAULT" panel with `nodeId is not defined`.
- **Reproduce:** expand DERIVATIVES, click **Swaps** (or EQUITIES → ETFs).

### 7. Menu lookup throws instead of returning
- **Symptom (a):** looking up some menu nodes throws
  `Cannot read properties of undefined (reading 'length')`.
- **Symptom (b):** looking up an id that doesn't exist throws
  `ReferenceError: node is not defined` instead of returning `null`.
- **Reproduce:** blocked in the sidebar until you fix #8; after that, expand
  DERIVATIVES → COMMODITIES and click **Energy** → crash (a). Both paths
  directly: `npx vitest run src/__tests__/bugFixes.test.tsx -t "bug #7"`.

## Logic — tree traversal depth

### 8. Third menu level never renders
- **Symptom:** level-3 reports (FX Spot, Govt Bonds, Energy, …) are missing
  from the sidebar.
- **Reproduce:** expand MARKETS, then FX — the group opens but shows no
  children. Same for Rates, Credit and Commodities.

## Logic — state updates that don't show up

### 9. Clicking a menu group appears to do nothing
- **Symptom:** expanding or collapsing a group has no visible effect; the
  sidebar only catches up when something unrelated re-renders (e.g. a live
  tick arrives), which mostly masks the bug.
- **Reproduce:** on FX Spot press **Pause** (stops the ticks that mask it),
  then click EQUITIES — nothing happens, however long you wait. Press play —
  it snaps open instantly.

## Architecture inconsistency

### 10. Backend menu changes never reach the UI
- **Symptom:** the menu the backend sends is silently ignored; frontend and
  backend menus can drift apart.
- **Reproduce:** rename a group in `servers/data/mockData.js` (e.g. label
  `'Markets'` → `'Global Markets'`), restart `npm run me`, reload — the
  sidebar still shows the old name.

## Types

### 11. Theme mode accepts any string
- **Symptom:** a misspelled theme mode (`'ligt'`, `'DARK'`, …) compiles
  without complaint and silently falls back to the dark palette.
- **Reproduce:** `npx tsc -b` fails on this branch (an intentional
  `@ts-expect-error` in the fix-verification suite is flagged as unnecessary).
  It goes green once the type is fixed.

## Styles

### 12. Report table ignores the light theme
- **Symptom:** the data table doesn't follow the active theme.
- **Reproduce:** click the sun icon in the header — everything switches to
  light except the table: panel, rows, borders and footer stay dark.

### 13. Table body paints over the sticky header
- **Symptom:** recently-ticked (flashing) body cells render on top of the
  sticky column headers.
- **Reproduce:** on FX Spot, make the window short enough that the grid
  scrolls, scroll down a little, and watch a flash — the amber cell slides
  over the header row.

### 14. Loading skeleton sidebar is wider than the real sidebar
- **Symptom:** a visible layout shift when the app finishes loading — the
  skeleton sidebar is wider than the real one.
- **Reproduce:** reload and watch the left edge (throttle the network in
  DevTools if it flashes by too fast) — the sidebar snaps narrower when the
  data arrives.

### 15. Sidebar's blinking cursor floats out of place
- **Symptom:** the amber block cursor in the "MARKETS NAVIGATOR" header
  renders far from where it should sit.
- **Reproduce:** just look at the sidebar header — the cursor is not after
  the text.

### 16. Status bar sections are misaligned
- **Symptom:** wrong inner spacing and vertical centering in the bottom
  status bar; the report section is no longer centered.
- **Reproduce:** look at the bottom bar and compare the three sections'
  alignment with the header strip.

## Tests

### 17. A test that asserts a bug is correct
- **Symptom:** one existing unit test encodes bug #1's wrong behavior as the
  expected result — it passes today and will fail once you fix the bug. Find
  it and fix the assertion too.
- **Reproduce:** fix bug #1, run `npx vitest run src/helpers` — a previously
  green test now fails, asserting the buggy output.
