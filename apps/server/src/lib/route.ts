import { createRoute, type RouteConfig } from "@hono/zod-openapi";
import type { Context, HonoRequest } from "hono";
import type { ContextEnv } from "@/lib/env";

export function createRouteconfig<
  P extends string,
  R extends Omit<RouteConfig, "path"> & {
    path: P;
  },
  Config extends R & {
    handler: (
      c: Context<ContextEnv, P> & {
        get req(): Context<ContextEnv, P>["req"] &
          Omit<HonoRequest<P>, "json"> & {
            json(): Promise<unknown>;
          };
      }
    ) => Promise<Response | void>;
  },
>({ handler, ...routeConfig }: Config) {
  const route = createRoute(routeConfig);

  return {
    ...route,
    handler,
  };
}
