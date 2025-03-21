import type { Context } from 'hono';
import { dbConn } from '../../db/conn';
import { AgentTable } from '../../db/schema';

export const getAgents = {
  method: 'GET',
  path: '/',
  handler: async (c: Context) => {
    try {
      const agentsList = await dbConn.select().from(AgentTable);
      return c.json(agentsList);
    } catch (error) {
      return c.json({ error: 'Failed to fetch agents' }, 500);
    }
  },
};
