import { BaseError } from './BaseError';
/**
 * Errors that are due to invalid element definitions.
 */
export class ElementError extends BaseError {
    elementName;
    constructor(internalMessage, elementName) {
        super(internalMessage, 'ElementError');
        this.elementName = elementName;
    }
    asUserError() {
        return new Error(`${this.elementName} is not a valid element, because ${this.internalMessage}`);
    }
}
//# sourceMappingURL=ElementError.js.map