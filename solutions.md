# Solutions

Fixes for every bug in `bugs.md`, same numbering.

### 1. Undefined cells render "undefined"
`src/helpers/formatHelpers.ts`, `formatCell` guard:
```ts
// buggy
if (value === null) {
// fix — handle undefined too
if (value === null || value === undefined) {
```
(The `String(value)` wrapper added in the `timestamp` branch can then go back
to `Date.parse(value)`.)

### 2. Malformed numeric filters match nothing
`src/helpers/tableHelpers.ts`, `parseNumericFilter`:
```ts
// buggy — NaN is never == to anything, including NaN, so this never rejects
if (operand == Number.NaN) return null;
// fix
if (Number.isNaN(operand)) return null;
```

### 3. Empty cells match text filters
`src/helpers/tableHelpers.ts`, `matchesSubstring`:
```ts
// buggy — String(undefined) === 'undefined'
return String(value).toLowerCase()...
// fix
return String(value ?? '').toLowerCase()...
```

### 4. Status bar crashes for a signed-out user
`src/components/StatusBar/StatusBar.jsx`, `renderUserSection`:
```js
// buggy — the app passes null, not undefined
if (user === undefined) {
// fix — cover both null and undefined
if (!user) {
```

### 5. `noReportText is not defined`
`src/components/StatusBar/StatusBar.jsx`, `renderReportSection`: the
placeholder branch references an undeclared variable.
```jsx
// buggy
<span className={classes.placeholder}>{noReportText}</span>
// fix
<span className={classes.placeholder}>NO REPORT</span>
```

### 6. `nodeId is not defined` on EOD reports
`src/containers/AppContainer/AppContainer.jsx`, `renderMain` REST branch:
```jsx
// buggy
return <ReportContainer reportId={nodeId} />;
// fix
return <ReportContainer reportId={selectedNode.id} />;
```

### 7. `findNodeById` crashes
`src/helpers/menuHelpers.js`:
```js
// buggy — leaf nodes have no children array
const level2Children = level2.children;
// fix — restore the guard
const level2Children = Array.isArray(level2.children) ? level2.children : [];
```
and on the not-found path:
```js
// buggy
return node;
// fix
return null;
```

### 8. Third menu level never renders
`src/helpers/menuHelpers.js`, `flattenMenuForRender`: the level-3 emission
loop was deleted (the dangling `if (!level2IsExpanded) continue;` is the
leftover clue). Restore inside the level-2 loop, after that check:
```js
const level2Children = Array.isArray(level2.children) ? level2.children : [];

// Level 3: always report leaves.
for (let k = 0; k < level2Children.length; k += 1) {
  rows.push({ node: level2Children[k], depth: 2, isExpanded: false, visible: true });
}
```

### 9. Menu group clicks appear dead (mutation + reference equality)
`src/store/menu/reducer.js`, `MENU_TOGGLE_NODE`: never mutate state; return a
new object so reference checks can see the change:
```js
// buggy — mutates in place, returns the same reference
state.expandedIds.push(nodeId); ... return state;
// fix
return {
  ...state,
  expandedIds: isExpanded
    ? state.expandedIds.filter((id) => id !== nodeId)
    : [...state.expandedIds, nodeId],
};
```

### 10. Frontend-hardcoded menu data
`src/store/menu/reducer.js`: seed the tree from the API payload again and
delete `src/constants/menuData.js`:
```js
// buggy
items: MENU_DATA,
// fix
const { menuData, userData } = action.payload;
...
items: menuData,
```

### 11. `ThemeMode` bad type
`src/styles/theme.ts`:
```ts
// buggy
export type ThemeMode = string;
...
mode: mode as 'dark' | 'light',
// fix
export type ThemeMode = 'dark' | 'light';
...
mode,   // no cast needed once the union is back
```

### 12. Report table ignores the light theme
`src/styles/components/ReportTable.styles.ts`: it imports the static dark
`colors` object and uses it for surfaces. Remove
`import { colors } from '../theme';` and change every `colors.*` back to
`theme.colors.*` (root, filterCell, row hover, cell, footer). The theme
object provided by the JSS `ThemeProvider` is what swaps per mode.

### 13. Body cells paint over the sticky header
`src/styles/components/ReportTable.styles.ts`, `headerCell` — restore:
```ts
zIndex: 2,
```

### 14. Skeleton sidebar layout shift
`src/styles/components/AppContainer.styles.js`, `skeletonSidebar` — restore:
```js
boxSizing: 'border-box',
```

### 15. Blinking cursor out of place
`src/styles/components/SidebarContainer.styles.js`, `cursor` — remove
`position: 'absolute'` (it's an inline-block element in normal flow).

### 16. Status bar floats → flex
`src/styles/components/StatusBar.styles.js` — replace the float layout:
```js
root: {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing.unit * 2,
  height: 28,
  ...            // (drop lineHeight; keep the rest)
},
section: {
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing.unit,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  // remove float, marginRight and the '&:last-child' override
},
```

### 17. Bad test
`src/helpers/__tests__/formatHelpers.test.ts` — the assertion contradicts the
test name and encodes bug #1:
```ts
// buggy
expect(formatCell(undefined, type)).toBe('undefined');
// fix
expect(formatCell(undefined, type)).toBe('');
```

## Verification

- `npx tsc -b` passes both before and after fixes (the bugs are runtime bugs).
- With the bugs planted, `npm test` fails 39 of 385 tests across 8 files
  (menuHelpers, tableHelpers, menu reducer, TreeMenu, StatusBar, AppContainer,
  LiveReportContainer, initThunk) — those failures point straight at bugs
  2, 3, 4, 5, 6, 7, 8, 9 and 10. Bugs 1/17 (self-approving test), 11 (type),
  and 12–16 (styles) are NOT covered by the suite and must be found by review
  or in the browser.
- After applying every fix above, all 385 tests should pass again and the
  light/dark toggle should restyle the report table too.
