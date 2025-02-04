import type { Hono } from "hono";
import { createHonoServer } from "./server";
import { mastra } from "./mastra";

type ServerOptions = {
  playground?: boolean;
  swaggerUI?: boolean;
};

export const app: Promise<Hono> = createHonoServer(mastra, {
  playground: true,
  swaggerUI: false,
});
