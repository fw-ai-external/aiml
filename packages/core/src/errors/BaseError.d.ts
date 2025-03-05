/**
 * Base class for all fire-agent-engine errors. It masks the error messages in
 * the base Error class, but can log to the right place for debugging.
 */
export declare class BaseError extends Error {
    stack: string;
    internalMessage: string;
    constructor(internalMessage: string, name?: string);
    asUserError(): Error;
    log(): void;
}
//# sourceMappingURL=BaseError.d.ts.map