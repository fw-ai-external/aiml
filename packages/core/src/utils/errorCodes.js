export var ErrorCode;
(function (ErrorCode) {
    /**
     * 401 - Invalid Authentication
     * Cause: Invalid Authentication
     * Solution: Ensure the correct API key and requesting organization are being used.
     */
    ErrorCode[ErrorCode["INVALID_AUTHENTICATION"] = 401] = "INVALID_AUTHENTICATION";
    /**
     * 401 - Incorrect API key provided
     * Cause: The requesting API key is not correct.
     * Solution: Ensure the API key used is correct, clear your browser cache, or generate a new one.
     */
    ErrorCode[ErrorCode["INCORRECT_API_KEY"] = 401] = "INCORRECT_API_KEY";
    /**
     * 401 - You must be a member of an organization to use the API
     * Cause: Your account is not part of an organization.
     * Solution: Contact us to get added to a new organization or ask your organization manager to invite you to an organization.
     */
    ErrorCode[ErrorCode["NOT_ORGANIZATION_MEMBER"] = 401] = "NOT_ORGANIZATION_MEMBER";
    /**
     * 403 - Country, region, or territory not supported
     * Cause: You are accessing the API from an unsupported country, region, or territory.
     * Solution: Please see this page for more information.
     */
    ErrorCode[ErrorCode["UNSUPPORTED_REGION"] = 403] = "UNSUPPORTED_REGION";
    /**
     * 429 - Rate limit reached for requests
     * Cause: You are sending requests too quickly.
     * Solution: Pace your requests. Read the Rate limit guide.
     */
    ErrorCode[ErrorCode["RATE_LIMIT_REACHED"] = 429] = "RATE_LIMIT_REACHED";
    /**
     * 429 - You exceeded your current quota, please check your plan and billing details
     * Cause: You have run out of credits or hit your maximum monthly spend.
     * Solution: Buy more credits or learn how to increase your limits.
     */
    ErrorCode[ErrorCode["QUOTA_EXCEEDED"] = 429] = "QUOTA_EXCEEDED";
    /**
     * 500 - The server had an error while processing your request
     * Cause: Issue on our servers.
     * Solution: Retry your request after a brief wait and contact us if the issue persists. Check the status page.
     */
    ErrorCode[ErrorCode["SERVER_ERROR"] = 500] = "SERVER_ERROR";
    /**
     * 503 - The engine is currently overloaded, please try again later
     * Cause: Our servers are experiencing high traffic.
     * Solution: Please retry your requests after a brief wait.
     */
    ErrorCode[ErrorCode["ENGINE_OVERLOADED"] = 503] = "ENGINE_OVERLOADED";
    /**
     * 500 - Invalid Machine Step
     * Cause: The machine config is not valid.
     * Solution: Ensure the machine config is valid.
     */
    ErrorCode[ErrorCode["MACHINE_RUNTIME_ERROR"] = 500] = "MACHINE_RUNTIME_ERROR";
    /**
     * 500 - This action is not implemented
     * Cause: The action is not implemented.
     * Solution: Implement the action.
     */
    ErrorCode[ErrorCode["NOT_IMPLEMENTED"] = 500] = "NOT_IMPLEMENTED";
})(ErrorCode || (ErrorCode = {}));
//# sourceMappingURL=errorCodes.js.map