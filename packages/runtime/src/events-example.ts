/**
 * Example usage of the runtime event system
 *
 * This file demonstrates how to use the event system to monitor
 * workflow execution and condition evaluations.
 */

import { Workflow, RuntimeEventEmitter, type RuntimeEvent } from "./index";

// Example: Basic event monitoring
export function createEventMonitor() {
  const eventEmitter = new RuntimeEventEmitter();

  // Subscribe to all events
  const unsubscribe = eventEmitter.onEvent((event: RuntimeEvent) => {
    console.log(
      `[${event.timestamp.toISOString()}] Event #${event.sequenceNumber}:`,
      {
        type: event.type,
        runId: event.runId,
        accountId: event.accountId,
      }
    );

    if (event.type === "step_transition") {
      console.log(`  Step ${event.stepId} -> ${event.status}`);
      if (event.input) {
        console.log(`  Input:`, event.input);
      }
      if (event.output) {
        console.log(`  Output:`, event.output);
      }
    } else if (event.type === "condition_check") {
      console.log(
        `  Condition ${event.conditionId} (${event.conditionType}): ${event.result}`
      );
      if (event.expression) {
        console.log(`  Expression: ${event.expression}`);
      }
    }
  });

  return { eventEmitter, unsubscribe };
}

// Example: Event filtering and aggregation
export function createEventAnalyzer() {
  const eventEmitter = new RuntimeEventEmitter();
  const analytics = {
    stepTransitions: 0,
    conditionChecks: 0,
    failedSteps: 0,
    successfulSteps: 0,
    trueConditions: 0,
    falseConditions: 0,
  };

  const unsubscribe = eventEmitter.onEvent((event: RuntimeEvent) => {
    if (event.type === "step_transition") {
      analytics.stepTransitions++;
      if (event.status === "failed") {
        analytics.failedSteps++;
      } else if (event.status === "success") {
        analytics.successfulSteps++;
      }
    } else if (event.type === "condition_check") {
      analytics.conditionChecks++;
      if (event.result) {
        analytics.trueConditions++;
      } else {
        analytics.falseConditions++;
      }
    }
  });

  return {
    eventEmitter,
    unsubscribe,
    getAnalytics: () => ({ ...analytics }),
    resetAnalytics: () => {
      Object.keys(analytics).forEach((key) => {
        (analytics as any)[key] = 0;
      });
    },
  };
}

// Example: Event persistence (simplified)
export function createEventLogger() {
  const eventEmitter = new RuntimeEventEmitter();
  const eventLog: RuntimeEvent[] = [];

  const unsubscribe = eventEmitter.onEvent((event: RuntimeEvent) => {
    // In a real implementation, you might save to a database
    eventLog.push(event);

    // Keep only the last 1000 events to prevent memory issues
    if (eventLog.length > 1000) {
      eventLog.shift();
    }
  });

  return {
    eventEmitter,
    unsubscribe,
    getEvents: () => [...eventLog],
    getEventsByRun: (runId: string) =>
      eventLog.filter((e) => e.runId === runId),
    getEventsByAccount: (accountId: string) =>
      eventLog.filter((e) => e.accountId === accountId),
    clearLog: () => eventLog.splice(0, eventLog.length),
  };
}

// Example: Real-time event streaming
export function createEventStreamer() {
  const eventEmitter = new RuntimeEventEmitter();
  const subscribers = new Set<(event: RuntimeEvent) => void>();

  const unsubscribe = eventEmitter.onEvent((event: RuntimeEvent) => {
    // Broadcast to all subscribers (e.g., WebSocket connections)
    subscribers.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error("Error in event subscriber:", error);
      }
    });
  });

  return {
    eventEmitter,
    unsubscribe,
    subscribe: (callback: (event: RuntimeEvent) => void) => {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
    getSubscriberCount: () => subscribers.size,
  };
}

// Example: Workflow with event monitoring
export async function runWorkflowWithEvents(
  workflow: Workflow<any, any>,
  input: any,
  accountId: string = "default"
) {
  const { eventEmitter, unsubscribe } = createEventMonitor();

  // Subscribe to workflow events
  const workflowUnsubscribe = workflow.onEvent((event) => {
    // Forward workflow events to our monitor
    // Note: In a real implementation, you would connect the workflow's event emitter
    // to your monitoring system. This is just a conceptual example.
    console.log("Workflow event received:", event);
  });

  try {
    const result = await workflow.run(input);
    return result;
  } finally {
    // Clean up subscriptions
    unsubscribe();
    workflowUnsubscribe();
  }
}
