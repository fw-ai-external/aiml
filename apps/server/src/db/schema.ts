import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { camelCase, mapKeys } from "lodash";
import { z } from "zod";

// Define the camelCaseKeys function
export const camelCaseKeys = (object: unknown) =>
  mapKeys(object as Record<string, unknown>, (_, key) => camelCase(key));

/** Agents Table */
// TODO agents should have N prompt files with a 1-many relationship to an agent
export const AgentTable = pgTable("agents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const Agent = createSelectSchema(AgentTable, {
  createdAt: z.coerce.date(),
});

export const NewAgent = createInsertSchema(AgentTable).omit({
  id: true,
  createdAt: true,
});

export type Agent = z.infer<typeof Agent>;
export type NewAgent = z.infer<typeof NewAgent>;
