# Planted Bugs

Seventeen deliberate bugs/inconsistencies. The app still boots (FX Spot loads and streams),
but plenty is broken. Symptoms only here — fixes are in `solutions.md`.

## Logic — null / undefined / loose equality

### 1. Undefined cells render the text "undefined"
- **File:** `src/helpers/formatHelpers.ts` (`formatCell`)
- **Symptom:** any report cell whose value is `undefined` displays the literal
  string `undefined` instead of an empty cell.

### 2. Malformed numeric filters match nothing instead of falling back
- **File:** `src/helpers/tableHelpers.ts` (`parseNumericFilter`)
- **Symptom:** typing a broken operator filter (e.g. `>abc`) into a numeric
  column hides every row. It should fall back to substring matching.
  Classic `NaN` comparison trap.

### 3. Empty cells match text filters they shouldn't
- **File:** `src/helpers/tableHelpers.ts` (`matchesSubstring`)
- **Symptom:** filtering a string column with e.g. `n` or `und` also matches
  rows whose cell is missing entirely.

### 4. Status bar crashes for a signed-out user
- **File:** `src/components/StatusBar/StatusBar.jsx` (`renderUserSection`)
- **Symptom:** when `user` is `null` (how the app actually passes "no user"),
  the component throws `Cannot read properties of null (reading 'name')`
  instead of showing `NOT SIGNED IN`. null vs undefined guard mix-up.

## Logic — not-defined variables (runtime ReferenceErrors)

### 5. Status bar crashes when no report is selected
- **File:** `src/components/StatusBar/StatusBar.jsx` (`renderReportSection`)
- **Symptom:** `ReferenceError: noReportText is not defined` whenever the
  "NO REPORT" placeholder branch renders.

### 6. Selecting any EOD (REST) report crashes the app
- **File:** `src/containers/AppContainer/AppContainer.jsx` (`renderMain`)
- **Symptom:** clicking an EOD report (Swaps, FX Forwards, …) shows the
  "System Fault" panel — `ReferenceError: nodeId is not defined`.

### 7. Menu lookup crashes / throws on the not-found path
- **File:** `src/helpers/menuHelpers.js` (`findNodeById`)
- **Symptom (a):** looking up nodes that sit after a level-2 report leaf in
  tree order throws `Cannot read properties of undefined (reading 'length')` —
  a loop iterates `children` of leaf nodes without a null/array check.
- **Symptom (b):** when the id is not found at all, the function throws
  `ReferenceError: node is not defined` instead of returning `null`.

## Logic — tree traversal depth

### 8. Third menu level never renders
- **File:** `src/helpers/menuHelpers.js` (`flattenMenuForRender`)
- **Symptom:** expanding FX / Rates / Credit / Commodities shows nothing —
  the flattener only walks two levels, so all level-3 reports (FX Spot,
  Govt Bonds, Energy, …) are missing from the sidebar.

## Logic — state mutation + reference equality

### 9. Clicking a menu group appears to do nothing
- **File:** `src/store/menu/reducer.js` (`MENU_TOGGLE_NODE`)
- **Symptom:** the reducer mutates `state.expandedIds` in place and returns the
  **same state object**. Reference-equality checks (`==` on the object) see
  "nothing changed", so react-redux skips the re-render. The data is different
  but the object is the same. The sidebar only catches up when some unrelated
  action (e.g. a live WS tick) produces a new state.

## Architecture inconsistency

### 10. Menu data hardcoded on the frontend
- **Files:** `src/constants/menuData.js`, `src/store/menu/reducer.js`
- **Symptom:** the sidebar tree comes from a hardcoded frontend copy; the
  `menuData` sent by `GET /api/init` is silently ignored (though it still
  flows through Redux). Any backend menu change will never appear in the UI —
  the two copies will drift.

## Types

### 11. `ThemeMode` accepts any string
- **File:** `src/styles/theme.ts`
- **Symptom:** `type ThemeMode = string` compiles for any typo
  (`'ligt'`, `'DARK'`, …) which silently falls back to the dark palette; a
  lying `as 'dark' | 'light'` cast hides it from MUI's palette typing.

## Styles

### 12. Report table ignores the light theme
- **File:** `src/styles/components/ReportTable.styles.ts`
- **Symptom:** toggling to the light theme switches the whole app except the
  data table — panel, rows, borders and footer stay dark.

### 13. Table body paints over the sticky header
- **File:** `src/styles/components/ReportTable.styles.ts` (`headerCell`)
- **Symptom:** while scrolling, flashing (recently ticked) body cells render
  on top of the sticky column headers.

### 14. Loading skeleton sidebar is wider than the real sidebar
- **File:** `src/styles/components/AppContainer.styles.js` (`skeletonSidebar`)
- **Symptom:** during the init skeleton, the fake sidebar is 332px wide
  (300 + padding), then snaps to 300px once loaded — visible layout shift.
  Missing box-sizing.

### 15. Sidebar's blinking cursor floats out of place
- **File:** `src/styles/components/SidebarContainer.styles.js` (`cursor`)
- **Symptom:** the amber block cursor in the "NAVIGATOR" header is positioned
  absolutely with no positioned ancestor, so it pops out of the header flow.

### 16. Status bar uses floats instead of flex
- **File:** `src/styles/components/StatusBar.styles.js` (`root`, `section`)
- **Symptom:** the three sections are floated; inner spacing and vertical
  centering are off, and the report section is no longer centered. Should be
  a flex row.

## Tests

### 17. A test that asserts the bug is correct
- **File:** `src/helpers/__tests__/formatHelpers.test.ts`
- **Symptom:** the test named "renders empty string for null and undefined"
  actually asserts `formatCell(undefined, type)` returns `'undefined'` —
  it encodes bug #1 as expected behavior and passes.
