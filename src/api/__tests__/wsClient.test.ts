import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WsClient, type WebSocketLike } from '../wsClient';
import { WS_URL } from '../../constants/reportConstants';
import type { ColumnDef, ReportRow } from '../../types';

/** Controllable fake WebSocket for driving the client from tests. */
class FakeSocket implements WebSocketLike {
  sent: string[] = [];

  closed = false;

  onopen: ((event?: unknown) => void) | null = null;

  onclose: ((event?: unknown) => void) | null = null;

  onerror: ((event?: unknown) => void) | null = null;

  onmessage: ((event: { data: unknown }) => void) | null = null;

  constructor(public url: string) {}

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.closed = true;
    // Real sockets fire onclose after close(); the client detaches handlers
    // first on intentional disconnect, so this only matters for server drops.
    this.onclose?.();
  }

  // --- test drivers ---
  serverOpen(): void {
    this.onopen?.();
  }

  serverMessage(data: unknown): void {
    this.onmessage?.({ data });
  }

  serverDrop(): void {
    this.onclose?.();
  }

  serverError(): void {
    this.onerror?.();
  }

  sentJson(): Array<Record<string, unknown>> {
    return this.sent.map((raw) => JSON.parse(raw));
  }
}

const columns: ColumnDef[] = [{ key: 'price', label: 'Price', type: 'price' }];
const rows: ReportRow[] = [{ id: 'r1', price: 100 }];

const snapshotMsg = {
  type: 'snapshot',
  reportId: 'fx-spot',
  columns,
  rows,
  asOf: '2026-08-06T10:00:00Z',
};

const tickMsg = {
  type: 'tick',
  reportId: 'fx-spot',
  updates: [{ id: 'r1', changes: { price: 101 } }],
  asOf: '2026-08-06T10:00:01Z',
};

