import { describe, it, expect, vi, beforeEach } from 'vitest';

// selectSelectedReportNode delegates tree search to the shared helper; mock it
// so these tests only cover the selector's own logic.
vi.mock('../../../helpers/menuHelpers', () => ({
  findNodeById: vi.fn(),
}));

import { findNodeById } from '../../../helpers/menuHelpers';
import {
  selectMenuItems,
  selectExpandedIds,
  selectSelectedReportId,
  selectSelectedReportNode,
} from '../selectors';

const items = [
  {
    id: 'markets',
    label: 'Markets',
    type: 'group',
    children: [
      { id: 'fx-spot', label: 'FX Spot', type: 'report', transport: 'ws' },
    ],
  },
];

const makeState = (menu) => ({
  menu: {
    items,
    expandedIds: ['markets'],
    selectedReportId: null,
    ...menu,
  },
});

describe('menu selectors', () => {
  beforeEach(() => {
    vi.mocked(findNodeById).mockReset();
  });

  it('selectMenuItems returns the items', () => {
    expect(selectMenuItems(makeState())).toBe(items);
  });

  it('selectExpandedIds returns the expanded ids', () => {
    expect(selectExpandedIds(makeState())).toEqual(['markets']);
  });

  it('selectSelectedReportId returns the selected id', () => {
    expect(
      selectSelectedReportId(makeState({ selectedReportId: 'fx-spot' }))
    ).toBe('fx-spot');
  });

  describe('selectSelectedReportNode', () => {
    it('returns null when nothing is selected without searching', () => {
      expect(selectSelectedReportNode(makeState())).toBeNull();
      expect(findNodeById).not.toHaveBeenCalled();
    });

    it('looks up the selected node via findNodeById', () => {
      const node = items[0].children[0];
      vi.mocked(findNodeById).mockReturnValue(node);
      const result = selectSelectedReportNode(
        makeState({ selectedReportId: 'fx-spot' })
      );
      expect(findNodeById).toHaveBeenCalledWith(items, 'fx-spot');
      expect(result).toBe(node);
    });

    it('returns null when the id is not found in the tree', () => {
      vi.mocked(findNodeById).mockReturnValue(undefined);
      expect(
        selectSelectedReportNode(makeState({ selectedReportId: 'ghost' }))
      ).toBeNull();
    });
  });
});
