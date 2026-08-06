import { describe, it, expect } from 'vitest';
import {
  selectReportsById,
  selectReportById,
  makeSelectReportById,
  selectOpenReportIds,
  selectIsReportPaused,
  selectReportConnectionStatus,
} from '../selectors';
import { createInitialReportState } from '../reportsSlice';
import type { ReportState } from '../../../types';

const fxSpot: ReportState = {
  ...createInitialReportState('fx-spot', 'ws'),
  paused: true,
  connectionStatus: 'open',
};
const etfs: ReportState = createInitialReportState('etfs', 'rest');

const state = { reports: { byId: { 'fx-spot': fxSpot, etfs } } };
const emptyState = { reports: { byId: {} } };

describe('reports selectors', () => {
  it('selectReportsById returns the byId map', () => {
    expect(selectReportsById(state)).toBe(state.reports.byId);
  });

  it('selectReportById returns the matching report', () => {
    expect(selectReportById(state, 'fx-spot')).toBe(fxSpot);
  });

  it('selectReportById returns undefined for unknown ids', () => {
    expect(selectReportById(state, 'ghost')).toBeUndefined();
  });

  describe('makeSelectReportById', () => {
    it('selects the report for its bound id', () => {
      const selectFxSpot = makeSelectReportById('fx-spot');
      expect(selectFxSpot(state)).toBe(fxSpot);
    });

    it('returns undefined when the report is not opened', () => {
      const selectGhost = makeSelectReportById('ghost');
      expect(selectGhost(state)).toBeUndefined();
    });

    it('memoizes: same input state yields the same reference without recompute', () => {
      const selectFxSpot = makeSelectReportById('fx-spot');
      const first = selectFxSpot(state);
      const second = selectFxSpot(state);
      expect(second).toBe(first);
      expect(selectFxSpot.recomputations()).toBe(1);
    });

    it('recomputes when the byId map changes', () => {
      const selectFxSpot = makeSelectReportById('fx-spot');
      selectFxSpot(state);
      const updated = {
        reports: { byId: { ...state.reports.byId, 'fx-spot': { ...fxSpot, paused: false } } },
      };
      expect(selectFxSpot(updated)?.paused).toBe(false);
      expect(selectFxSpot.recomputations()).toBe(2);
    });

    it('independent instances track their own ids', () => {
      const selectA = makeSelectReportById('fx-spot');
      const selectB = makeSelectReportById('etfs');
      expect(selectA(state)).toBe(fxSpot);
      expect(selectB(state)).toBe(etfs);
    });
  });

  it('selectOpenReportIds lists all opened report ids', () => {
    expect(selectOpenReportIds(state)).toEqual(['fx-spot', 'etfs']);
    expect(selectOpenReportIds(emptyState)).toEqual([]);
  });

  it('selectIsReportPaused reflects the paused flag and defaults to false', () => {
    expect(selectIsReportPaused(state, 'fx-spot')).toBe(true);
    expect(selectIsReportPaused(state, 'etfs')).toBe(false);
    expect(selectIsReportPaused(state, 'ghost')).toBe(false);
  });

  it('selectReportConnectionStatus returns the status, idle when unopened', () => {
    expect(selectReportConnectionStatus(state, 'fx-spot')).toBe('open');
    expect(selectReportConnectionStatus(state, 'etfs')).toBe('idle');
    expect(selectReportConnectionStatus(state, 'ghost')).toBe('idle');
  });
});
