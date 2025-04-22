import type { HonoRequest } from "hono";
import { createMiddleware } from "hono/factory";
import type { ContextEnv } from "@/lib/env";
export const developerHeadersMiddleware = createMiddleware<ContextEnv>(
  async (context, next) => {
    if (
      process.env.ENVIRONMENT === "development" ||
      process.env.ENVIRONMENT === "test"
    ) {
      context.set("user", {
        username: "fireworks",
        email: "fireworks@fireworks.ai",
        accountId: "fireworks",
        apiKey: process.env.FIREWORKS_API_KEY!,
      });
    } else {
      const headerGetter =
        "header" in context.req
          ? (name: string) => context.req.header(name)
          : (name: string) => context.req.header(name);
      const apiKey =
        headerGetter("x-api-key") ||
        headerGetter("Authorization")
          ?.replace(/bearer/i, "")
          .trim() ||
        null;

      if (!apiKey) {
        return context.json({ error: "Unauthorized" }, 401);
      }

      context.set("user", {
        username: context.req.header("x-fireworks-user-name")!,
        email: context.req.header("x-fireworks-developer-email")!,
        accountId: context.req.header("x-fireworks-account-id")!,
        accountType: context.req.header("x-fireworks-account-type")!,
        fwAPIKey: apiKey,
      });
    }

    await next();
  }
);

export function getApiKeyFromRequest(request: HonoRequest | Request) {
  const headerGetter =
    "header" in request
      ? (name: string) => request.header(name)
      : (name: string) => request.headers.get(name);
  const apiKey =
    headerGetter("x-api-key") ||
    headerGetter("Authorization")
      ?.replace(/bearer/i, "")
      .trim() ||
    null;

  return apiKey;
}
