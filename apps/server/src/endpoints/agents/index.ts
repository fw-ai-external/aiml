import { createAgent } from './create-agent';
import { deleteAgent } from './delete-agent';
import { getAgent } from './get-agent';
import { getAgents } from './list-agents';
import { updateAgent } from './update-agent';

export const agentRoutes = [getAgents, getAgent, createAgent, updateAgent, deleteAgent];
