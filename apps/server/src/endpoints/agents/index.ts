import { getAgents } from "./list-agents";
import { getAgent } from "./get-agent";
import { createAgent } from "./create-agent";
import { updateAgent } from "./update-agent";
import { deleteAgent } from "./delete-agent";

export const agentRoutes = [
  getAgents,
  getAgent,
  createAgent,
  updateAgent,
  deleteAgent,
];
