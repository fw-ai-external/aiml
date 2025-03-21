/**
 * Simple logger interface for debugging purposes
 */
export interface DebugLogger {
  info: (message: string) => void;
  error: (message: string, error?: Error) => void;
  completion: (message: string, data?: any) => void;
}

/**
 * Create a debug logger that logs to the console
 */
export function createDebugLogger(prefix: string = 'AIML'): DebugLogger {
  return {
    info: (message: string) => console.log(`[${prefix}:INFO] ${message}`),
    error: (message: string, error?: Error) => {
      console.error(`[${prefix}:ERROR] ${message}`);
      if (error) {
        console.error(error);
      }
    },
    completion: (message: string, data?: any) => {
      if (process.env.DEBUG_COMPLETION) {
        console.log(`[${prefix}:COMPLETION] ${message}`, data ? data : '');
      }
    },
  };
}
