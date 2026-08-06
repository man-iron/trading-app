import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getInit, getReport, getEodReport, getEodDates } from '../restClient';
import type { InitResponse, ReportPayload } from '../../types';

const initResponse: InitResponse = {
  userData: {
    id: 'u1',
    name: 'Ada Trader',
    role: 'trader',
    email: 'ada@example.com',
    desk: 'FX',
    preferences: { theme: 'dark', defaultReportId: null },
  },
  menuData: [],
  eodDates: ['2026-08-05'],
};

const reportPayload: ReportPayload = {
  reportId: 'etfs',
  columns: [{ key: 'symbol', label: 'Symbol', type: 'string' }],
  rows: [{ id: 'r1', symbol: 'SPY' }],
  asOf: '2026-08-06T10:00:00Z',
};

const okResponse = (body: unknown) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  json: () => Promise.resolve(body),
});

const errorResponse = (status: number, statusText: string, body?: unknown) => ({
  ok: false,
  status,
  statusText,
  json: () =>
    body === undefined
      ? Promise.reject(new SyntaxError('Unexpected end of JSON input'))
      : Promise.resolve(body),
});

const fetchMock = vi.fn();

describe('restClient', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('getInit', () => {
    it('GETs /api/init and returns the parsed InitResponse', async () => {
      fetchMock.mockResolvedValue(okResponse(initResponse));
      await expect(getInit()).resolves.toEqual(initResponse);
      expect(fetchMock).toHaveBeenCalledWith('/api/init', {
        headers: { Accept: 'application/json' },
      });
    });
  });

  describe('getReport', () => {
    it('GETs /api/reports/:reportId and returns the payload', async () => {
      fetchMock.mockResolvedValue(okResponse(reportPayload));
      await expect(getReport('etfs')).resolves.toEqual(reportPayload);
      expect(fetchMock).toHaveBeenCalledWith('/api/reports/etfs', {
        headers: { Accept: 'application/json' },
      });
    });

    it('URL-encodes the report id', async () => {
      fetchMock.mockResolvedValue(okResponse(reportPayload));
      await getReport('weird/id');
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/reports/weird%2Fid',
        expect.anything()
      );
    });
  });

  describe('getEodReport', () => {
    it('GETs the eod endpoint with the date query param', async () => {
      fetchMock.mockResolvedValue(okResponse(reportPayload));
      await expect(getEodReport('etfs', '2026-08-05')).resolves.toEqual(reportPayload);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/reports/etfs/eod?date=2026-08-05',
        { headers: { Accept: 'application/json' } }
      );
    });
  });

  describe('getEodDates', () => {
    it('GETs /api/eod-dates and unwraps the dates array', async () => {
      fetchMock.mockResolvedValue(okResponse({ dates: ['2026-08-05', '2026-08-04'] }));
      await expect(getEodDates()).resolves.toEqual(['2026-08-05', '2026-08-04']);
      expect(fetchMock).toHaveBeenCalledWith('/api/eod-dates', {
        headers: { Accept: 'application/json' },
      });
    });
  });

  describe('error handling', () => {
    it('throws the server error message on !ok JSON error bodies', async () => {
      fetchMock.mockResolvedValue(
        errorResponse(404, 'Not Found', { error: 'Unknown report: ghost' })
      );
      await expect(getReport('ghost')).rejects.toThrow('Unknown report: ghost');
    });

    it('falls back to the HTTP status when the error body is not JSON', async () => {
      fetchMock.mockResolvedValue(errorResponse(500, 'Internal Server Error'));
      await expect(getInit()).rejects.toThrow(
        'Request failed: 500 Internal Server Error'
      );
    });

    it('falls back to the HTTP status when the JSON body has no string error field', async () => {
      fetchMock.mockResolvedValue(errorResponse(503, 'Service Unavailable', { nope: 1 }));
      await expect(getEodDates()).rejects.toThrow(
        'Request failed: 503 Service Unavailable'
      );
    });

    it('propagates network-level fetch rejections', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
      await expect(getInit()).rejects.toThrow('Failed to fetch');
    });
  });
});
