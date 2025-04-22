import { createMiddleware } from 'hono/factory';
import { ContextEnv } from '~/lib/env';

export const requestLoggingMiddleware = createMiddleware<ContextEnv>(async (context, next) => {
  const startTime = new Date().getTime();
  const requestLog = {
    start_timestamp: startTime,
    timestamp: startTime,
    // CF adds these headers we use for client_ip, or we use 192.168.0.1 because we are local
    client_ip: context.req.header('x-forwarded-for') || context.req.header('CF-Connecting-IP') || '192.168.0.1',
    user_agent: context.req.header('user-agent'),
    environment: context.env.ENVIRONMENT,
    verb: context.req.method,
    uri: context.req.url,
  };

  // catch errors downstream to ensure we log the --inference-request-log--
  const ctx = await next().catch((err) => err);

  // log the request log to the tail worker
  if (context.env.ENVIRONMENT !== 'test') {
    console.log('--inference-request-log--', {
      ...requestLog,
      request_id: context.get('requestId'),
      status_message: context.res.statusText,
      request_runtime_ms: new Date().getTime() - startTime,
      account_id: context.get('user')?.accountId,
      app_name: context.req.header('x-fireworks-app-name'),
      email: context.get('user')?.email,
      // agent_name: context.get('agentName'),
      error: context.get('error'),
      origin: context.req.header('Origin'),
      status_code: context.res.status, // what the API replied with
    });
  }

  // re-throw the error if there is one now that we've logged the request log
  if (ctx instanceof Error) {
    throw ctx;
  }
});
