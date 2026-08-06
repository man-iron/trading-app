import type { WsServerMessage } from '../types';
import {
  CONNECTION_STATUSES,
  WS_CLIENT_MESSAGE_TYPES,
  WS_MAX_RECONNECT_ATTEMPTS,
  WS_RECONNECT_BASE_DELAY_MS,
  WS_SERVER_MESSAGE_TYPES,
  WS_URL,
  type ConnectionStatus,
} from '../constants/reportConstants';

/**
 * Minimal WebSocket surface the client depends on. Matches the browser
 * `WebSocket` API subset used here, so real sockets satisfy it directly and
 * tests can supply lightweight fakes.
 */
export interface WebSocketLike {
  send(data: string): void;
  close(): void;
  onopen: ((event?: unknown) => void) | null;
  onclose: ((event?: unknown) => void) | null;
  onerror: ((event?: unknown) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
}

/** Factory producing a socket for a URL; injectable for tests. */
export type WebSocketFactory = (url: string) => WebSocketLike;

/** Per-subscription callbacks invoked as server messages arrive. */
export interface SubscriptionHandlers {
  onSnapshot?: (message: Extract<WsServerMessage, { type: 'snapshot' }>) => void;
  onTick?: (message: Extract<WsServerMessage, { type: 'tick' }>) => void;
  onError?: (message: string) => void;
}

export interface WsClientOptions {
  /** WebSocket endpoint. Defaults to the contract WS_URL. */
  url?: string;
  /** Socket factory. Defaults to `new WebSocket(url)`. */
  createWebSocket?: WebSocketFactory;
  /** Invoked whenever the connection status changes. */
  onStatusChange?: (status: ConnectionStatus) => void;
  /** Maximum automatic reconnect attempts (default 5 per contract). */
  maxReconnectAttempts?: number;
  /** Base delay in ms for exponential backoff (delay = base * 2^attempt). */
  reconnectBaseDelayMs?: number;
}

const defaultFactory: WebSocketFactory = (url) =>
  new WebSocket(url) as unknown as WebSocketLike;

/**
 * Wraps a WebSocket connection to the tick server. Supports multiple
 * concurrent report subscriptions, guards against malformed JSON, reports
 * status changes, and automatically reconnects with exponential backoff
 * (up to `maxReconnectAttempts`), resubscribing all active reports after a
 * successful reconnect.
 */
export class WsClient {
  private readonly url: string;

  private readonly createWebSocket: WebSocketFactory;

  private readonly onStatusChange?: (status: ConnectionStatus) => void;

  private readonly maxReconnectAttempts: number;

  private readonly reconnectBaseDelayMs: number;

  private socket: WebSocketLike | null = null;

  private status: ConnectionStatus = CONNECTION_STATUSES.IDLE;

  private subscriptions = new Map<string, SubscriptionHandlers>();

  private reconnectAttempts = 0;

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private intentionallyClosed = false;

  constructor(options: WsClientOptions = {}) {
    this.url = options.url ?? WS_URL;
    this.createWebSocket = options.createWebSocket ?? defaultFactory;
    this.onStatusChange = options.onStatusChange;
    this.maxReconnectAttempts =
      options.maxReconnectAttempts ?? WS_MAX_RECONNECT_ATTEMPTS;
    this.reconnectBaseDelayMs =
      options.reconnectBaseDelayMs ?? WS_RECONNECT_BASE_DELAY_MS;
  }

  /** Current connection status. */
  getStatus(): ConnectionStatus {
    return this.status;
  }

  /** Opens the socket. No-op if already connecting or open. */
  connect(): void {
    if (
      this.status === CONNECTION_STATUSES.CONNECTING ||
      this.status === CONNECTION_STATUSES.OPEN
    ) {
      return;
    }
    this.intentionallyClosed = false;
    this.openSocket();
  }

