import { onEntryConfig } from "@fireworks/shared";
import { createElementDefinition } from "../createElementFactory";

export const OnEntry = createElementDefinition({
  ...onEntryConfig,
  role: "action",
  elementType: "onentry",
});
