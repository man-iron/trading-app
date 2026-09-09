# Solutions to the planted bugs

This guide covers all 22 deliberate bugs in the current working tree: startup
bugs 0a–0c and bugs #1–19. Numbering matches `bugs.md`. The snippets below are
fixes to apply, not changes already made to the application.

Fix the startup bugs in order to reach the UI. The remaining bugs can generally
be fixed independently; fix #17 alongside #1 so the formatting tests agree with
the corrected behavior.

## 0a. The dev server refuses to compile

**File:** `src/containers/AppContainer/AppContainer.jsx`, `renderLoading`.

The destructuring statement has no declaration keyword. Replace it with:

```jsx
const { classes } = this.props;
```

Without `const`, the parser treats the opening brace as a block rather than a
variable declaration. This prevents compilation and can also block test collection
when a suite imports this component.

## 0b. Root element not found

**Files:** `src/constants/appConstants.ts` and `src/main.tsx`.

Remove the trailing space from the constant:

```ts
export const ROOT = 'root';
```

Keep `document.getElementById(ROOT)` and the missing-container guard in
`main.tsx`. The HTML element has `id="root"`; DOM ID lookup does not trim
whitespace, so `'root '` returns `null`. Fix the constant rather than weakening
the guard or changing the HTML to match the typo.

## 0c. Undeclared React root

**File:** `src/main.tsx`.

Declare the variable before rendering:

```tsx
const appRoot = createRoot(container);
```

The existing `appRoot.render(...)` can stay. ES modules run in strict mode;
assigning to an undeclared identifier throws a `ReferenceError`.

## 1. Cells display the literal text "undefined"

**File:** `src/helpers/formatHelpers.ts`, `formatCell`.

Delete `value = normalizeCellValue(value);` and remove the now-unused
`normalizeCellValue` helper and its comment. Keep the existing guard as the first
statement in `formatCell`:

```ts
if (value == null) {
  return '';
}
```

The helper converts missing values into the string `'undefined'` before the
guard can detect them. The loose null comparison intentionally covers both
`null` and `undefined`. Leave all numeric and timestamp formatting below it.
Also apply #17.

## 2. Malformed numeric filters reject every row

**File:** `src/helpers/tableHelpers.ts`, `filterRows`.

Delete this line:

```ts
if (hasNumericOperatorPrefix(text)) return false;
```

Remove the unused `hasNumericOperatorPrefix` helper too. Keep the existing
numeric-parser branch and final `matchesSubstring(value, text)` call.
`parseNumericFilter` already rejects invalid numeric operands; a rejected parse
should reach substring matching instead of rejecting the row unconditionally.

For example, a raw cell containing `>abc` should match the filter `>abc`, even
in a numeric column. Ordinary numeric prices still will not contain that text,
so an empty result for that filter on real prices alone does not prove the bug
is present. Use the #2 verification test for a distinguishing example.

## 3. Missing cells match text filters

**File:** `src/helpers/tableHelpers.ts`, `filterRows`.

Read the original cell value without substituting text:

```ts
const value = row[columnKey];
```

`matchesSubstring` already rejects nullish values. Converting a missing value
to `'undefined'` earlier makes it incorrectly match filters such as `und`.

## 4. Signed-out user crashes the status bar

**File:** `src/components/StatusBar/StatusBar.jsx`, `renderUserSection`.

Move the `userName` declaration below the existing null guard:

```jsx
const { classes, user } = this.props;
if (user == null) {
  return <span className={classes.placeholder}>NOT SIGNED IN</span>;
}
const userName = user.name;
```

Keep the existing signed-in JSX below this. A guard cannot protect a property
access that has already happened.

## 5. No selected report crashes the status bar

**File:** `src/components/StatusBar/StatusBar.jsx`, `renderReportSection`.

Replace the undeclared fallback identifier with the intended text:

```jsx
const emptyReportLabel = selectedReportLabel || 'NO REPORT';
```

The `||` expression evaluates its right side only when the selected label is
falsy, which is why populated reports conceal the error.

## 6. EOD reports crash

**File:** `src/containers/AppContainer/AppContainer.jsx`, `renderMain`.

Use the selected node that is already in scope:

```jsx
const restReportId = selectedNode.id;
return <ReportContainer reportId={restReportId} />;
```

The earlier guard has already established that `selectedNode` is a report.
`nodeId` is not declared. Verify by opening an EOD report such as Equities → ETFs.

