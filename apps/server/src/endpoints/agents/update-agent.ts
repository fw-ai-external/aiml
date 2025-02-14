import type { Context } from "hono";
import { dbConn } from "../../db/conn";
import { AgentTable } from "../../db/schema";
import { eq } from "drizzle-orm";
import { z, ZodError } from "zod";

const agentSchema = z.object({
  name: z.string().min(1),
  scxml: z.string().min(1),
});

export const updateAgent = async (c: Context) => {
  const id = Number(c.req.param("id"));
  if (isNaN(id)) {
    return c.json({ error: "Invalid agent id" }, 400);
  }
  try {
    const body = await c.req.json();
    const data = agentSchema.parse(body);
    await dbConn
      .update(AgentTable)
      .set({
        name: data.name,
        scxml: data.scxml,
      })
      .where(eq(AgentTable.id, id))
      .returning();
    return c.json({ message: "Agent updated" });
  } catch (error) {
    if (error instanceof ZodError) {
      return c.json({ error: error.errors.map((e) => e.message) }, 400);
    }
    return c.json({ error: "Failed to update agent" }, 500);
  }
};
