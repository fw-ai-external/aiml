# Server-Sent Events (SSE) Endpoints

This document describes the SSE endpoints that provide a fallback for WebSocket functionality.

## Overview

The SSE endpoints provide real-time streaming of runtime events as an alternative to WebSocket connections. There are three main endpoints:

1. **General Events Stream** - Broadcasts all events for an account
2. **Request-Specific Events Stream** - Streams events for a specific workflow run
3. **Historical Events** - Retrieves historical events (non-streaming)

## Authentication

All endpoints require authentication via the `Authorization` header:

```
Authorization: Bearer <your-account-id>
```

## Endpoints

### 1. General Events Stream

**Endpoint:** `GET /sse/events`

Streams all runtime events for the authenticated account in real-time.

**Example:**

```bash
curl -H "Authorization: Bearer your-account-id" \
     -H "Accept: text/event-stream" \
     http://localhost:8000/sse/events
```

**Response Format:**

```
event: connection_ack
data: {"type":"connection_ack","data":{"timestamp":"2025-01-01T00:00:00.000Z","message":"Connected to general events stream","accountId":"your-account-id","connectionId":"general_..."}}

event: runtime_event
data: {"type":"runtime_event","data":{"type":"step_transition","runId":"run-123","accountId":"your-account-id","stepId":"step-1","status":"entering","timestamp":"2025-01-01T00:00:00.000Z","sequenceNumber":1}}

event: heartbeat
data: {"type":"heartbeat","data":{"timestamp":"2025-01-01T00:00:00.000Z"}}
```

### 2. Request-Specific Events Stream

**Endpoint:** `GET /sse/events/:runId`

Streams events for a specific workflow run until completion.

**Query Parameters:**

- `runId` (required) - The workflow run ID to monitor
- `lastSequenceNumber` (optional) - Resume from a specific sequence number

**Example:**

```bash
curl -H "Authorization: Bearer your-account-id" \
     -H "Accept: text/event-stream" \
     "http://localhost:8000/sse/events/run-123?runId=run-123&lastSequenceNumber=0"
```

**Response Format:**

```
event: connection_ack
data: {"type":"connection_ack","data":{"timestamp":"2025-01-01T00:00:00.000Z","message":"Connected to request events stream","accountId":"your-account-id","runId":"run-123","connectionId":"request_..."}}

event: historical_event
data: {"type":"historical_event","data":{"type":"step_transition","runId":"run-123","stepId":"step-1","status":"success","timestamp":"2025-01-01T00:00:00.000Z","sequenceNumber":1}}

event: runtime_event
data: {"type":"runtime_event","data":{"type":"step_transition","runId":"run-123","stepId":"step-2","status":"entering","timestamp":"2025-01-01T00:00:00.000Z","sequenceNumber":2}}

event: stream_complete
data: {"type":"stream_complete","data":{"timestamp":"2025-01-01T00:00:00.000Z","runId":"run-123","reason":"success"}}
```

### 3. Historical Events

**Endpoint:** `GET /sse/historical`

Retrieves historical events for a workflow run (non-streaming JSON response).

**Query Parameters:**

- `runId` (required) - The workflow run ID
- `afterSequenceNumber` (optional) - Get events after this sequence number

**Example:**

```bash
curl -H "Authorization: Bearer your-account-id" \
     "http://localhost:8000/sse/historical?runId=run-123&afterSequenceNumber=0"
```

**Response Format:**

```json
{
  "type": "historical_events",
  "data": {
    "runId": "run-123",
    "events": [
      {
        "type": "step_transition",
        "runId": "run-123",
        "accountId": "your-account-id",
        "stepId": "step-1",
        "status": "success",
        "timestamp": "2025-01-01T00:00:00.000Z",
        "sequenceNumber": 1
      }
    ],
    "count": 1,
    "timestamp": "2025-01-01T00:00:00.000Z"
  }
}
```

## Event Types

### Runtime Events

All runtime events follow the base structure:

```typescript
interface BaseEvent {
  runId: string;
  accountId: string;
  timestamp: Date;
  sequenceNumber: number;
}
```

#### Step Transition Event

```typescript
interface StepTransitionEvent extends BaseEvent {
  type: "step_transition";
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

#### Condition Check Event

```typescript
interface ConditionCheckEvent extends BaseEvent {
  type: "condition_check";
  conditionId: string;
  conditionType: "if" | "when" | "while" | "else";
  expression?: string;
  result: boolean;
  input?: any;
  context?: any;
}
```

### Control Events

#### Connection Acknowledgment

Sent when a client connects to confirm the connection:

```json
{
  "type": "connection_ack",
  "data": {
    "timestamp": "2025-01-01T00:00:00.000Z",
    "message": "Connected to events stream",
    "accountId": "your-account-id",
    "connectionId": "conn_123"
  }
}
```

#### Heartbeat

Sent periodically to keep the connection alive:

```json
{
  "type": "heartbeat",
  "data": {
    "timestamp": "2025-01-01T00:00:00.000Z",
    "runId": "run-123" // Only present in request-specific streams
  }
}
```

#### Stream Complete

Sent when a request-specific stream completes:

```json
{
  "type": "stream_complete",
  "data": {
    "timestamp": "2025-01-01T00:00:00.000Z",
    "runId": "run-123",
    "reason": "success" // or "failed"
  }
}
```

## Client Implementation

### JavaScript/Browser

```javascript
// General events stream
const eventSource = new EventSource("/sse/events", {
  headers: {
    Authorization: "Bearer your-account-id",
  },
});

eventSource.addEventListener("runtime_event", (event) => {
  const data = JSON.parse(event.data);
  console.log("Runtime event:", data.data);
});

eventSource.addEventListener("connection_ack", (event) => {
  const data = JSON.parse(event.data);
  console.log("Connected:", data.data.message);
});

// Request-specific stream
const requestSource = new EventSource("/sse/events/run-123?runId=run-123");
requestSource.addEventListener("stream_complete", (event) => {
  console.log("Stream completed");
  requestSource.close();
});
```

### Node.js

```javascript
import { EventSource } from "eventsource";

const eventSource = new EventSource("http://localhost:8000/sse/events", {
  headers: {
    Authorization: "Bearer your-account-id",
  },
});

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Event:", data);
};
```

## Error Handling

- **401 Unauthorized**: Missing or invalid authentication
- **400 Bad Request**: Missing required parameters (e.g., runId)
- **Connection Errors**: The stream will automatically reconnect in most SSE clients

## Comparison with WebSocket

| Feature           | WebSocket | SSE                        |
| ----------------- | --------- | -------------------------- |
| Bidirectional     | ✅        | ❌ (Server to client only) |
| Auto-reconnect    | ❌        | ✅                         |
| Browser support   | ✅        | ✅                         |
| Firewall friendly | ❌        | ✅ (HTTP)                  |
| Message ordering  | ✅        | ✅                         |
| Historical events | ✅        | ✅                         |

## Testing

Use the test script to simulate events:

```bash
bun run src/test-sse.ts
```

Then connect to the SSE endpoints to see the events in real-time.
