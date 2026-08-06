/**
 * servers/ws-server.js
 *
 * Mock WebSocket backend for the Retro Trading Terminal. `ws` on port 4001.
 * Protocol (per docs/ARCHITECTURE.md):
 *
 *   Client -> server: { type: 'subscribe',   reportId }
 *                     { type: 'unsubscribe', reportId }
 *   Server -> client: { type: 'snapshot', reportId, columns, rows, asOf }
 *                     { type: 'tick',     reportId, updates: [{id, changes}], asOf }
 *                     { type: 'error',    message }
 *
 * On subscribe the server immediately sends a snapshot, then tick messages
 * every 800-1500ms containing 1-5 random row updates produced by driftRow.
 * Unsubscribe stops ticks for that report only; multiple concurrent
 * subscriptions per socket are supported. All timers are cleaned up on close.
 *
 * Run: node servers/ws-server.js
 */

import { WebSocketServer, WebSocket } from 'ws';
import { getReport, driftRow } from './data/mockData.js';

const PORT = 4001;
const TICK_MIN_MS = 800;
const TICK_MAX_MS = 1500;
const MAX_ROWS_PER_TICK = 5;

const wss = new WebSocketServer({ port: PORT });
let nextClientId = 1;

/** Random integer in [min, max] inclusive. */
const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

/**
 * Pick `count` distinct random indices from [0, size).
 * @param {number} size
 * @param {number} count
 * @returns {number[]}
 */
function sampleIndices(size, count) {
  const indices = Array.from({ length: size }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, count);
}

/** Safe JSON send (skips sockets that are no longer open). */
function send(socket, message) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

wss.on('connection', (socket) => {
  const clientId = nextClientId++;
  /**
   * Per-socket subscription state.
   * @type {Map<string, { rows: Array<Record<string, string|number>>, timer: NodeJS.Timeout|null }>}
   */
  const subscriptions = new Map();

  console.log(`[ws] client#${clientId} connected (${wss.clients.size} online)`);

  /** Schedule the next tick for a subscription at a random 800-1500ms delay. */
  function scheduleTick(reportId) {
    const sub = subscriptions.get(reportId);
    if (!sub) return;
    sub.timer = setTimeout(() => {
      const current = subscriptions.get(reportId);
      if (!current || socket.readyState !== WebSocket.OPEN) return;

      const count = Math.min(current.rows.length, randInt(1, MAX_ROWS_PER_TICK));
      const updates = [];
      for (const index of sampleIndices(current.rows.length, count)) {
        const before = current.rows[index];
        const after = driftRow(before);
        const changes = {};
        for (const key of Object.keys(after)) {
          if (after[key] !== before[key]) changes[key] = after[key];
        }
        current.rows[index] = after;
        if (Object.keys(changes).length > 0) {
          updates.push({ id: before.id, changes });
        }
      }
      if (updates.length > 0) {
        send(socket, {
          type: 'tick',
          reportId,
          updates,
          asOf: new Date().toISOString(),
        });
      }
      scheduleTick(reportId);
    }, randInt(TICK_MIN_MS, TICK_MAX_MS));
  }

  /** Stop ticking and drop state for one report subscription. */
  function teardown(reportId) {
    const sub = subscriptions.get(reportId);
    if (!sub) return false;
    if (sub.timer) clearTimeout(sub.timer);
    subscriptions.delete(reportId);
    return true;
  }

  socket.on('message', (raw) => {
    let message;
    try {
      message = JSON.parse(raw.toString());
    } catch {
      send(socket, { type: 'error', message: 'Malformed JSON message' });
      return;
    }

    const { type, reportId } = message ?? {};

    if (type === 'subscribe') {
      const report = getReport(reportId);
      if (!report) {
        send(socket, { type: 'error', message: `Unknown report: ${reportId}` });
        return;
      }
      // Re-subscribing resets the stream: tear down, fresh snapshot, new ticks.
      teardown(reportId);
      const rows = report.rows.map((row) => ({ ...row }));
      subscriptions.set(reportId, { rows, timer: null });
      send(socket, {
        type: 'snapshot',
        reportId,
        columns: report.columns,
        rows,
        asOf: new Date().toISOString(),
      });
      scheduleTick(reportId);
      console.log(
        `[ws] client#${clientId} subscribed ${reportId} (${subscriptions.size} active)`,
      );
      return;
    }

    if (type === 'unsubscribe') {
      const existed = teardown(reportId);
      console.log(
        `[ws] client#${clientId} unsubscribed ${reportId}${existed ? '' : ' (was not subscribed)'} (${subscriptions.size} active)`,
      );
      return;
    }

    send(socket, { type: 'error', message: `Unsupported message type: ${String(type)}` });
  });

  socket.on('close', () => {
    for (const reportId of [...subscriptions.keys()]) {
      teardown(reportId);
    }
    console.log(`[ws] client#${clientId} disconnected (${wss.clients.size} online)`);
  });

  socket.on('error', (err) => {
    console.log(`[ws] client#${clientId} socket error: ${err.message}`);
  });
});

console.log(`[ws] mock WS server listening on ws://localhost:${PORT}`);
