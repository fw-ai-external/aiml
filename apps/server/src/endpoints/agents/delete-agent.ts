import type { Context } from "hono";
import { dbConn } from "../../db/conn";
import { AgentTable } from "../../db/schema";
import { eq } from "drizzle-orm";

export const deleteAgent = async (c: Context) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) {
    return c.json({ error: "Invalid agent id" }, 400);
  }
  try {
    await dbConn.delete(AgentTable).where(eq(AgentTable.id, id)).returning();
    return c.json({ message: "Agent deleted" });
  } catch (error) {
    return c.json({ error: "Failed to delete agent" }, 500);
  }
};
