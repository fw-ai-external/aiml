// Do this because bun test running vitest won't retry
export function retryIfFailed(retry: number, fn: () => Promise<void>, softFail = false) {
  return async () => {
    while (retry > 0) {
      try {
        await fn();
        break;
      } catch (e) {
        // console.error((e as Error).message || 'expectation failed');
        retry--;
        if (retry === 0) {
          if (softFail) {
            return;
          }
          throw e;
        }
      }
    }
  };
}
