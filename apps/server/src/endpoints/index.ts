import { getHealth } from "./health";
import { openaiRoutes } from "./openai";

export const endpoints = [getHealth, ...openaiRoutes];
