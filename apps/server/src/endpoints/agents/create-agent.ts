import type { Context } from "hono";
import { ZodError, z } from "zod";
import { dbConn } from "../../db/conn";
import { AgentTable } from "../../db/schema";

const agentSchema = z.object({
  name: z.string().min(1),
  scxml: z.string().min(1),
});

export const createAgent = {
  method: "POST",
  path: "/agents",
  handler: async (c: Context) => {
    try {
      const body = await c.req.json();
      const data = agentSchema.parse(body);
      await dbConn
        .insert(AgentTable)
        .values({
          name: data.name,
        })
        .returning();
      return c.json({ message: "Agent created" }, 201);
    } catch (error) {
      if (error instanceof ZodError) {
        return c.json({ error: error.errors.map((e) => e.message) }, 400);
      }
      return c.json({ error: "Failed to create agent" }, 500);
    }
  },
};