  /** Closes the socket and cancels any pending reconnect. */
  disconnect(): void {
    this.intentionallyClosed = true;
    this.clearReconnectTimer();
    this.reconnectAttempts = 0;
    if (this.socket) {
      const socket = this.socket;
      this.detachSocket(socket);
      this.socket = null;
      socket.close();
    }
    this.setStatus(CONNECTION_STATUSES.CLOSED);
  }

  /**
   * Registers handlers for a report and sends a subscribe message if the
   * socket is open. If the socket is not yet open, the subscribe message is
   * sent automatically once the connection opens (see resubscribeAll).
   */
  subscribe(reportId: string, handlers: SubscriptionHandlers): void {
    this.subscriptions.set(reportId, handlers);
    if (this.status === CONNECTION_STATUSES.OPEN) {
      this.send({ type: WS_CLIENT_MESSAGE_TYPES.SUBSCRIBE, reportId });
    }
  }

  /** Removes a report's handlers and notifies the server if connected. */
  unsubscribe(reportId: string): void {
    if (!this.subscriptions.delete(reportId)) {
      return;
    }
    if (this.status === CONNECTION_STATUSES.OPEN) {
      this.send({ type: WS_CLIENT_MESSAGE_TYPES.UNSUBSCRIBE, reportId });
    }
  }

  private openSocket(): void {
    this.setStatus(CONNECTION_STATUSES.CONNECTING);
    const socket = this.createWebSocket(this.url);
    this.socket = socket;

    socket.onopen = () => {
      if (this.socket !== socket) return;
      this.reconnectAttempts = 0;
      this.setStatus(CONNECTION_STATUSES.OPEN);
      this.resubscribeAll();
    };

    socket.onmessage = (event) => {
      if (this.socket !== socket) return;
      this.handleMessage(event.data);
    };

    socket.onerror = () => {
      if (this.socket !== socket) return;
      this.setStatus(CONNECTION_STATUSES.ERROR);
    };

    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.detachSocket(socket);
      this.socket = null;
      this.setStatus(CONNECTION_STATUSES.CLOSED);
      if (!this.intentionallyClosed) {
        this.scheduleReconnect();
      }
    };
  }

  private resubscribeAll(): void {
    for (const reportId of this.subscriptions.keys()) {
      this.send({ type: WS_CLIENT_MESSAGE_TYPES.SUBSCRIBE, reportId });
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setStatus(CONNECTION_STATUSES.ERROR);
      return;
    }
    const delay = this.reconnectBaseDelayMs * 2 ** this.reconnectAttempts;
    this.reconnectAttempts += 1;
    this.clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.intentionallyClosed) {
        this.openSocket();
      }
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private detachSocket(socket: WebSocketLike): void {
    socket.onopen = null;
    socket.onclose = null;
    socket.onerror = null;
    socket.onmessage = null;
  }

  private send(message: { type: string; reportId: string }): void {
    this.socket?.send(JSON.stringify(message));
  }

  private handleMessage(data: unknown): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(String(data));
    } catch {
      // Malformed JSON from the server — ignore rather than crash the app.
      return;
    }
    if (parsed === null || typeof parsed !== 'object') {
      return;
    }
    const message = parsed as WsServerMessage;

    switch (message.type) {
      case WS_SERVER_MESSAGE_TYPES.SNAPSHOT: {
        this.subscriptions.get(message.reportId)?.onSnapshot?.(message);
        break;
      }
      case WS_SERVER_MESSAGE_TYPES.TICK: {
        this.subscriptions.get(message.reportId)?.onTick?.(message);
        break;
      }
      case WS_SERVER_MESSAGE_TYPES.ERROR: {
        // Server errors carry no reportId — fan out to every subscriber.
        for (const handlers of this.subscriptions.values()) {
          handlers.onError?.(message.message);
        }
        break;
      }
      default:
        // Unknown message type — ignore.
        break;
    }
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status === status) {
      return;
    }
    this.status = status;
    this.onStatusChange?.(status);
  }
}

export default WsClient;
