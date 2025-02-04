import type {
  Mastra,
  MastraTools,
  MastraIntegrations,
  MastraSyncs,
} from "@mastra/core";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { prettyJSON } from "hono/pretty-json";
import { logger } from "hono/logger";
import superjson from "superjson";
import type { Context } from "hono";

type ServerOptions = {
  playground?: boolean;
  swaggerUI?: boolean;
  evalStore?: any[];
};

export async function createHonoServer(
  mastra: Mastra<MastraIntegrations, MastraTools, MastraSyncs>,
  options: ServerOptions = {}
): Promise<Hono> {
  const app = new Hono();

  app.use("*", logger());
  app.use("*", prettyJSON());
  app.use("*", cors());

  app.post("/api/run", async (c: Context) => {
    const body = await c.req.json();
    const result = await mastra.run(body);
    return c.json(superjson.serialize(result));
  });

  app.get("/api/workflows", (c: Context) => {
    return c.json(mastra.getWorkflows());
  });

  app.get("/api/workflow/:name", (c: Context) => {
    const name = c.req.param("name");
    const workflow = mastra.getWorkflow(name);
    if (!workflow) {
      return c.json({ error: "Workflow not found" }, 404);
    }
    return c.json(workflow);
  });

  if (options.evalStore) {
    app.get("/api/evals", (c: Context) => {
      return c.json(options.evalStore);
    });
  }

  return app;
}

export async function createNodeServer(
  mastra: Mastra<MastraIntegrations, MastraTools, MastraSyncs>,
  options: ServerOptions = {}
): Promise<void> {
  const app = await createHonoServer(mastra, options);
  serve(app);
}