## 7. Menu lookup throws

**File:** `src/helpers/menuHelpers.js`.

There are two failure paths. In `findLevel3Node`, normalize absent children:

```js
const children = Array.isArray(parent.children) ? parent.children : [];
```

In `missingMenuNode`, return the documented miss value:

```js
function missingMenuNode() {
  return null;
}
```

A level-2 report leaf may have no `children`, and a failed lookup must not refer
to an undeclared `node`. Keep the bounded traversal; recursion is unnecessary
for the three-level menu contract. Verify both leaf traversal and an unknown ID.

## 8. Third menu level is missing

**File:** `src/helpers/menuHelpers.js`, `flattenMenuForRender`.

Replace the final filtered return with:

```js
return rows;
```

The loops already emit level-3 leaves at depth 2 and already skip collapsed
subtrees. The final `row.depth < 2` filter discards valid leaves. Expand
Markets → FX and confirm FX Spot appears.

## 9. Menu toggles do not update immediately

**File:** `src/store/menu/reducer.js`.

Replace the mutating helper with one that returns a new array:

```js
function toggleExpandedId(expandedIds, nodeId) {
  return expandedIds.includes(nodeId)
    ? expandedIds.filter((id) => id !== nodeId)
    : [...expandedIds, nodeId];
}
```

Update its comment to describe returning a new expansion list, and replace the
reducer case with:

```js
case MENU_TOGGLE_NODE: {
  return {
    ...state,
    expandedIds: toggleExpandedId(state.expandedIds, action.payload),
  };
}
```

Both the state object and changed array need fresh references. Mutating the
array and returning the same state prevents reference-based subscriptions from
observing the update. Pause live ticks and verify groups still toggle immediately.

## 10. Backend menu changes are ignored

**File:** `src/store/app/actions.js`, `appInitSuccess`.

Forward the response unchanged:

```js
export const appInitSuccess = (initResponse) => ({
  type: APP_INIT_SUCCESS,
  payload: initResponse,
});
```

Remove the unused `MENU_DATA` import from this file. The current menu reducer
already reads `action.payload.menuData`; the action creator overwrites that
field with the frontend copy. Verify a backend label change survives initialization.

## 11. Theme mode accepts arbitrary strings

**File:** `src/styles/theme.ts`.

Replace `BuiltInThemeMode`, `ExtensionThemeMode`, and the current exported union
with the direct declaration:

```ts
export type ThemeMode = 'dark' | 'light';
```

The `string & {}` extension admits arbitrary strings and defeats the restriction.
The direct union also matches the existing source-based verification test.
Keep the intentional `@ts-expect-error` in that suite: it confirms invalid modes
are rejected. Run the TypeScript build after resolving the other compile errors.

## 12. Report table ignores the light theme

**File:** `src/styles/components/ReportTable.styles.ts`.

Remove the `darkColors` import and `cachedTablePalette`. Simplify the style
factory's parameter list to:

```ts
const styles = (theme: JssTheme, tableColors = theme.colors) => ({
```

Keep the existing style rules and closing `});`. The current spread order
overwrites every active color token with the cached dark palette. Using the
active palette restores light backgrounds, text, borders, filters, and footer.
Verify by toggling the theme with a report open.

## 13. Flashing cells paint over the sticky header

**File:** `src/styles/components/ReportTable.styles.ts`, `headerCell`.

Remove `...inheritedTableLayer` from `headerCell` and delete the unused constant.
Keep the existing `zIndex: 2`.

The spread currently overwrites that value with zero. A positive header layer
keeps it above animated body cells. Verify while scrolling a live table and
watching recently updated rows pass beneath the header.

## 14. Skeleton sidebar has the wrong outer width

**File:** `src/styles/components/AppContainer.styles.js`, `skeletonSidebar`.

Remove `...legacySkeletonBoxModel` and delete the unused constant. Keep the
existing `boxSizing: 'border-box'` and width.

The spread overrides border-box sizing with content-box sizing, making padding
and borders add to the declared width. Reload and compare the loading layout
with the loaded shell.

## 15. Sidebar cursor floats away from the title

**File:** `src/styles/components/SidebarContainer.styles.js`, `cursor`.

Remove `...legacyDetachedCursor` and delete the unused constant. Keep the
cursor's size, color, margin, and animation.

