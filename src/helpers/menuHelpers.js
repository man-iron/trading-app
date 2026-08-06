/**
 * @file Menu tree helpers for the sidebar TreeMenu.
 *
 * Type shapes referenced below mirror the binding contract in
 * `docs/ARCHITECTURE.md` (`MenuNode` in `src/types/index.ts`).
 *
 * @typedef {Object} MenuNode
 * @property {string} id
 * @property {string} label
 * @property {'group'|'report'} type
 * @property {'ws'|'rest'} [transport]  Only present when type === 'report'.
 * @property {MenuNode[]} [children]    Backend sends up to 3 levels deep.
 *
 * @typedef {Object} FlatMenuRow
 * @property {MenuNode} node        The original menu node.
 * @property {number} depth         0 for level-1, 1 for level-2, 2 for level-3.
 * @property {boolean} isExpanded   Whether this node (if a group) is expanded.
 * @property {boolean} visible      Always true — collapsed subtrees are omitted
 *                                  from the output entirely.
 */

/**
 * Find a menu node by id anywhere in the (max 3 level) menu tree.
 *
 * Uses bounded nested loops — the backend contract guarantees the tree is at
 * most 3 levels deep, so no recursion is needed.
 *
 * @param {MenuNode[]} items Top-level menu nodes (may be null/undefined).
 * @param {string} id        Node id to look for.
 * @returns {MenuNode|null}  The matching node, or null when not found.
 */
export function findNodeById(items, id) {
  if (!Array.isArray(items)) {
    return null;
  }
  for (let i = 0; i < items.length; i += 1) {
    const level1 = items[i];
    if (level1.id === id) {
      return level1;
    }
    const level1Children = Array.isArray(level1.children) ? level1.children : [];
    for (let j = 0; j < level1Children.length; j += 1) {
      const level2 = level1Children[j];
      if (level2.id === id) {
        return level2;
      }
      const level2Children = level2.children;
      for (let k = 0; k < level2Children.length; k += 1) {
        const level3 = level2Children[k];
        if (level3.id === id) {
          return level3;
        }
      }
    }
  }
  return node;
}

/**
 * Flatten the menu tree into the ordered list of rows the TreeMenu renders.
 *
 * DELIBERATE CONSTRAINT (per architecture contract / user requirement):
 * this function uses explicit nested `for` loops and NO recursion. It handles
 * exactly 2 levels of group nesting — level-3 nodes are always leaves and are
 * emitted inside the level-2 iteration. The backend guarantees the menu tree
 * is never deeper than 3 levels, so the bounded loops are exhaustive.
 *
 * Only visible rows are returned: children of collapsed groups are omitted
 * entirely (their expansion state in `expandedIds` is irrelevant while any
 * ancestor is collapsed).
 *
 * @param {MenuNode[]} menuData             Top-level menu nodes.
 * @param {string[]|Set<string>} expandedIds Ids of expanded group nodes.
 * @returns {FlatMenuRow[]} Ordered, depth-annotated rows for rendering.
 */
export function flattenMenuForRender(menuData, expandedIds) {
  const expanded = expandedIds instanceof Set ? expandedIds : new Set(expandedIds || []);
  /** @type {FlatMenuRow[]} */
  const rows = [];

  if (!Array.isArray(menuData)) {
    return rows;
  }

  // Level 1: asset-class groups (or top-level reports).
  for (let i = 0; i < menuData.length; i += 1) {
    const level1 = menuData[i];
    const level1IsExpanded = level1.type === 'group' && expanded.has(level1.id);
    rows.push({ node: level1, depth: 0, isExpanded: level1IsExpanded, visible: true });

    if (!level1IsExpanded) {
      continue; // Collapsed (or a leaf report): its subtree stays hidden.
    }

    const level1Children = Array.isArray(level1.children) ? level1.children : [];

    // Level 2: sub-groups OR reports.
    for (let j = 0; j < level1Children.length; j += 1) {
      const level2 = level1Children[j];
      const level2IsExpanded = level2.type === 'group' && expanded.has(level2.id);
      rows.push({ node: level2, depth: 1, isExpanded: level2IsExpanded, visible: true });

      if (!level2IsExpanded) {
        continue;
      }
    }
  }

  return rows;
}
