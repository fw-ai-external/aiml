import { z } from "zod";
import { camelCaseKeys, NewAgentSpecificationVersion } from "./schema.ts";
import { postgresClient } from "./conn.ts";

export const ChannelMap = {
  new_agent_version: z.preprocess(camelCaseKeys, NewAgentSpecificationVersion),
};

export type ChannelMap = typeof ChannelMap;

export const setupListeners = () =>
  Promise.all([
    new Promise<void>((resolve) => {
      getDBListener({
        channel: "new_agent_version",
        onNotify: (payload) => {
          console.log("listener received new agent version", payload.agentId);
        },
        onListen: async () => {
          console.log("Listening for new agent versions");
          resolve();
        },
      });
    }),
  ]);

type ListenerConfig<Channel extends keyof ChannelMap> = {
  channel: Channel;
  onNotify: (payload: z.infer<ChannelMap[Channel]>) => void;
  onListen: () => void;
};

export const getDBListener = <Channel extends keyof ChannelMap>(
  props: ListenerConfig<Channel>
) => {
  return postgresClient.listen(
    props.channel,
    (payloadString: string) => {
      const payload = ChannelMap[props.channel].parse(
        JSON.parse(payloadString)
      );
      props.onNotify(payload);
    },
    props.onListen
  );
};

import { fireworks } from "@ai-sdk/fireworks";
import {
  extractReasoningMiddleware,
  wrapLanguageModel,
  generateObject,
} from "ai";

const model = wrapLanguageModel({
  model: fireworks("accounts/fireworks/models/firefunction-v1"),
  middleware: extractReasoningMiddleware({ tagName: "think" }),
});

const { object } = await generateObject({
  model,
  output: "array",
  schema: z.object({
    name: z.string(),
    class: z
      .string()
      .describe("Character class, e.g. warrior, mage, or thief."),
    description: z.string(),
  }),
  prompt: "Write a vegetarian lasagna recipe for 4 people.",
});
