import { getHealth } from "./health";
import { openaiRoutes } from "./openai";
import { websocketRoute } from "./websocket";

export const endpoints = [getHealth, ...openaiRoutes, websocketRoute];
