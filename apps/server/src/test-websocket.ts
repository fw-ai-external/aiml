/**
 * Simple WebSocket test script
 *
 * This script demonstrates how to connect to the WebSocket endpoint
 * and subscribe to runtime events.
 */

import WebSocket from "ws";

// Test WebSocket connection
async function testWebSocketConnection() {
  console.log("Testing WebSocket connection...");

  const ws = new WebSocket("ws://localhost:8000/ws/runtime-events", {
    headers: {
      Authorization: "Bearer test-account-id",
    },
  });

  ws.on("open", () => {
    console.log("✅ WebSocket connected successfully");

    // Send a subscription message
    ws.send(
      JSON.stringify({
        type: "subscribe",
        data: {
          runId: "test-run-123",
          lastReceivedSequenceNumber: 0,
        },
      })
    );

    // Send a ping to test the connection
    setTimeout(() => {
      ws.send(
        JSON.stringify({
          type: "ping",
        })
      );
    }, 1000);
  });

  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log("📨 Received message:", JSON.stringify(message, null, 2));
    } catch (error) {
      console.error("❌ Error parsing message:", error);
    }
  });

  ws.on("close", (code, reason) => {
    console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
  });

  ws.on("error", (error) => {
    console.error("❌ WebSocket error:", error);
  });

  // Keep the connection open for a few seconds
  setTimeout(() => {
    console.log("Closing WebSocket connection...");
    ws.close();
  }, 5000);
}

// Run the test if this file is executed directly
if (require.main === module) {
  testWebSocketConnection().catch(console.error);
}

export { testWebSocketConnection };
