import { logger } from "../utils/logger";
/**
 * Base class for all fire-agent-engine errors. It masks the error messages in
 * the base Error class, but can log to the right place for debugging.
 */
export class BaseError extends Error {
    stack;
    internalMessage;
    constructor(internalMessage, name = "BaseError") {
        super(internalMessage);
        this.name = name;
        this.internalMessage = internalMessage;
        Error.captureStackTrace(this, this.constructor);
    }
    asUserError() {
        return new Error(this.name);
    }
    log() {
        logger.error(this.name, this.internalMessage, this.stack);
    }
}
//# sourceMappingURL=BaseError.js.map