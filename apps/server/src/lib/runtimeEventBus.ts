/**
 * Runtime Event Bus
 *
 * Manages events from runtime workflows with per-runId queuing,
 * account-based filtering, and support for late-connecting clients.
 */

import type { RuntimeEvent } from "@aiml/runtime";

interface EventQueueConfig {
  /** Maximum number of events to store per runId */
  maxEvents: number;
  /** Time-to-live for events in milliseconds */
  ttlMs: number;
}

interface StoredEvent {
  event: RuntimeEvent;
  expiresAt: number;
}

interface EventQueue {
  events: StoredEvent[];
  lastSequenceNumber: number;
}

interface WebSocketConnection {
  ws: any; // WebSocket instance
  accountId: string;
  runId: string;
  lastReceivedSequenceNumber: number;
}

/**
 * Runtime Event Bus for managing workflow events
 */
export class RuntimeEventBus {
  private eventQueues: Map<string, EventQueue> = new Map();
  private connections: Map<string, WebSocketConnection> = new Map();
  private config: EventQueueConfig;
  private cleanupInterval: NodeJS.Timeout;
  private connectionCounter: number = 0;

  constructor(config: Partial<EventQueueConfig> = {}) {
    this.config = {
      maxEvents: config.maxEvents ?? 1000,
      ttlMs: config.ttlMs ?? 24 * 60 * 60 * 1000, // 24 hours default
    };

    // Start cleanup interval to remove expired events
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEvents();
    }, 60 * 1000); // Cleanup every minute
  }

  /**
   * Subscribe to workflow events for a specific runId
   */
  public subscribeToWorkflow(
    runId: string,
    accountId: string,
    ws: any,
    lastReceivedSequenceNumber: number = 0
  ): string {
    const connectionId = `${accountId}_${runId}_${Date.now()}_${++this
      .connectionCounter}`;

    this.connections.set(connectionId, {
      ws,
      accountId,
      runId,
      lastReceivedSequenceNumber,
    });

    // Send historical events if any exist and client requests them
    if (lastReceivedSequenceNumber >= 0) {
      const historicalEvents = this.getHistoricalEvents(
        runId,
        accountId,
        lastReceivedSequenceNumber
      );
      for (const event of historicalEvents) {
        this.sendEventToConnection(connectionId, event);
      }
    }

    return connectionId;
  }

  /**
   * Subscribe to all events for an account (general events stream)
   */
  public subscribeToAllEvents(
    accountId: string,
    ws: any,
    lastReceivedSequenceNumber: number = 0
  ): string {
    const connectionId = `all_${accountId}_${Date.now()}_${++this
      .connectionCounter}`;

    this.connections.set(connectionId, {
      ws,
      accountId,
      runId: "*", // Special marker for all events
      lastReceivedSequenceNumber,
    });

    return connectionId;
  }

  /**
   * Unsubscribe a connection
   */
  public unsubscribe(connectionId: string): void {
    this.connections.delete(connectionId);
  }

  /**
   * Get historical events for a runId after a specific sequence number
   */
  public getHistoricalEvents(
    runId: string,
    accountId: string,
    afterSequenceNumber: number = 0
  ): RuntimeEvent[] {
    const queueKey = this.getQueueKey(runId, accountId);
    const queue = this.eventQueues.get(queueKey);

    if (!queue) {
      return [];
    }

    const now = Date.now();
    return queue.events
      .filter(
        (storedEvent) =>
          storedEvent.expiresAt > now &&
          storedEvent.event.sequenceNumber > afterSequenceNumber
      )
      .map((storedEvent) => storedEvent.event)
      .sort((a, b) => a.sequenceNumber - b.sequenceNumber);
  }

  /**
   * Broadcast an event to all relevant subscribers
   */
  public broadcastEvent(event: RuntimeEvent): void {
    const queueKey = this.getQueueKey(event.runId, event.accountId);

    // Store the event in the queue
    this.storeEvent(queueKey, event);

    // Send to all active connections for this runId and accountId
    for (const [connectionId, connection] of this.connections.entries()) {
      if (
        connection.accountId === event.accountId &&
        (connection.runId === event.runId || connection.runId === "*")
      ) {
        this.sendEventToConnection(connectionId, event);
        // Update the last received sequence number
        connection.lastReceivedSequenceNumber = Math.max(
          connection.lastReceivedSequenceNumber,
          event.sequenceNumber
        );
      }
    }
  }

  /**
   * Get queue statistics for monitoring
   */
  public getQueueStats(): {
    totalQueues: number;
    totalEvents: number;
    activeConnections: number;
    queueDetails: Array<{
      queueKey: string;
      eventCount: number;
      lastSequenceNumber: number;
    }>;
  } {
    const queueDetails = Array.from(this.eventQueues.entries()).map(
      ([key, queue]) => ({
        queueKey: key,
        eventCount: queue.events.length,
        lastSequenceNumber: queue.lastSequenceNumber,
      })
    );

    return {
      totalQueues: this.eventQueues.size,
      totalEvents: Array.from(this.eventQueues.values()).reduce(
        (sum, queue) => sum + queue.events.length,
        0
      ),
      activeConnections: this.connections.size,
      queueDetails,
    };
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    clearInterval(this.cleanupInterval);
    this.eventQueues.clear();
    this.connections.clear();
  }

  /**
   * Generate queue key for runId and accountId combination
   */
  private getQueueKey(runId: string, accountId: string): string {
    return `${accountId}:${runId}`;
  }

  /**
   * Store an event in the appropriate queue
   */
  private storeEvent(queueKey: string, event: RuntimeEvent): void {
    let queue = this.eventQueues.get(queueKey);

    if (!queue) {
      queue = {
        events: [],
        lastSequenceNumber: 0,
      };
      this.eventQueues.set(queueKey, queue);
    }

    const storedEvent: StoredEvent = {
      event,
      expiresAt: Date.now() + this.config.ttlMs,
    };

    queue.events.push(storedEvent);
    queue.lastSequenceNumber = Math.max(
      queue.lastSequenceNumber,
      event.sequenceNumber
    );

    // Enforce max events limit
    if (queue.events.length > this.config.maxEvents) {
      queue.events = queue.events
        .sort((a, b) => a.event.sequenceNumber - b.event.sequenceNumber)
        .slice(-this.config.maxEvents);
    }
  }

  /**
   * Send an event to a specific connection
   */
  private sendEventToConnection(
    connectionId: string,
    event: RuntimeEvent
  ): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    try {
      const message = JSON.stringify({
        type: "runtime_event",
        data: event,
      });

      if (connection.ws.readyState === 1) {
        // WebSocket.OPEN
        connection.ws.send(message);
      } else {
        // Connection is not open, remove it
        this.connections.delete(connectionId);
      }
    } catch (error) {
      console.error(
        `Error sending event to connection ${connectionId}:`,
        error
      );
      this.connections.delete(connectionId);
    }
  }

  /**
   * Clean up expired events from all queues
   */
  private cleanupExpiredEvents(): void {
    const now = Date.now();

    for (const [queueKey, queue] of this.eventQueues.entries()) {
      const validEvents = queue.events.filter(
        (storedEvent) => storedEvent.expiresAt > now
      );

      if (validEvents.length === 0) {
        // Remove empty queues
        this.eventQueues.delete(queueKey);
      } else if (validEvents.length !== queue.events.length) {
        // Update queue with only valid events
        queue.events = validEvents;
      }
    }
  }
}

// Global instance
export const runtimeEventBus = new RuntimeEventBus();
