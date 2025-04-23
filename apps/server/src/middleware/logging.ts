import { createMiddleware } from "hono/factory";
import type { ContextEnv } from "@/lib/env";

export const requestLoggingMiddleware = createMiddleware<ContextEnv>(
  async (context, next) => {
    // TODO implement request logging

    // catch errors downstream to ensure we log the --inference-request-log--
    const ctx = await next().catch((err) => err);

    // re-throw the error if there is one now that we've logged the request log
    if (ctx instanceof Error) {
      throw ctx;
    }
  }
);
