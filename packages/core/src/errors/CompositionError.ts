import { BaseError } from './BaseError';

type CompositionErrorData = {
  childrenError?: [parent: string, child: string];
  multipleRootElements?: number;
};

/**
 * Errors that are due to invalid element compositions
 */
export class CompositionError extends BaseError {
  errorData: CompositionErrorData;
  constructor(internalMessage: string, errorData: CompositionErrorData) {
    super(internalMessage, 'CompositionError');
    this.errorData = errorData;
  }

  asUserError(): Error {
    if ('childrenError' in this.errorData) {
      return new Error(
        `${this.errorData.childrenError![1]} is not a valid child for ${this.errorData.childrenError![0]}`,
      );
    } else if ('multipleRootElements' in this.errorData) {
      return new Error(
        `Root of a FireAgent machine can only be a single element, got ${this.errorData.multipleRootElements} instead`,
      );
    }
    return new Error('Unknown composition error');
  }
}
