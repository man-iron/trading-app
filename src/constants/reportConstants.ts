import type { ReportMode, ReportState, Transport } from '../types';

/** Report data transports. */
export const TRANSPORTS = {
  WS: 'ws',
  REST: 'rest',
} as const satisfies Record<string, Transport>;

/** Base URL for the REST API. Vite dev server proxies '/api' to http://localhost:4000. */
export const REST_BASE_URL = '/api';

/** WebSocket server URL (ws-server.js listens on port 4001). */
export const WS_URL = 'ws://localhost:4001';

/** Server -> client WebSocket message types. */
export const WS_SERVER_MESSAGE_TYPES = {
  SNAPSHOT: 'snapshot',
  TICK: 'tick',
  ERROR: 'error',
} as const;

/** Client -> server WebSocket message types. */
export const WS_CLIENT_MESSAGE_TYPES = {
  SUBSCRIBE: 'subscribe',
  UNSUBSCRIBE: 'unsubscribe',
} as const;

/** Possible WebSocket connection statuses (mirrors ReportState['connectionStatus']). */
export const CONNECTION_STATUSES = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  OPEN: 'open',
  CLOSED: 'closed',
  ERROR: 'error',
} as const satisfies Record<string, ReportState['connectionStatus']>;

export type ConnectionStatus = ReportState['connectionStatus'];

/** Report display modes for REST reports. */
export const REPORT_MODES = {
  LIVE: 'live',
  EOD: 'eod',
} as const satisfies Record<string, ReportMode>;

/**
 * Sentinel value used by the EOD selector to represent the "Current" (latest
 * REST snapshot) option, as opposed to a concrete 'YYYY-MM-DD' EOD date.
 */
export const EOD_CURRENT = 'CURRENT';

/** Human-readable label for the EOD "Current" option. */
export const EOD_CURRENT_LABEL = 'Current';

/** Maximum number of automatic WebSocket reconnect attempts. */
export const WS_MAX_RECONNECT_ATTEMPTS = 5;

/** Base delay (ms) for exponential reconnect backoff: base * 2^attempt. */
export const WS_RECONNECT_BASE_DELAY_MS = 500;

/** Field stamped onto rows changed by a tick; drives the cell flash animation. */
export const LAST_TICK_FIELD = '_lastTick';
