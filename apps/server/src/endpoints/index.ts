import { getHealth } from "./health";
import { openaiRoutes } from "./openai";
import { websocketRoute } from "./websocket";
import { sseRoutes } from "./sse";

export const endpoints = [
  getHealth,
  ...openaiRoutes,
  websocketRoute,
  ...sseRoutes,
];
