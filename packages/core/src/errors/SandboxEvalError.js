import { BaseError } from './BaseError';
/**
 * Errors that are due to internal implementations.
 */
export class SandboxEvalError extends BaseError {
    options;
    constructor(internalMessage, options = null) {
        super(internalMessage, 'SandboxEvalError');
        this.options = options;
    }
    asUserError() {
        return new Error(this.message);
    }
}
//# sourceMappingURL=SandboxEvalError.js.map