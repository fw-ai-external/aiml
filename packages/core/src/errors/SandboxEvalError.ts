import { BaseError } from './BaseError';

/**
 * Errors that are due to internal implementations.
 */
export class SandboxEvalError extends BaseError {
  options: {} | null;
  constructor(internalMessage: string, options: {} | null = null) {
    super(internalMessage, 'SandboxEvalError');
    this.options = options;
  }

  asUserError(): Error {
    return new Error(this.message);
  }
}
