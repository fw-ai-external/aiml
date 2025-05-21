import { z } from "zod";
// import { postgresClient } from "./conn.ts";
// import { NewAgentSpecificationVersion, camelCaseKeys } from "./schema.ts";

// export const ChannelMap = {
//   new_agent_version: z.preprocess(camelCaseKeys, NewAgentSpecificationVersion),
// };

// export type ChannelMap = typeof ChannelMap;

// export const setupListeners = () =>
//   Promise.all([
//     new Promise<void>((resolve) => {
//       getDBListener({
//         channel: "new_agent_version",
//         onNotify: (payload) => {
//           // Agent version received
//         },
//         onListen: async () => {
//           // Now listening for new agent versions
//           resolve();
//         },
//       });
//     }),
//   ]);

// type ListenerConfig<Channel extends keyof ChannelMap> = {
//   channel: Channel;
//   onNotify: (payload: z.infer<ChannelMap[Channel]>) => void;
//   onListen: () => void;
// };

// export const getDBListener = <Channel extends keyof ChannelMap>(
//   props: ListenerConfig<Channel>
// ) => {
//   return postgresClient.listen(
//     props.channel,
//     (payloadString: string) => {
//       const payload = ChannelMap[props.channel].parse(
//         JSON.parse(payloadString)
//       );
//       props.onNotify(payload);
//     },
//     props.onListen
//   );
// };

import { fireworks } from "@ai-sdk/fireworks";
import {
  extractReasoningMiddleware,
  generateObject,
  wrapLanguageModel,
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
