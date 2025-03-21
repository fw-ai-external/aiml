/**
 * Safely evaluates an expression in the context of a datamodel
 *
 * @param expression JavaScript expression to evaluate
 * @param variables Variables to make available in the expression context
 * @returns The result of evaluating the expression
 * @throws Error if evaluation fails
 */
export function evaluateExpression(expression: string, variables: Record<string, any>): any {
  try {
    // Create a function with the variables as parameters
    const fn = new Function(...Object.keys(variables), `return ${expression}`);

    // Call the function with the variable values
    return fn(...Object.values(variables));
  } catch (error) {
    console.error(`Error evaluating expression ${expression}:`, error);
    throw error instanceof Error ? error : new Error(`Failed to evaluate expression: ${expression}`);
  }
}

/**
 * Extracts a value from an input StepValue
 *
 * @param inputValue The input value, possibly a StepValue
 * @returns The extracted value
 */
export function extractValueFromInput(inputValue: any): any {
  // If the input is a StepValue-like object, extract the text
  if (typeof inputValue === 'object' && inputValue !== null && 'text' in inputValue) {
    return inputValue.text;
  }

  return inputValue;
}
