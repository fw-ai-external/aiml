import Sandbox from "@nyariv/sandboxjs";
import {
  ElementExecutionContext,
  ElementExecutionContextSerialized,
} from "../ElementExecutionContext";

type SandboxOptions = {
  timeLimit?: number;
  codeInReturn?: boolean; // whether to directly return the code in the return value
};

export const sandboxedEval = async (
  code: string,
  context:
    | InstanceType<typeof ElementExecutionContext>
    | ElementExecutionContextSerialized,
  SandboxOptions: SandboxOptions = {}
): Promise<any> => {
  const { codeInReturn = true } = SandboxOptions;
  const executionBlock = codeInReturn ? `return ${code.trim()}` : code.trim();

  // Get serialized context that's safe to pass to the sandbox
  let serializedContext: Record<string, any>;

  if ("serialize" in context && typeof context.serialize === "function") {
    serializedContext = await context.serialize();
  } else {
    serializedContext = context as ElementExecutionContextSerialized;
  }

  // Build the list of variables to include in the sandbox
  // Include both built-in and custom properties
  const allKeys = [...Object.keys(serializedContext)];

  const wrappedCode = `
  ${allKeys
    .map((key) => {
      const declarator = "let";
      if (key.includes(".")) {
        const parts = key.split(".");
        return `${declarator} ${parts[0]} = __fw_api.${parts[0]} || {};`;
      }
      return `${declarator} ${key} = __fw_api.${key};`;
    })
    .join("\n")}
    
    ${executionBlock}
  `;

  const sandboxjs = new Sandbox();

  let returnedValue: any;
  try {
    const exec = sandboxjs.compile(wrappedCode);
    returnedValue = exec({
      __fw_api: serializedContext,
    }).run();
  } catch (error: any) {
    throw new Error(error.message + " " + wrappedCode, {
      cause: "sandboxed_eval_error",
    });
  }

  try {
    return returnedValue;
  } catch (e) {
    throw new Error(
      "Error returning value from sandboxed code, result of expression could not be evaluated as a string"
    );
  }
};
