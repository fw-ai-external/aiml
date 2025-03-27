import { onExitConfig } from "@fireworks/shared";
import { createElementDefinition } from "../createElementFactory";

export const OnExit = createElementDefinition({
  ...onExitConfig,
  tag: "onexit" as const,
  allowedChildren: "any",
  role: "action",
  elementType: "onexit",
});
