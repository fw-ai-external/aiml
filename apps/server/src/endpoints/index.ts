import { agentRoutes } from "./agents";
import { getHealth } from "./health";

export const endpoints = [...agentRoutes, getHealth];
