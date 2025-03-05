import { BaseError } from './BaseError';
type CompositionErrorData = {
    childrenError?: [parent: string, child: string];
    multipleRootElements?: number;
};
/**
 * Errors that are due to invalid element compositions
 */
export declare class CompositionError extends BaseError {
    errorData: CompositionErrorData;
    constructor(internalMessage: string, errorData: CompositionErrorData);
    asUserError(): Error;
}
export {};
//# sourceMappingURL=CompositionError.d.ts.map