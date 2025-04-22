import type {
  RouteHandler as OpenAPIRouteHandler,
  createRoute,
} from "@hono/zod-openapi";
import type { ContextEnv } from "@/lib/env";

export type RouteConfig = Parameters<typeof createRoute>[0];

export type ResponseHandler<R extends RouteConfig> = OpenAPIRouteHandler<
  R,
  ContextEnv
>;
