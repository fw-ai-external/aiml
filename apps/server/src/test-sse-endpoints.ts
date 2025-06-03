/**
 * Test script to verify SSE endpoints are working
 * Run this after starting the server with: bun run dev
 */

async function testSSEEndpoints() {
  const baseUrl = "http://localhost:8000";
  const authHeader = "Bearer test-account";

  console.log("Testing SSE endpoints...\n");

  // Test 1: Historical events endpoint (non-streaming)
  console.log("1. Testing historical events endpoint...");
  try {
    const response = await fetch(
      `${baseUrl}/sse/historical?runId=test-run-123`,
      {
        headers: {
          Authorization: authHeader,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Historical events endpoint working");
      console.log("Response:", JSON.stringify(data, null, 2));
    } else {
      console.log(
        "❌ Historical events endpoint failed:",
        response.status,
        response.statusText
      );
    }
  } catch (error) {
    console.log("❌ Historical events endpoint error:", error);
  }

  console.log("\n2. Testing general events SSE stream...");
  console.log("You can test this manually with:");
  console.log(
    `curl -H "Authorization: ${authHeader}" -H "Accept: text/event-stream" ${baseUrl}/sse/events`
  );

  console.log("\n3. Testing request-specific SSE stream...");
  console.log("You can test this manually with:");
  console.log(
    `curl -H "Authorization: ${authHeader}" -H "Accept: text/event-stream" "${baseUrl}/sse/events/test-run-123?runId=test-run-123"`
  );

  console.log("\n4. Available SSE endpoints:");
  console.log("- GET /sse/events - General events stream");
  console.log("- GET /sse/events/:runId - Request-specific events stream");
  console.log("- GET /sse/historical - Historical events (JSON)");

  console.log("\nTo test with real events, run the event simulator:");
  console.log("bun run src/test-sse.ts");
}

if (import.meta.main) {
  testSSEEndpoints();
}
