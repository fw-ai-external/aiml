import type { Env } from "./lib/env";
import type { ExecutionContext } from "hono";

export type KeyHash = string;

let services: Services | undefined;

export type Services = {};

/**
 * Initialize all services.
 *
 * Call this once before any hono handlers run.
 */
export async function initServices(opts: { env: Env }, ctx: ExecutionContext) {
  if (services) {
    return services;
  }
  services = {} as Services;

  let db;
  if (opts.env.DATABASE_URL) {
    const dbConn = await import("./db/conn");
    try {
      db = dbConn;
    } catch (e) {
      console.error("[INIT] Error initializing db", e);
    }
  }

  // Instanciate services here like this
  // const agentDBAdapter = new AgentsPersistenceAdapter(db);
  // const agentService = new AgentService(agentDBAdapter);

  // services.agentService = agentService;

  return services;
}
