/**
 * Base error class for all runtime errors
 */
export class RuntimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuntimeError';
  }
}

/**
 * Error thrown during run step execution
 */
export class RunStepError extends RuntimeError {
  constructor(message: string) {
    super(message);
    this.name = 'RunStepError';
  }
}

/**
 * Error thrown for internal errors
 */
export class InternalError extends RuntimeError {
  constructor(message: string) {
    super(message);
    this.name = 'InternalError';
  }
}
