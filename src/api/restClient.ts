import type { InitResponse, ReportPayload } from '../types';
import { REST_BASE_URL } from '../constants/reportConstants';

/**
 * Performs a GET request against the REST API and parses the JSON body.
 * On a non-2xx response it throws an `Error` whose message is the server's
 * `error` field when available, falling back to the HTTP status text.
 */
async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${REST_BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    let message = `Request failed: ${response.status} ${response.statusText}`;
    try {
      const body: unknown = await response.json();
      if (
        body !== null &&
        typeof body === 'object' &&
        'error' in body &&
        typeof (body as { error: unknown }).error === 'string'
      ) {
        message = (body as { error: string }).error;
      }
    } catch {
      // Non-JSON error body — keep the HTTP status message.
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

/** GET /api/init — user data, menu tree, and available EOD dates. */
export function getInit(): Promise<InitResponse> {
  return getJson<InitResponse>('/init');
}

/** GET /api/reports/:reportId — current snapshot for a REST report. */
export function getReport(reportId: string): Promise<ReportPayload> {
  return getJson<ReportPayload>(`/reports/${encodeURIComponent(reportId)}`);
}

/** GET /api/reports/:reportId/eod?date=YYYY-MM-DD — EOD snapshot for a date. */
export function getEodReport(reportId: string, date: string): Promise<ReportPayload> {
  return getJson<ReportPayload>(
    `/reports/${encodeURIComponent(reportId)}/eod?date=${encodeURIComponent(date)}`
  );
}

/** GET /api/eod-dates — available EOD dates (newest first). */
export async function getEodDates(): Promise<string[]> {
  const { dates } = await getJson<{ dates: string[] }>('/eod-dates');
  return dates;
}
