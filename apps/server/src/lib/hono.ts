import { Context, HonoRequest } from 'hono';
import { ContextEnv } from '~/lib/env';

export function callNextJSStyleRoute(
  // eslint-disable-next-line @typescript-eslint/ban-types
  ctx: Context<any, string, {}>,
): (
  handler: (req: HonoRequest, ctx: Context<ContextEnv, string, {}>) => Promise<string | Response | null>,
) => Promise<Response> {
  return async (handler) => {
    const result = await handler(ctx.req, ctx);
    if (result instanceof Response) {
      return result;
    }
    return new Response(result);
  };
}
