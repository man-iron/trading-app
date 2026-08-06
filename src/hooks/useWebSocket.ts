/**
 * `useWebSocket` — manages the WebSocket subscription lifecycle for one live
 * report, plus client-side pause buffering (per the architecture contract,
 * pause/play never touches the wire: ticks keep arriving and are buffered).
 *
 * Behavior:
 * - On mount / `reportId` change: ensures the shared `WsClient` is connected,
 *   subscribes to the report, and dispatches `connectionStatusChanged` with
 *   the current status (and again on every subsequent status change).
 * - On `snapshot`: dispatches `snapshotReceived` (and clears any stale
 *   buffer).
 * - On `tick`: when playing, dispatches `ticksApplied`; when paused, merges
 *   the changes into a ref-held buffer keyed by row id (shallow merge,
 *   latest change per field wins). Pause state is read through a ref so
 *   toggling pause never re-subscribes.
 * - On unpause: flushes the whole buffer as ONE `ticksApplied` dispatch.
 * - On unmount / `reportId` change: unsubscribes and drops the buffer.
 * - On server `error`: dispatches `loadFailed` so the container can surface
 *   an Alert.
 *
 * A single module-level `WsClient` instance is shared by every live report
 * (multiple concurrent subscriptions per socket are supported by the
 * protocol). Tests inject a fake client via the optional third parameter.
 */
import { useEffect, useRef } from 'react';

import WsClient, { type SubscriptionHandlers } from '../api/wsClient';
import { useAppDispatch } from '../store';
import {
  connectionStatusChanged,
  loadFailed,
  snapshotReceived,
  ticksApplied,
} from '../store/reports/reportsSlice';
import type { ConnectionStatus } from '../constants/reportConstants';
import type { WsTickUpdate } from '../types';

/** Listener invoked whenever the shared connection's status changes. */
export type StatusListener = (status: ConnectionStatus) => void;

/**
 * The client surface `useWebSocket` depends on. The shared adapter around
 * the real `WsClient` satisfies it; tests supply lightweight fakes.
 */
export interface LiveWsClient {
  /** Opens the underlying socket (no-op if already connecting/open). */
  connect(): void;
  /** Registers handlers for a report and subscribes over the wire. */
  subscribe(reportId: string, handlers: SubscriptionHandlers): void;
  /** Removes a report's handlers and unsubscribes over the wire. */
  unsubscribe(reportId: string): void;
  /** Current connection status. */
  getStatus(): ConnectionStatus;
  /**
   * Registers a status listener shared across all subscribers; returns an
   * unregister function.
   */
  addStatusListener(listener: StatusListener): () => void;
}

/** Buffered, per-row-merged tick changes accumulated while paused. */
interface TickBuffer {
  /** Latest merged changes per row id (shallow merge, latest wins). */
  changesById: Map<string, Record<string, string | number>>;
  /** `asOf` of the most recent buffered tick. */
  asOf: string;
}

let sharedClient: LiveWsClient | null = null;

/**
 * Lazily creates the module-level shared `WsClient` (one socket for the whole
 * app), wrapped in a thin adapter that fans connection-status changes out to
 * any number of listeners (the raw `WsClient` only accepts a single
 * `onStatusChange` callback at construction time).
 */
export function getSharedLiveWsClient(): LiveWsClient {
  if (sharedClient) {
    return sharedClient;
  }
  const listeners = new Set<StatusListener>();
  const client = new WsClient({
    onStatusChange: (status) => {
      listeners.forEach((listener) => listener(status));
    },
  });
  sharedClient = {
    connect: () => client.connect(),
    subscribe: (reportId, handlers) => client.subscribe(reportId, handlers),
    unsubscribe: (reportId) => client.unsubscribe(reportId),
    getStatus: () => client.getStatus(),
    addStatusListener: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
  return sharedClient;
}

/**
 * Subscribe a live report to the shared WebSocket for the lifetime of the
 * calling component.
 *
 * @param reportId report to subscribe to; changing it re-subscribes
 * @param paused   client-side pause flag (from `ReportState.paused`);
 *                 toggling never re-subscribes — ticks are buffered while
 *                 `true` and flushed as a single `ticksApplied` on resume
 * @param client   injectable client for tests; defaults to the shared
 *                 module-level `WsClient` instance
 */
export function useWebSocket(
  reportId: string,
  paused: boolean,
  client: LiveWsClient = getSharedLiveWsClient()
): void {
  const dispatch = useAppDispatch();
  const pausedRef = useRef(paused);
  const bufferRef = useRef<TickBuffer | null>(null);

  // Keep the pause flag in a ref so the subscription effect below never has
  // to re-run (and re-subscribe) on pause toggles; flush the buffer as one
  // ticksApplied when transitioning paused -> playing.
  useEffect(() => {
    pausedRef.current = paused;
    if (!paused && bufferRef.current && bufferRef.current.changesById.size > 0) {
      const { changesById, asOf } = bufferRef.current;
      bufferRef.current = null;
      const updates: WsTickUpdate[] = Array.from(
        changesById,
        ([id, changes]) => ({ id, changes })
      );
      dispatch(ticksApplied({ reportId, updates, asOf }));
    }
  }, [paused, reportId, dispatch]);

  // Subscription lifecycle: mount / reportId (or injected client) change.
  useEffect(() => {
    bufferRef.current = null;
    client.connect();
    dispatch(connectionStatusChanged({ reportId, status: client.getStatus() }));

    const removeStatusListener = client.addStatusListener((status) => {
      dispatch(connectionStatusChanged({ reportId, status }));
    });

    client.subscribe(reportId, {
      onSnapshot: (message) => {
        // A fresh snapshot supersedes anything buffered.
        bufferRef.current = null;
        dispatch(
          snapshotReceived({
            reportId,
            columns: message.columns,
            rows: message.rows,
            asOf: message.asOf,
          })
        );
      },
      onTick: (message) => {
        if (pausedRef.current) {
          const buffer: TickBuffer = bufferRef.current ?? {
            changesById: new Map(),
            asOf: message.asOf,
          };
          for (const update of message.updates) {
            buffer.changesById.set(update.id, {
              ...buffer.changesById.get(update.id),
              ...update.changes,
            });
          }
          buffer.asOf = message.asOf;
          bufferRef.current = buffer;
          return;
        }
        dispatch(
          ticksApplied({
            reportId,
            updates: message.updates,
            asOf: message.asOf,
          })
        );
      },
      onError: (message) => {
        dispatch(loadFailed({ reportId, error: message }));
      },
    });

    return () => {
      removeStatusListener();
      client.unsubscribe(reportId);
      bufferRef.current = null;
    };
  }, [reportId, client, dispatch]);
}

export default useWebSocket;
