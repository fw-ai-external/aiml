import { BaseError } from './BaseError';
/**
 * Errors that are due to invalid element compositions
 */
export class CompositionError extends BaseError {
    errorData;
    constructor(internalMessage, errorData) {
        super(internalMessage, 'CompositionError');
        this.errorData = errorData;
    }
    asUserError() {
        if ('childrenError' in this.errorData) {
            return new Error(`${this.errorData.childrenError[1]} is not a valid child for ${this.errorData.childrenError[0]}`);
        }
        else if ('multipleRootElements' in this.errorData) {
            return new Error(`Root of a FireAgent machine can only be a single element, got ${this.errorData.multipleRootElements} instead`);
        }
        return new Error('Unknown composition error');
    }
}
//# sourceMappingURL=CompositionError.js.map