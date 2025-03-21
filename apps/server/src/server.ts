import { createServer } from 'http';
import { Readable } from 'stream';
import { Hono } from 'hono';
import { endpoints } from './endpoints';

const app = new Hono();

// Mount endpoints
endpoints.forEach((endpoint) => {
  if ('method' in endpoint && 'path' in endpoint && 'handler' in endpoint) {
    const { method, path, handler } = endpoint;
    switch (method.toLowerCase()) {
      case 'get':
        app.get(path, handler);
        break;
      case 'post':
        app.post(path, handler);
        break;
      case 'put':
        app.put(path, handler);
        break;
      case 'delete':
        app.delete(path, handler);
        break;
      case 'patch':
        app.patch(path, handler);
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
  const host = req.headers.host || 'localhost';
  const url = `http://${host}${req.url}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) {
      headers.set(key, Array.isArray(value) ? value.join(',') : value);
    }
  }
  const body = req.method !== 'GET' && req.method !== 'HEAD' ? (Readable.toWeb(req) as unknown as BodyInit) : undefined;
  const request = new Request(url, { method: req.method, headers, body });
  const response = await app.fetch(request);
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  res.end(buffer);
}).listen(3000, () => {
  console.log('Server running on port 3000');
});

export { app };
