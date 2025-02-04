import { BaseError } from './BaseError';

/**
 * Errors that are due to invalid element definitions.
 */
export class ElementError extends BaseError {
  elementName: string;
  constructor(internalMessage: string, elementName: string) {
    super(internalMessage, 'ElementError');
    this.elementName = elementName;
  }

  asUserError(): Error {
    return new Error(`${this.elementName} is not a valid element, because ${this.internalMessage}`);
  }
}
