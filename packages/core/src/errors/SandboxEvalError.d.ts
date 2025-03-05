import { BaseError } from './BaseError';
/**
 * Errors that are due to internal implementations.
 */
export declare class SandboxEvalError extends BaseError {
    options: {} | null;
    constructor(internalMessage: string, options?: {} | null);
    asUserError(): Error;
}
//# sourceMappingURL=SandboxEvalError.d.ts.map