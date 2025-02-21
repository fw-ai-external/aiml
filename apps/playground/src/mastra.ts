import { basic } from "@fireworks/core/examples/basic";
import { Mastra } from "@mastra/core";
import { createLogger } from "@mastra/core/logger";
export const mastra = new Mastra({
  workflows: {
    basic,
  },
  logger: createLogger({
    level: "debug",
  }),
});
