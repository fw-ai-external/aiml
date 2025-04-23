import { createServer } from "http";
import { Readable } from "stream";
import { endpoints } from "./endpoints";
import { OpenAPIHono } from "@hono/zod-openapi";
import { logger } from "hono/logger";
import { authCheckMiddleware } from "./middleware/authCheck";

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
createServer(async (req, res) => {
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
}).listen(8000, () => {
  console.log("Server running on port 8000");
});

export { app };
