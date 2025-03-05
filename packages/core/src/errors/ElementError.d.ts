import { BaseError } from './BaseError';
/**
 * Errors that are due to invalid element definitions.
 */
export declare class ElementError extends BaseError {
    elementName: string;
    constructor(internalMessage: string, elementName: string);
    asUserError(): Error;
}
//# sourceMappingURL=ElementError.d.ts.map