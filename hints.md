# Hints

One pointer per bug: where to look and what concept is involved. Numbering
matches `bugs.md`. Read a hint only after you've had an honest attempt — the
full fixes are in `solutions.md` on the `solutions` branch.

## Startup

### 0a. The dev server refuses to compile
- **Where:** `src/containers/AppContainer/AppContainer.jsx`, `render()`.
- **Concept:** destructuring into *new* variables needs a declaration keyword.
  Read the overlay's error position carefully — why would the parser see a
  block `{ ... }` instead of an object pattern there?

### 0b. Blank page after 0a
- **Where:** `src/main.tsx`, near the bottom.
- **Concept:** ES modules run in strict mode — assigning to a variable that
  was never declared doesn't create a global, it throws.

## Logic — null / undefined / loose equality

### 1. Cells render "undefined"
- **Where:** `src/helpers/formatHelpers.ts`, `formatCell`.
- **Concept:** `==` vs `===` with `null`/`undefined` — which values does the
  empty-cell guard actually catch? Note: the feed omitting fields it can't
  quote is *legitimate* (real market data does this) — the fix belongs in the
  client's rendering, not in the WS server.

### 2. Malformed numeric filters match nothing
- **Where:** `src/helpers/tableHelpers.ts`, `parseNumericFilter`.
- **Concept:** the classic `NaN` trap — `NaN` is not equal to anything,
  including itself. How do you *detect* it?

### 3. Empty cells match text filters
- **Where:** `src/helpers/tableHelpers.ts`, `matchesSubstring`.
- **Concept:** what does `String(undefined)` give you before `.includes()`?

### 4. Status bar crashes for signed-out user
- **Where:** `src/components/StatusBar/StatusBar.jsx`, `renderUserSection`.
- **Concept:** the guard checks for `undefined`, but what does the app
  actually pass when there is no user? `null` and `undefined` are different
  under strict equality.

## Logic — ReferenceErrors

### 5. "NO REPORT" placeholder crashes
- **Where:** `src/components/StatusBar/StatusBar.jsx`, `renderReportSection`.
- **Concept:** a variable is used that was never declared in that scope.

### 6. EOD reports crash the app
- **Where:** `src/containers/AppContainer/AppContainer.jsx`, `renderMain`.
- **Concept:** same as #5 — check what identifier the REST branch actually
  has in scope.

### 7. Menu lookup throws
- **Where:** `src/helpers/menuHelpers.js`, `findNodeById`.
- **Concept:** (a) leaf nodes have no `children` — guard before reading
  `.length`. (b) the not-found path returns an identifier that only exists
  inside the loop.

## Logic — tree traversal depth

### 8. Third menu level never renders
- **Where:** `src/helpers/menuHelpers.js`, `flattenMenuForRender`.
- **Concept:** the loops only walk two levels; the contract needs the
  level-3 leaves emitted inside the level-2 iteration (still no recursion).

## Logic — state mutation

### 9. Menu toggle appears dead
- **Where:** `src/store/menu/reducer.js`, `MENU_TOGGLE_NODE` case.
- **Concept:** the reducer mutates `state.expandedIds` in place and returns
  the same object. react-redux decides "did anything change?" by reference
  equality — a mutated object looks unchanged.

## Architecture

### 10. Backend menu ignored
- **Where:** `src/constants/menuData.js` and `src/store/menu/reducer.js`
  (`APP_INIT_SUCCESS` case).
- **Concept:** single source of truth — the reducer seeds from a hardcoded
  frontend copy instead of the `menuData` in the init payload.

## Types

### 11. Theme mode accepts any string
- **Where:** `src/styles/theme.ts`.
- **Concept:** `type ThemeMode = string` verifies nothing; a union type
  does. Watch for a lying `as` cast hiding the problem downstream.

## Styles

### 12. Table ignores light theme
- **Where:** `src/styles/components/ReportTable.styles.ts`.
- **Concept:** compare with the other style files — these rules read fixed
  colors instead of the theme tokens.

### 13. Body paints over sticky header
- **Where:** `src/styles/components/ReportTable.styles.ts`, `headerCell`.
- **Concept:** stacking contexts — a sticky header needs a `z-index` above
  the animated body cells.

### 14. Skeleton sidebar too wide
- **Where:** `src/styles/components/AppContainer.styles.js`,
  `skeletonSidebar`.
- **Concept:** `width: 300px` + padding = 332px unless `box-sizing:
  border-box` makes padding count inward.

### 15. Blinking cursor out of place
- **Where:** `src/styles/components/SidebarContainer.styles.js`, `cursor`.
- **Concept:** `position: absolute` positions against the nearest
  *positioned* ancestor — the header needs `position: relative`.

### 16. Status bar misaligned
- **Where:** `src/styles/components/StatusBar.styles.js`, `root` and
  `section`.
- **Concept:** floats don't vertically center or distribute; this wants a
  flex row (`display: flex`, `align-items: center`,
  `justify-content: space-between`).

## Tests

### 17. Test asserting a bug
- **Where:** `src/helpers/__tests__/formatHelpers.test.ts`, the test named
  "renders empty string for null and undefined".
- **Concept:** tests are code too — this one pins `formatCell(undefined)`
  to `'undefined'`, encoding bug #1 as correct.
