import { relations } from "drizzle-orm";
import { jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
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

/** Agent Specification Version Table */
export const AgentSpecificationVersionTable = pgTable(
  "agent_specification_version",
  {
    id: serial("id").primaryKey(),
    agentId: serial("agent_id")
      .references(() => AgentTable.id)
      .notNull(),
    prompt: text("prompt"),
    specification: jsonb("specification").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  }
);

// Define relations
export const agentRelations = relations(AgentTable, ({ many }) => ({
  versions: many(AgentSpecificationVersionTable),
}));

export const agentSpecificationVersionRelations = relations(
  AgentSpecificationVersionTable,
  ({ one }) => ({
    agent: one(AgentTable, {
      fields: [AgentSpecificationVersionTable.agentId],
      references: [AgentTable.id],
    }),
  })
);

export const AgentSpecificationVersion = createSelectSchema(
  AgentSpecificationVersionTable,
  {
    createdAt: z.coerce.date(),
  }
);

export const NewAgentSpecificationVersion = createInsertSchema(
  AgentSpecificationVersionTable
).omit({
  id: true,
  createdAt: true,
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
export type AgentSpecificationVersion = z.infer<
  typeof AgentSpecificationVersion
>;
export type NewAgentSpecificationVersion = z.infer<
  typeof NewAgentSpecificationVersion
>;
