/**
 * Simple test script for SSE endpoints
 * Run with: bun run src/test-sse.ts
 */

import { runtimeEventBus } from "./lib/runtimeEventBus";
import type { RuntimeEvent } from "@aiml/runtime";

// Simulate some runtime events
function simulateEvents() {
  const accountId = "test-account";
  const runId = "test-run-123";

  console.log("Simulating runtime events...");

  // Simulate step transition events
  const stepEvents: Omit<
    import("@aiml/runtime").StepTransitionEvent,
    "timestamp" | "sequenceNumber"
  >[] = [
    {
      type: "step_transition",
      runId,
      accountId,
      stepId: "step-1",
      status: "entering",
      input: { message: "Starting workflow" },
      metadata: { stepKey: "start" },
    },
    {
      type: "step_transition",
      runId,
      accountId,
      stepId: "step-1",
      status: "success",
      output: { result: "Step completed successfully" },
      metadata: { stepKey: "start", duration: 100 },
    },
    {
      type: "step_transition",
      runId,
      accountId,
      stepId: "step-2",
      status: "entering",
      input: { result: "Step completed successfully" },
      metadata: { stepKey: "process" },
    },
    {
      type: "step_transition",
      runId,
      accountId,
      stepId: "step-2",
      status: "success",
      output: { finalResult: "Workflow completed" },
      metadata: { stepKey: "final", duration: 200 },
    },
  ];

  const conditionEvents: Omit<
    import("@aiml/runtime").ConditionCheckEvent,
    "timestamp" | "sequenceNumber"
  >[] = [
    {
      type: "condition_check",
      runId,
      accountId,
      conditionId: "cond-1",
      conditionType: "if",
      expression: "input.message !== null",
      result: true,
      input: { message: "Starting workflow" },
    },
  ];

  // Combine all events
  const events = [
    stepEvents[0],
    conditionEvents[0],
    stepEvents[1],
    stepEvents[2],
    stepEvents[3],
  ];

  let sequenceNumber = 1;
  events.forEach((eventData, index) => {
    setTimeout(() => {
      const event: RuntimeEvent = {
        ...eventData,
        timestamp: new Date(),
        sequenceNumber: sequenceNumber++,
      } as RuntimeEvent;

      const identifier =
        event.type === "step_transition" ? event.stepId : event.conditionId;
      console.log(`Broadcasting event ${index + 1}:`, event.type, identifier);
      runtimeEventBus.broadcastEvent(event);
    }, (index + 1) * 1000); // 1 second intervals
  });
}

// Test the SSE endpoints
async function testSSEEndpoints() {
  console.log("Testing SSE endpoints...");
  console.log("You can test the endpoints manually:");
  console.log("1. General events: GET http://localhost:8000/sse/events");
  console.log(
    "2. Specific request: GET http://localhost:8000/sse/events/test-run-123"
  );
  console.log(
    "3. Historical events: GET http://localhost:8000/sse/historical?runId=test-run-123"
  );
  console.log("");
  console.log("Example curl commands:");
  console.log(
    'curl -H "Authorization: Bearer test-account" http://localhost:8000/sse/events'
  );
  console.log(
    'curl -H "Authorization: Bearer test-account" "http://localhost:8000/sse/events/test-run-123?runId=test-run-123"'
  );
  console.log(
    'curl -H "Authorization: Bearer test-account" "http://localhost:8000/sse/historical?runId=test-run-123"'
  );
  console.log("");

  // Start simulating events after a short delay
  setTimeout(simulateEvents, 2000);
}

if (import.meta.main) {
  testSSEEndpoints();
}
