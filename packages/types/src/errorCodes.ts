/**
 * Error codes used throughout the application.
 */
export enum ErrorCode {
  /**
   * 401 - Invalid Authentication
   * Cause: Invalid Authentication
   * Solution: Ensure the correct API key and requesting organization are being used.
   */
  INVALID_AUTHENTICATION = 401, // Source: OpenAI API

  /**
   * 401 - Incorrect API key provided
   * Cause: The requesting API key is not correct.
   * Solution: Ensure the API key used is correct, clear your browser cache, or generate a new one.
   */
  INCORRECT_API_KEY = 401, // Source: OpenAI API

  /**
   * 401 - You must be a member of an organization to use the API
   * Cause: Your account is not part of an organization.
   * Solution: Contact us to get added to a new organization or ask your organization manager to invite you to an organization.
   */
  NOT_ORGANIZATION_MEMBER = 401, // Source: OpenAI API

  /**
   * 403 - Country, region, or territory not supported
   * Cause: You are accessing the API from an unsupported country, region, or territory.
   * Solution: Please see this page for more information.
   */
  UNSUPPORTED_REGION = 403, // Source: OpenAI API

  /**
   * 429 - Rate limit reached for requests
   * Cause: You are sending requests too quickly.
   * Solution: Pace your requests. Read the Rate limit guide.
   */
  RATE_LIMIT_REACHED = 429, // Source: OpenAI API

  /**
   * 429 - You exceeded your current quota, please check your plan and billing details
   * Cause: You have run out of credits or hit your maximum monthly spend.
   * Solution: Buy more credits or learn how to increase your limits.
   */
  QUOTA_EXCEEDED = 429, // Source: OpenAI API

  /**
   * 500 - The server had an error while processing your request
   * Cause: Issue on our servers.
   * Solution: Retry your request after a brief wait and contact us if the issue persists. Check the status page.
   */
  SERVER_ERROR = 500, // Source: OpenAI API

  /**
   * 503 - The engine is currently overloaded, please try again later
   * Cause: Our servers are experiencing high traffic.
   * Solution: Please retry your requests after a brief wait.
   */
  ENGINE_OVERLOADED = 503, // Source: OpenAI

  /**
   * 500 - Invalid Machine Step
   * Cause: The machine config is not valid.
   * Solution: Ensure the machine config is valid.
   */
  MACHINE_RUNTIME_ERROR = 500,

  /**
   * 500 - This action is not implemented
   * Cause: The action is not implemented.
   * Solution: Implement the action.
   */
  NOT_IMPLEMENTED = 500,
}
