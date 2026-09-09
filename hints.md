# Hints

One pointer per bug: where to look and what concept is involved. Numbering
matches `bugs.md`. Read a hint only after you've had an honest attempt — the
full fixes are in `solutions.md` on the `solutions` branch.

## Startup

### 0a. The dev server refuses to compile
- **Where:** `src/containers/AppContainer/AppContainer.jsx`, the loading renderer.
- **Concept:** destructuring into *new* variables needs a declaration keyword.
  Read the overlay's error position carefully — why would the parser see a
  block `{ ... }` instead of an object pattern there?

### 0b. Blank page after 0a
- **Where:** `src/main.tsx` and `src/constants/appConstants.ts`.
- **Concept:** `getElementById` matches the exact ID, including whitespace.
  Compare the imported constant with the mounting element in `index.html`.

### 0c. Blank page after 0b
- **Where:** `src/main.tsx`, near the bottom.
- **Concept:** the DOM container is declared correctly; inspect the variable
  used to hold React's root. In strict-mode ES modules, assigning to an
  undeclared identifier throws instead of creating a global.

## Logic — null / undefined / loose equality

### 1. Cells render "undefined"
- **Where:** `src/helpers/formatHelpers.ts`, `formatCell`.
- **Concept:** trace the value *before* the empty-cell guard. Is a missing
  value still nullish by the time the guard sees it? The feed omitting fields
  it can't quote is legitimate; the fix belongs in client-side formatting.

### 2. Malformed numeric filters match nothing
- **Where:** `src/helpers/tableHelpers.ts`, the numeric branch in `filterRows`.
- **Concept:** the parser already rejects `NaN`. Follow what the caller does
  after that rejection: malformed operator text should reach substring
  matching rather than becoming an unconditional non-match.

### 3. Empty cells match text filters
- **Where:** `src/helpers/tableHelpers.ts`, where `filterRows` reads a cell.
- **Concept:** `matchesSubstring` handles a missing value, but only if its
  caller has not already replaced that value with ordinary text.

### 4. Status bar crashes for signed-out user
- **Where:** `src/components/StatusBar/StatusBar.jsx`, `renderUserSection`.
- **Concept:** the nullish guard is present. Check whether every user-property
  read happens *after* it; guard order matters as much as guard condition.

## Logic — ReferenceErrors

### 5. "NO REPORT" placeholder crashes
- **Where:** `src/components/StatusBar/StatusBar.jsx`, `renderReportSection`.
- **Concept:** short-circuit fallback expressions evaluate their right-hand
  side only when needed. Follow the value prepared for the empty selection.

### 6. EOD reports crash the app
- **Where:** `src/containers/AppContainer/AppContainer.jsx`, `renderMain`.
- **Concept:** inspect the local value prepared immediately before the REST
  component is returned, not just the JSX prop itself.

### 7. Menu lookup throws
- **Where:** `src/helpers/menuHelpers.js`, the small helpers used by
  `findNodeById` for level 3 and misses.
- **Concept:** (a) leaf nodes have no `children`, so a helper must normalize
  them before a loop reads `.length`; (b) the miss helper must return a value
  that actually exists in its scope.

## Logic — tree traversal depth

### 8. Third menu level never renders
- **Where:** `src/helpers/menuHelpers.js`, `flattenMenuForRender`.
- **Concept:** the bounded loops do emit level-3 leaves. Trace the completed
  `rows` array through the function's return path and see which depths survive.

## Logic — state mutation

### 9. Menu toggle appears dead
- **Where:** `src/store/menu/reducer.js`, the toggle helper called by the
  `MENU_TOGGLE_NODE` case.
- **Concept:** moving `push`/`splice` into a helper does not make them
  immutable. React-Redux still needs fresh array and state references.

## Architecture

### 10. Backend menu ignored
- **Where:** `src/store/app/actions.js`, `appInitSuccess` (the menu reducer now
  consumes whatever that action carries).
- **Concept:** single source of truth — make sure the action creator forwards
  the backend payload instead of silently overwriting one field with a
  frontend copy.

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

## Logic — visible connection text

### 18. Live connection says "Idle" while prices update
- **Where:** `src/components/LiveControls/LiveControls.jsx`, `getStatusLabel`
  and its call in `render`.
- **Concept:** extracting a class method loses its receiver. The optional
  access falls back to idle instead of throwing. Check whether the method
  is bound to the component before it is called without a receiver.

## Security

### 19. URL notice becomes HTML
- **Where:** `src/components/UrlNotice/UrlNotice.jsx`.
- **Concept:** trace the URL parameter into the DOM. Compare React text
  children with `dangerouslySetInnerHTML`: which one treats the value as data,
  and which asks the browser to parse it as markup? URL encoding is transport
  encoding, not HTML sanitization.
