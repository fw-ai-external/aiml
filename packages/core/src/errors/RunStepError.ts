import { BaseError } from './BaseError';

/**
 * Errors that are due to internal implementations.
 */
export class RunStepError extends BaseError {
  constructor(internalMessage: string) {
    super(internalMessage, 'RunStepError');
  }
}
