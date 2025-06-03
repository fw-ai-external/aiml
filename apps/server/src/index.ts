import { createServer } from "http";
import { Readable } from "stream";
import * as WebSocket from "ws";
import { endpoints } from "./endpoints";
import { OpenAPIHono } from "@hono/zod-openapi";
import { logger } from "hono/logger";
import { authCheckMiddleware } from "./middleware/authCheck";
import { handleWebSocketConnection } from "./endpoints/websocket";
import type { User } from "./types/user";

const app = new OpenAPIHono();

app.use("*", logger());
app.use("*", authCheckMiddleware);

// Mount endpoints
endpoints.forEach((endpoint) => {
  if ("method" in endpoint && "path" in endpoint && "handler" in endpoint) {
    const { method, path, handler } = endpoint;
    switch (method.toLowerCase()) {
      case "get":
        app.get(path, handler as any);
        break;
      case "post":
        app.post(path, handler as any);
        break;
      case "put":
        app.put(path, handler as any);
        break;
      case "delete":
        app.delete(path, handler as any);
        break;
      case "patch":
        app.patch(path, handler as any);
        break;
      default:
        console.warn(`Unsupported HTTP method: ${method}`);
    }
  } else {
    throw new Error(`Invalid endpoint: ${JSON.stringify(endpoint)}`);
  }
});

// Node HTTP server adapter for Hono
const server = createServer(async (req, res) => {
  const host = req.headers.host || "localhost";
  const url = `http://${host}${req.url}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) {
      headers.set(key, Array.isArray(value) ? value.join(",") : value);
    }
  }
  const body =
    req.method !== "GET" && req.method !== "HEAD"
      ? (Readable.toWeb(req) as unknown as BodyInit)
      : undefined;
  const request = new Request(url, { method: req.method, headers, body });
  const response = await app.fetch(request);
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  res.end(buffer);
});

// Create WebSocket server
const wss = new WebSocket.Server({
  server,
  path: "/ws/runtime-events",
});

wss.on("connection", async (ws: WebSocket, req: any) => {
  console.log("WebSocket connection attempt");

  // Extract auth information from the request
  // We need to manually parse the auth since WebSocket upgrade bypasses Hono middleware
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    ws.close(1008, "Authentication required");
    return;
  }

  // Simple auth extraction - in a real implementation, you'd want to validate the token
  // For now, we'll extract accountId from the auth header or use a default
  let accountId: string;

  try {
    // Assuming the auth header contains the accountId or API key
    // This is a simplified version - you should implement proper auth validation
    const authValue = authHeader.replace("Bearer ", "");
    accountId = authValue; // In real implementation, decode/validate the token to get accountId
  } catch (error) {
    console.error("Auth parsing error:", error);
    ws.close(1008, "Invalid authentication");
    return;
  }

  // Handle the WebSocket connection
  handleWebSocketConnection(ws, accountId);
});

server.listen(8000, () => {
  console.log("Server running on port 8000");
  console.log(
    "WebSocket server running on ws://localhost:8000/ws/runtime-events"
  );
});

export { app };
