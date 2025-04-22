import type { Context } from "hono";
export const getHealth = {
  method: "GET",
  path: "/health",
  handler: async (c: Context) => {
    return c.json({ status: "ok" });
  },
};
