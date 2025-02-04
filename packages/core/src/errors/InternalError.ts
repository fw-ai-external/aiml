import { BaseError } from './BaseError';

/**
 * Errors that are due to internal implementations.
 */
export class InternalError extends BaseError {
  constructor(internalMessage: string) {
    super(internalMessage, 'InternalError');
  }
}
