import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { dbConn } from "../../db/conn";
import { AgentTable } from "../../db/schema";

export const getAgent = {
  method: "GET",
  path: "/agents/:id",
  handler: async (c: Context) => {
    const id = Number(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ error: "Invalid agent id" }, 400);
    }
    try {
      const result = await dbConn
        .select()
        .from(AgentTable)
        .where(eq(AgentTable.id, id));
      const agent = result[0];
      if (!agent) return c.json({ error: "Agent not found" }, 404);
      return c.json(agent);
    } catch (error) {
      return c.json({ error: "Failed to fetch agent" }, 500);
    }
  },
};
