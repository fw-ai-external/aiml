# WebSocket Runtime Events System

This document describes the WebSocket-based real-time event streaming system for AIML workflow runtime events.

## Overview

The WebSocket system provides real-time streaming of workflow execution events to connected clients. It supports:

- **Per-runId event queuing** with configurable TTL and size limits
- **Account-based filtering** and room management
- **Late-connecting client support** with historical event retrieval
- **Reconnection handling** with sequence number tracking
- **Event persistence** for eventual consistency

## Architecture

### Components

1. **Runtime Event Bus** (`src/lib/runtimeEventBus.ts`)

   - Manages events from runtime workflows
   - Handles per-runId event queuing
   - Supports account-based filtering
   - Provides historical event retrieval

2. **WebSocket Endpoint** (`src/endpoints/websocket.ts`)

   - WebSocket route `/ws/runtime-events`
   - Handles connection with accountId extraction
   - Supports reconnection with sequence numbers
   - Manages room subscriptions

3. **Server Integration** (`src/index.ts`)

   - WebSocket server setup with Node.js HTTP server
   - Authentication handling for WebSocket upgrades
   - Connection management

4. **OpenAI Chat Integration** (`src/endpoints/openai/openai.chat.ts`)
   - Workflow event subscription
   - Event broadcasting to WebSocket clients
   - Account-based event association

## WebSocket Protocol

### Connection

Connect to: `ws://localhost:8000/ws/runtime-events`

**Headers:**

```
Authorization: Bearer <account-id-or-api-key>
```

### Message Format

All messages are JSON with the following structure:

```typescript
interface WebSocketMessage {
  type: string;
  data?: any;
}
```

### Client Messages

#### Subscribe to Workflow Events

```json
{
  "type": "subscribe",
  "data": {
    "runId": "workflow-run-uuid",
    "lastReceivedSequenceNumber": 0
  }
}
```

#### Unsubscribe

```json
{
  "type": "unsubscribe"
}
```

#### Get Historical Events

```json
{
  "type": "get_historical",
  "data": {
    "runId": "workflow-run-uuid",
    "afterSequenceNumber": 10
  }
}
```

#### Ping

```json
{
  "type": "ping"
}
```

### Server Messages

#### Connection Acknowledgment

```json
{
  "type": "connection_ack",
  "data": {
    "timestamp": "2025-01-27T18:57:00.000Z",
    "message": "Connected to runtime events stream",
    "accountId": "user-account-id"
  }
}
```

#### Subscription Confirmation

```json
{
  "type": "subscribed",
  "data": {
    "runId": "workflow-run-uuid",
    "accountId": "user-account-id",
    "connectionId": "connection-uuid",
    "timestamp": "2025-01-27T18:57:00.000Z"
  }
}
```

#### Runtime Event

```json
{
  "type": "runtime_event",
  "data": {
    "type": "step_transition",
    "runId": "workflow-run-uuid",
    "accountId": "user-account-id",
    "timestamp": "2025-01-27T18:57:00.000Z",
    "sequenceNumber": 1,
    "stepId": "step-uuid",
    "status": "entering",
    "input": {
      /* step input data */
    },
    "metadata": {
      "stepKey": "step-key",
      "stepTag": "step-tag"
    }
  }
}
```

#### Historical Events Response

```json
{
  "type": "historical_events",
  "data": {
    "runId": "workflow-run-uuid",
    "events": [
      /* array of runtime events */
    ],
    "count": 5,
    "timestamp": "2025-01-27T18:57:00.000Z"
  }
}
```

#### Pong Response

```json
{
  "type": "pong",
  "data": {
    "timestamp": "2025-01-27T18:57:00.000Z"
  }
}
```

#### Error

```json
{
  "type": "error",
  "data": {
    "message": "Error description",
    "timestamp": "2025-01-27T18:57:00.000Z"
  }
}
```

## Event Types

### Step Transition Event

Emitted when a workflow step changes state:

```typescript
interface StepTransitionEvent {
  type: "step_transition";
  runId: string;
  accountId: string;
  timestamp: Date;
  sequenceNumber: number;
  stepId: string;
  status: "entering" | "exiting" | "success" | "failed" | "running";
  input?: any;
  output?: any;
  metadata?: {
    stepKey?: string;
    stepTag?: string;
    duration?: number;
  };
}
```

### Condition Check Event

Emitted when a condition is evaluated:

```typescript
interface ConditionCheckEvent {
  type: "condition_check";
  runId: string;
  accountId: string;
  timestamp: Date;
  sequenceNumber: number;
  conditionId: string;
  conditionType: "if" | "when" | "while" | "else";
  expression?: string;
  result: boolean;
  input?: any;
  context?: any;
}
```

## Configuration

### Event Bus Configuration

```typescript
interface EventQueueConfig {
  maxEvents: number; // Default: 1000
  ttlMs: number; // Default: 24 hours
}
```

### Usage Example

```typescript
import { runtimeEventBus } from "./lib/runtimeEventBus";

// Get queue statistics
const stats = runtimeEventBus.getQueueStats();
console.log(`Active queues: ${stats.totalQueues}`);
console.log(`Total events: ${stats.totalEvents}`);
console.log(`Active connections: ${stats.activeConnections}`);
```

## Testing

Use the test script to verify WebSocket functionality:

```bash
# Start the server
bun run dev

# In another terminal, run the test
bun run src/test-websocket.ts
```

## Security Considerations

1. **Authentication**: WebSocket connections require valid authorization headers
2. **Account Isolation**: Events are filtered by accountId to prevent cross-account data leakage
3. **Rate Limiting**: Consider implementing rate limiting for WebSocket connections
4. **Input Validation**: All WebSocket messages are validated before processing

## Monitoring

The event bus provides statistics for monitoring:

- Total number of event queues
- Total number of stored events
- Number of active WebSocket connections
- Per-queue event counts and sequence numbers

## Error Handling

- Invalid authentication results in connection closure with code 1008
- Malformed messages result in error responses
- Connection failures are logged and connections are cleaned up automatically
- Event broadcasting errors are caught and logged without affecting other connections

## Future Enhancements

1. **Compression**: Add WebSocket compression for large event payloads
2. **Filtering**: Allow clients to filter events by type or step
3. **Batching**: Batch multiple events in a single message for efficiency
4. **Persistence**: Add database persistence for long-term event storage
5. **Metrics**: Add detailed metrics and monitoring dashboards
