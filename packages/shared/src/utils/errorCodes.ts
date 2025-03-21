/**
 * Error codes for the runtime
 */
export enum ErrorCode {
  // General errors
  UNKNOWN_ERROR = 'unknown_error',
  INVALID_INPUT = 'invalid_input',
  INVALID_STATE = 'invalid_state',

  // Server errors
  SERVER_ERROR = 'server_error',
  TIMEOUT = 'timeout',
  RATE_LIMIT = 'rate_limit',

  // Workflow errors
  WORKFLOW_NOT_FOUND = 'workflow_not_found',
  WORKFLOW_EXECUTION_ERROR = 'workflow_execution_error',

  // Element errors
  ELEMENT_NOT_FOUND = 'element_not_found',
  ELEMENT_EXECUTION_ERROR = 'element_execution_error',

  // Data errors
  DATA_NOT_FOUND = 'data_not_found',
  DATA_VALIDATION_ERROR = 'data_validation_error',

  // Tool errors
  TOOL_NOT_FOUND = 'tool_not_found',
  TOOL_EXECUTION_ERROR = 'tool_execution_error',
}
