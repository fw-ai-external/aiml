import { BaseError } from './BaseError';
/**
 * Errors that are due to internal implementations.
 */
export class RunStepError extends BaseError {
    constructor(internalMessage) {
        super(internalMessage, 'RunStepError');
    }
}
//# sourceMappingURL=RunStepError.js.map