The header already uses flex layout. Removing absolute positioning restores
the cursor to normal flow after the title. Merely adding `position: relative`
to the header does not restore that flow and does not satisfy the existing
verification test.

## 16. Status bar sections are misaligned

**File:** `src/styles/components/StatusBar.styles.js`.

Delete `legacyStatusLayout` and every reference to it: the spread in `root`,
the spread in `section`, and the spread inside `section['&:last-child']`.
Keep the existing styles, including `display: 'flex'`, `alignItems: 'center'`,
and the final section's `marginRight: 0`. Add this to `root`:

```js
justifyContent: 'space-between',
```

The legacy object switches the footer to block layout and floats its sections.
Removing those overrides restores vertical alignment and distributes the three
sections across the footer. Check the user, report, and clock at normal width.

## 17. A test expects the broken formatting behavior

**File:** `src/helpers/__tests__/formatHelpers.test.ts`.

In the parameterized null/undefined test, replace the undefined assertion with:

```ts
expect(formatCell(undefined, type)).toBe('');
```

Keep the existing null assertion. Apply this with #1; tests should assert the
documented empty display for missing values across all column types.

## 18. Connected feed is labelled "Idle"

**File:** `src/components/LiveControls/LiveControls.jsx`.

Add the missing binding in the existing constructor:

```jsx
constructor(props) {
  super(props);
  this.getStatusLabel = this.getStatusLabel.bind(this);
}
```

`render` extracts `getStatusLabel` from the instance and calls it as a standalone
function. Without binding, that call loses `this`. The optional access
`this?.props?.connectionStatus` then returns `undefined`, selecting the `Idle`
fallback instead of throwing. Binding preserves the component receiver, so the
text follows the same status as the dot. Keep the fallback for unknown statuses.

Verify with the existing LiveControls suite: connecting, open, closed, and error
labels should all be correct, while pause/play behavior remains intact.

## 19. URL-controlled HTML in the notice banner

**File:** `src/components/UrlNotice/UrlNotice.jsx`.

The source is the `notice` query parameter, controlled by whoever constructs
the URL. `URLSearchParams` decodes it, and `dangerouslySetInnerHTML` passes it
to an HTML parsing sink. This is a DOM-based XSS vulnerability: injected markup
can include active content such as event-handler attributes. The bold-text demo
demonstrates HTML injection without running a script.

Replace the returned element with ordinary React text children:

```jsx
return (
  <div className={className} role="note" data-testid="url-notice">
    {notice}
  </div>
);
```

Keep the query parsing and absent-notice guard. React renders this string as
text, so `<strong>INJECTED NOTICE</strong>` appears literally and creates no
`strong` element. Do not manually HTML-escape the value before rendering it as
a React child; that would double-encode the visible text.

Candidate discussion points:

- A link is untrusted input even if the frontend reads it without a backend.
- URL encoding does not make HTML safe; query parsing decodes that encoding.
- HTML injection can change the UI and can lead to JavaScript execution.
  A `<script>` tag inserted through innerHTML is not a reliable execution demo;
  lack of execution from that tag does not establish safety.
- For this plain-text feature, remove the HTML sink. If a feature truly needs
  rich HTML, use a maintained allowlist sanitizer suited to that context.
  A hand-written regex or stripping only script tags is not a sound substitute.
- CSP can add protection but does not replace fixing the unsafe rendering.

The dedicated test asserts the safe behavior and intentionally fails while the
bug is planted. It uses inert markup and does not execute an injected script.

## Verification after applying the fixes

Run these commands from the repository root:

```sh
npx vitest run src/__tests__/bugFixes.test.tsx
npx vitest run src/components/LiveControls/__tests__/LiveControls.test.jsx
npx vitest run src/components/UrlNotice/__tests__/UrlNotice.test.jsx
npm test
npm run build
```

The numbered suite covers #1–17. The LiveControls suite covers #18. The full
suite checks surrounding behavior, and the build checks TypeScript and Vite.
The UrlNotice suite checks literal rendering and the absent-parameter case for #19.
These are verification instructions, not a claim that the still-buggy branch
currently passes them.

Finally run `npm run me` and open `http://localhost:3000`. Confirm startup,
third-level navigation, EOD selection, immediate group toggling with ticks paused,
theme changes, scrolling headers, and the connection label. Automated style
checks inspect rule values; the browser checks confirm the visible result.
