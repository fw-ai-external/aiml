import { z } from "zod";
import type { Services } from "../composeServices";
import type { User } from "../types/user";

export const zEnv = z.object({
  ENVIRONMENT: z
    .enum(["development", "preview", "production", "staging", "test"])
    .default("development"),

  FIREWORKS_API_KEY: z.string().optional(), // Just for tests
  DATABASE_URL: z.string().optional(),
});

export type Env = z.infer<typeof zEnv>;

/* type your Cloudflare bindings here */
export type Bindings = {} & Record<string, string>;
/* type your Hono variables (used with ctx.get/ctx.set) here */
export type Variables = {
  env: Env;
  requestId?: string;
  services: Services;
  user: User;
  error?: string;
};
export type ContextEnv = { Bindings: Bindings; Variables: Variables };
