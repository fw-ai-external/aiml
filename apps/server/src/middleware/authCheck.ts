import { createMiddleware } from "hono/factory";
import type { ContextEnv } from "@/lib/env";
import type { HonoRequest } from "hono";

export const authCheckMiddleware = createMiddleware<ContextEnv>(
  async (context, next) => {
    if (process.env.ENVIRONMENT === "test") {
      context.set("user", {
        username: "fireworks",
        email: "fireworks@fireworks.ai",
        accountId: "fireworks",
        apiKey: process.env.FIREWORKS_API_KEY!,
      });
    } else {
      if (!context.req.header("Authorization")) {
        return context.json({ error: "Unauthorized" }, 401);
      }
      const apiKey = getApiKeyFromRequest(context.req);

      console.log("🚀 ~ authCheckMiddleware ~ apiKey:", apiKey);

      if (!apiKey) {
        return context.json({ error: "Unauthorized" }, 401);
      }
      // Create a user object with the user's accountId, username, email, and apiKey
      // this is added to the request by the API gateway when deployed by fireworks
      context.set("user", {
        username: context.req.header("x-fireworks-user-name")!,
        email: context.req.header("x-fireworks-developer-email")!,
        accountId: context.req.header("x-fireworks-account-id")!,
        apiKey: apiKey,
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
