import { z } from 'zod';
import type { Services } from '~/composeServices';
import { User } from '~/types/user';

export const zEnv = z.object({
  ENVIRONMENT: z.enum(['development', 'preview', 'production', 'staging', 'test']).default('development'),
  FIREWORKS_API_KEY: z.string().optional(),
  FIREWORKS_GATEWAY_URL: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  LAUNCHDARKLY_SDK_KEY: z.string().optional(),
  FIREWORKS_GATEWAY_SECRET: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_API_URL: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  CEREBRAS_API_KEY: z.string().optional(),
  FIREWORKS_BASE_URL: z.string().optional(),
  FIRESEARCH_USERNAME: z.string().optional(),
  FIRESEARCH_PASSWORD: z.string().optional(),
  FIRESEARCH_ENDPOINT: z.string().optional(),
  AUDIO_ENDPOINT: z.string().optional(),
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
