/**
 * Test script for WebSocket general events subscription
 * Run this after starting the server with: bun run dev
 */

import WebSocket from "ws";
import { runtimeEventBus } from "./lib/runtimeEventBus";
import type { RuntimeEvent } from "@aiml/runtime";

async function testWebSocketAllEvents() {
  console.log("Testing WebSocket general events subscription...\n");

  // Connect to WebSocket
  const ws = new WebSocket("ws://localhost:8000/ws/runtime-events", {
    headers: {
      Authorization: "Bearer test-account",
    },
  });

  ws.on("open", () => {
    console.log("✅ WebSocket connected");

    // Subscribe to all events
    ws.send(
      JSON.stringify({
        type: "subscribe_all",
      })
    );
    console.log("📡 Sent subscribe_all message");
  });

  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log("📨 Received message:", message.type);

      if (message.type === "subscribed_all") {
        console.log("✅ Successfully subscribed to all events");
        console.log("Connection ID:", message.data.connectionId);

        // Start simulating events after subscription confirmation
        setTimeout(() => {
          simulateEvents();
        }, 1000);
      } else if (message.type === "runtime_event") {
        const event = message.data;
        const identifier =
          event.type === "step_transition" ? event.stepId : event.conditionId;
        console.log(
          `🔄 Runtime event: ${event.type} - ${identifier} (seq: ${event.sequenceNumber})`
        );
      } else if (message.type === "connection_ack") {
        console.log("✅ Connection acknowledged");
      }
    } catch (error) {
      console.error("❌ Error parsing message:", error);
    }
  });

  ws.on("error", (error) => {
    console.error("❌ WebSocket error:", error);
  });

  ws.on("close", () => {
    console.log("🔌 WebSocket connection closed");
  });

  // Simulate events function
  function simulateEvents() {
    const accountId = "test-account";
    const runId = "test-run-" + Date.now();

    console.log(`\n🎬 Simulating events for runId: ${runId}`);

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

    const events = [
      stepEvents[0],
      conditionEvents[0],
      stepEvents[1],
      stepEvents[2],
    ];

    let sequenceNumber = 1;
    events.forEach((eventData, index) => {
      setTimeout(() => {
        const event: RuntimeEvent = {
          ...eventData,
          timestamp: new Date(),
          sequenceNumber: sequenceNumber++,
        } as RuntimeEvent;

        console.log(`📤 Broadcasting event ${index + 1}:`, event.type);
        runtimeEventBus.broadcastEvent(event);
      }, (index + 1) * 1000); // 1 second intervals
    });

    // Close connection after all events
    setTimeout(() => {
      console.log("\n🔌 Closing WebSocket connection");
      ws.close();
    }, (events.length + 2) * 1000);
  }
}

if (import.meta.main) {
  testWebSocketAllEvents();
}
