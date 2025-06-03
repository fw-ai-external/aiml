# Runtime Event System

The runtime event system provides real-time visibility into workflow execution by emitting events for step transitions and condition evaluations. This enables monitoring, debugging, analytics, and integration with external systems.

## Overview

The event system consists of:

1. **Event Types**: Structured data representing workflow activities
2. **Event Emitter**: Core class for managing event subscriptions and emission
3. **Workflow Integration**: Automatic event emission during workflow execution

## Event Types

### StepTransitionEvent

Emitted when a workflow step enters or exits:

```typescript
interface StepTransitionEvent {
  type: "step_transition";
  runId: string; // Unique workflow run identifier
  accountId: string; // Account/tenant identifier
  stepId: string; // Unique step identifier
  status: "entering" | "exiting" | "success" | "failed" | "running";
  timestamp: Date; // When the event occurred
  sequenceNumber: number; // Event ordering within the run
  input?: any; // Step input data (when entering)
  output?: any; // Step output data (when exiting)
  metadata?: {
    stepKey?: string; // Step key from workflow definition
    stepTag?: string; // Step tag/type
    duration?: number; // Execution duration (ms)
  };
}
```

### ConditionCheckEvent

Emitted when workflow conditions (if/when/while) are evaluated:

```typescript
interface ConditionCheckEvent {
  type: "condition_check";
  runId: string; // Unique workflow run identifier
  accountId: string; // Account/tenant identifier
  conditionId: string; // Unique condition identifier
  conditionType: "if" | "when" | "while" | "else";
  timestamp: Date; // When the event occurred
  sequenceNumber: number; // Event ordering within the run
  expression?: string; // The condition expression
  result: boolean; // Evaluation result
  input?: any; // Available input data
  context?: any; // Evaluation context/scope
}
```

## Usage

### Basic Event Monitoring

```typescript
import { Workflow, RuntimeEventEmitter } from "@aiml/runtime";

// Create a workflow with event monitoring
const workflow = new Workflow(spec, datamodel, options, "account-123");

// Subscribe to events
const unsubscribe = workflow.onEvent((event) => {
  console.log(`Event: ${event.type}`, event);

  if (event.type === "step_transition") {
    console.log(`Step ${event.stepId} -> ${event.status}`);
  } else if (event.type === "condition_check") {
    console.log(`Condition ${event.conditionType}: ${event.result}`);
  }
});

// Run workflow
const result = await workflow.run(input);

// Clean up
unsubscribe();
```

### Event Analytics

```typescript
import { RuntimeEventEmitter } from "@aiml/runtime";

const eventEmitter = new RuntimeEventEmitter();
const analytics = {
  stepTransitions: 0,
  conditionChecks: 0,
  failedSteps: 0,
  successfulSteps: 0,
};

const unsubscribe = eventEmitter.onEvent((event) => {
  if (event.type === "step_transition") {
    analytics.stepTransitions++;
    if (event.status === "failed") analytics.failedSteps++;
    if (event.status === "success") analytics.successfulSteps++;
  } else if (event.type === "condition_check") {
    analytics.conditionChecks++;
  }
});

// Use analytics data for monitoring dashboards
console.log("Workflow Analytics:", analytics);
```

### Event Persistence

```typescript
import { RuntimeEventEmitter } from "@aiml/runtime";

const eventEmitter = new RuntimeEventEmitter();
const eventLog: RuntimeEvent[] = [];

const unsubscribe = eventEmitter.onEvent((event) => {
  // Store events in database
  eventLog.push(event);

  // Example: Save to database
  // await database.events.create(event);
});

// Query events by run
const runEvents = eventLog.filter((e) => e.runId === "specific-run-id");

// Query events by account
const accountEvents = eventLog.filter((e) => e.accountId === "account-123");
```

### Real-time Event Streaming

```typescript
import { RuntimeEventEmitter } from "@aiml/runtime";

const eventEmitter = new RuntimeEventEmitter();
const webSocketClients = new Set();

const unsubscribe = eventEmitter.onEvent((event) => {
  // Broadcast to WebSocket clients
  webSocketClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(event));
    }
  });
});
```

## Configuration

### Workflow Constructor

The `Workflow` class now accepts an optional `accountId` parameter:

```typescript
const workflow = new Workflow(
  spec, // Workflow specification
  datamodel, // Data model configuration
  options, // Runtime options
  "account-123" // Account ID for events
);
```

### Runtime Options

The `RuntimeOptions` type now includes an optional `accountId` field:

```typescript
type RuntimeOptions = {
  onTransition?: (state: WorkflowRunState) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
  accountId?: string; // Account ID for multi-tenant scenarios
};
```

## Event Sequencing

Events are automatically sequenced within each workflow run:

- Sequence numbers start at 1 for each new run
- Numbers increment for each event emitted
- Sequence resets when `workflow.run()` or `workflow.runStream()` is called
- Enables proper event ordering for replay and analysis

## Error Handling

The event system is designed to be resilient:

- Event callback errors are caught and logged without affecting workflow execution
- Failed event emissions don't interrupt workflow processing
- Multiple subscribers can be registered safely

## Integration Examples

### Monitoring Dashboard

```typescript
// Real-time workflow monitoring
const monitor = workflow.onEvent((event) => {
  if (event.type === "step_transition" && event.status === "failed") {
    // Alert on step failures
    alertingService.sendAlert({
      message: `Step ${event.stepId} failed in run ${event.runId}`,
      severity: "error",
      accountId: event.accountId,
    });
  }
});
```

### Audit Logging

```typescript
// Comprehensive audit trail
const auditLogger = workflow.onEvent((event) => {
  auditLog.record({
    timestamp: event.timestamp,
    runId: event.runId,
    accountId: event.accountId,
    eventType: event.type,
    details: event,
  });
});
```

### Performance Metrics

```typescript
// Track step execution times
const stepTimes = new Map();

workflow.onEvent((event) => {
  if (event.type === "step_transition") {
    if (event.status === "entering") {
      stepTimes.set(event.stepId, event.timestamp);
    } else if (event.status === "success" || event.status === "failed") {
      const startTime = stepTimes.get(event.stepId);
      if (startTime) {
        const duration = event.timestamp.getTime() - startTime.getTime();
        metricsService.recordStepDuration(event.stepId, duration);
        stepTimes.delete(event.stepId);
      }
    }
  }
});
```

## Testing

The event system includes comprehensive tests covering:

- Event emission and subscription
- Sequence number management
- Multiple subscribers
- Error handling in callbacks
- Unsubscription functionality

Run tests with:

```bash
cd packages/runtime
bun test events.test.ts
```

## Future Enhancements

Potential future improvements:

1. **Event Filtering**: Built-in filtering by event type, account, or custom criteria
2. **Event Batching**: Batch multiple events for efficient processing
3. **Event Replay**: Replay events for debugging and testing
4. **Schema Validation**: Validate event payloads against schemas
5. **Event Compression**: Compress event data for storage efficiency
6. **Event Routing**: Route events to different handlers based on criteria