describe('WsClient', () => {
  let sockets: FakeSocket[];
  let factory: (url: string) => WebSocketLike;
  let statusChanges: string[];

  const latest = () => sockets[sockets.length - 1];

  const makeClient = (options: ConstructorParameters<typeof WsClient>[0] = {}) =>
    new WsClient({
      createWebSocket: factory,
      onStatusChange: (status) => statusChanges.push(status),
      ...options,
    });

  beforeEach(() => {
    vi.useFakeTimers();
    sockets = [];
    statusChanges = [];
    factory = vi.fn((url: string) => {
      const socket = new FakeSocket(url);
      sockets.push(socket);
      return socket;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('connect / disconnect', () => {
    it('starts idle and connects to the contract URL by default', () => {
      const client = makeClient();
      expect(client.getStatus()).toBe('idle');
      client.connect();
      expect(factory).toHaveBeenCalledWith(WS_URL);
      expect(client.getStatus()).toBe('connecting');
      expect(statusChanges).toEqual(['connecting']);
    });

    it('honors a custom url', () => {
      const client = makeClient({ url: 'ws://example:9999' });
      client.connect();
      expect(latest().url).toBe('ws://example:9999');
    });

    it('transitions to open when the socket opens', () => {
      const client = makeClient();
      client.connect();
      latest().serverOpen();
      expect(client.getStatus()).toBe('open');
      expect(statusChanges).toEqual(['connecting', 'open']);
    });

    it('connect is a no-op while connecting or open', () => {
      const client = makeClient();
      client.connect();
      client.connect();
      latest().serverOpen();
      client.connect();
      expect(sockets).toHaveLength(1);
    });

    it('disconnect closes the socket, sets closed, and does not reconnect', () => {
      const client = makeClient();
      client.connect();
      latest().serverOpen();
      client.disconnect();
      expect(latest().closed).toBe(true);
      expect(client.getStatus()).toBe('closed');
      vi.advanceTimersByTime(60_000);
      expect(sockets).toHaveLength(1);
    });
  });

  describe('subscribe / unsubscribe', () => {
    it('sends a subscribe message immediately when open', () => {
      const client = makeClient();
      client.connect();
      latest().serverOpen();
      client.subscribe('fx-spot', {});
      expect(latest().sentJson()).toEqual([
        { type: 'subscribe', reportId: 'fx-spot' },
      ]);
    });

    it('defers the subscribe message until the socket opens', () => {
      const client = makeClient();
      client.subscribe('fx-spot', {});
      client.connect();
      expect(latest().sent).toEqual([]);
      latest().serverOpen();
      expect(latest().sentJson()).toEqual([
        { type: 'subscribe', reportId: 'fx-spot' },
      ]);
    });

    it('routes snapshot messages to the matching subscription', () => {
      const onSnapshot = vi.fn();
      const client = makeClient();
      client.connect();
      latest().serverOpen();
      client.subscribe('fx-spot', { onSnapshot });
      latest().serverMessage(JSON.stringify(snapshotMsg));
      expect(onSnapshot).toHaveBeenCalledTimes(1);
      expect(onSnapshot).toHaveBeenCalledWith(snapshotMsg);
    });

    it('routes tick messages to the matching subscription', () => {
      const onTick = vi.fn();
      const client = makeClient();
      client.connect();
      latest().serverOpen();
      client.subscribe('fx-spot', { onTick });
      latest().serverMessage(JSON.stringify(tickMsg));
      expect(onTick).toHaveBeenCalledWith(tickMsg);
    });

    it('does not route messages for other report ids', () => {
      const onSnapshot = vi.fn();
      const onTick = vi.fn();
      const client = makeClient();
      client.connect();
      latest().serverOpen();
      client.subscribe('rates-govt', { onSnapshot, onTick });
      latest().serverMessage(JSON.stringify(snapshotMsg));
      latest().serverMessage(JSON.stringify(tickMsg));
      expect(onSnapshot).not.toHaveBeenCalled();
      expect(onTick).not.toHaveBeenCalled();
    });

    it('supports multiple concurrent subscriptions on one socket', () => {
      const fxTick = vi.fn();
      const ratesTick = vi.fn();
      const client = makeClient();
      client.connect();
      latest().serverOpen();
      client.subscribe('fx-spot', { onTick: fxTick });
      client.subscribe('rates-govt', { onTick: ratesTick });
      latest().serverMessage(JSON.stringify(tickMsg));
      latest().serverMessage(
        JSON.stringify({ ...tickMsg, reportId: 'rates-govt' })
      );
      expect(fxTick).toHaveBeenCalledTimes(1);
      expect(ratesTick).toHaveBeenCalledTimes(1);
    });

    it('fans server error messages out to all subscriptions', () => {
      const errA = vi.fn();
      const errB = vi.fn();
      const client = makeClient();
      client.connect();
      latest().serverOpen();
      client.subscribe('fx-spot', { onError: errA });
      client.subscribe('rates-govt', { onError: errB });
      latest().serverMessage(JSON.stringify({ type: 'error', message: 'bad sub' }));
      expect(errA).toHaveBeenCalledWith('bad sub');
      expect(errB).toHaveBeenCalledWith('bad sub');
    });

    it('unsubscribe sends the unsubscribe message and stops routing', () => {
      const onTick = vi.fn();
      const client = makeClient();
      client.connect();
      latest().serverOpen();
      client.subscribe('fx-spot', { onTick });
      client.unsubscribe('fx-spot');
      expect(latest().sentJson()).toEqual([
        { type: 'subscribe', reportId: 'fx-spot' },
        { type: 'unsubscribe', reportId: 'fx-spot' },
      ]);
      latest().serverMessage(JSON.stringify(tickMsg));
      expect(onTick).not.toHaveBeenCalled();
    });

    it('unsubscribe for an unknown id sends nothing', () => {
      const client = makeClient();
      client.connect();
      latest().serverOpen();
      client.unsubscribe('never-subscribed');
      expect(latest().sent).toEqual([]);
    });
  });

  describe('malformed messages', () => {
    it('ignores non-JSON payloads without throwing', () => {
      const onSnapshot = vi.fn();
      const client = makeClient();
      client.connect();
      latest().serverOpen();
      client.subscribe('fx-spot', { onSnapshot });
      expect(() => latest().serverMessage('{not json')).not.toThrow();
      expect(() => latest().serverMessage('null')).not.toThrow();
      expect(() => latest().serverMessage('42')).not.toThrow();
      expect(onSnapshot).not.toHaveBeenCalled();
    });

    it('ignores JSON with an unknown message type', () => {
      const onSnapshot = vi.fn();
      const onTick = vi.fn();
      const client = makeClient();
      client.connect();
      latest().serverOpen();
      client.subscribe('fx-spot', { onSnapshot, onTick });
      latest().serverMessage(JSON.stringify({ type: 'mystery', reportId: 'fx-spot' }));
      expect(onSnapshot).not.toHaveBeenCalled();
      expect(onTick).not.toHaveBeenCalled();
    });
  });

  describe('reconnect with backoff', () => {
    it('reconnects after an unintentional drop with exponential backoff', () => {
      const client = makeClient({ reconnectBaseDelayMs: 500 });
      client.connect();
      latest().serverOpen();
      latest().serverDrop();
      expect(client.getStatus()).toBe('closed');
      expect(sockets).toHaveLength(1);

      // First retry after base * 2^0 = 500ms.
      vi.advanceTimersByTime(499);
      expect(sockets).toHaveLength(1);
      vi.advanceTimersByTime(1);
      expect(sockets).toHaveLength(2);

      // Second retry after base * 2^1 = 1000ms.
      latest().serverDrop();
      vi.advanceTimersByTime(999);
      expect(sockets).toHaveLength(2);
      vi.advanceTimersByTime(1);
      expect(sockets).toHaveLength(3);
    });

    it('resubscribes all active reports after reconnecting', () => {
      const client = makeClient();
      client.connect();
      latest().serverOpen();
      client.subscribe('fx-spot', {});
      client.subscribe('rates-govt', {});
      latest().serverDrop();
      vi.advanceTimersByTime(500);
      latest().serverOpen();
      expect(latest().sentJson()).toEqual([
        { type: 'subscribe', reportId: 'fx-spot' },
        { type: 'subscribe', reportId: 'rates-govt' },
      ]);
    });

    it('keeps routing messages to handlers after reconnect', () => {
      const onTick = vi.fn();
      const client = makeClient();
      client.connect();
      latest().serverOpen();
      client.subscribe('fx-spot', { onTick });
      latest().serverDrop();
      vi.advanceTimersByTime(500);
      latest().serverOpen();
      latest().serverMessage(JSON.stringify(tickMsg));
      expect(onTick).toHaveBeenCalledTimes(1);
    });

    it('resets the attempt counter after a successful reconnect', () => {
      const client = makeClient({ reconnectBaseDelayMs: 500 });
      client.connect();
      latest().serverOpen();
      latest().serverDrop();
      vi.advanceTimersByTime(500);
      latest().serverOpen(); // successful reconnect resets attempts
      latest().serverDrop();
      // Next retry should be back at the base delay (500ms), not 1000ms.
      vi.advanceTimersByTime(500);
      expect(sockets).toHaveLength(3);
    });

    it('gives up after the maximum number of attempts and reports error', () => {
      const client = makeClient({
        reconnectBaseDelayMs: 1,
        maxReconnectAttempts: 5,
      });
      client.connect();
      latest().serverOpen();
      latest().serverDrop();
      for (let i = 0; i < 10; i += 1) {
        vi.advanceTimersByTime(100_000);
        // Fail every attempted reconnect while still connecting.
        if (client.getStatus() === 'connecting') {
          latest().serverDrop();
        }
      }
      // 1 original + 5 reconnect attempts, then no more.
      expect(sockets).toHaveLength(6);
      expect(client.getStatus()).toBe('error');
      vi.advanceTimersByTime(100_000);
      expect(sockets).toHaveLength(6);
    });

    it('does not reconnect after an intentional disconnect during backoff', () => {
      const client = makeClient();
      client.connect();
      latest().serverOpen();
      latest().serverDrop(); // schedules reconnect
      client.disconnect(); // cancels it
      vi.advanceTimersByTime(60_000);
      expect(sockets).toHaveLength(1);
    });
  });

  describe('status callback', () => {
    it('reports error status on socket error events', () => {
      const client = makeClient();
      client.connect();
      latest().serverOpen();
      latest().serverError();
      expect(client.getStatus()).toBe('error');
      expect(statusChanges).toEqual(['connecting', 'open', 'error']);
    });

    it('does not repeat a status that has not changed', () => {
      const client = makeClient();
      client.connect();
      client.connect();
      expect(statusChanges).toEqual(['connecting']);
    });

    it('emits the full lifecycle across drop and reconnect', () => {
      const client = makeClient();
      client.connect();
      latest().serverOpen();
      latest().serverDrop();
      vi.advanceTimersByTime(500);
      latest().serverOpen();
      expect(statusChanges).toEqual([
        'connecting',
        'open',
        'closed',
        'connecting',
        'open',
      ]);
    });
  });
});
