import Sandbox from "@nyariv/sandboxjs";
import { ElementExecutionContextSerialized } from "../ElementExecutionContext";

type SandboxOptions = {
  timeLimit?: number;
  codeInReturn?: boolean; // whether to directly return the code in the return value
};

/**
 * 5.10 SCXML System Variables
 *
 * The SCXML Processor must maintain a protected portion of the data model containing information that can be useful to applications. We refer to the items in this special part of the data model as 'system variables'. Implementations must provide the following system variables, and may support others.
 *
 * _event. The SCXML Processor must use the variable '_event' to hold a structure containing the current event's name and any data contained in the event (see 5.10.1 The Internal Structure of Events. The exact nature of the structure depends on the data model being used. See B Data Models for details. The SCXML Processor must bind the _event variable when an event is pulled off the internal or external event queue to be processed, and must keep the variable bound to that event until another event is processed. (It follows that when an application is testing the 'cond' attribute of a <transition> element that contains an 'event' attribute, _event will be bound to the event that the transition is being matched against. If the transition is selected to be executed, _event will remain bound to that event in the <onexit> handlers of the states being exited, the executable content of the transition itself, and the <onentry> handlers of the states being entered. In the case of <transition> elements that do not contain an 'event' attribute and the <onexit> and <onentry> handlers of any states that are exited or entered by such transitions, the _event variable will not have a easily predictable value since the transition is not being driven by an event. In these cases, _event will be bound to the last event that was matched against a transition.) The SCXML Processor must not bind _event at initialization time until the first event is processed. Hence _event is unbound when the state machine starts up. If the data in the event is not a legal instance of the data model language, and the Processor cannot translate it into one, then the Processor must place the error 'error.execution' in the internal event queue at the point at which it attempts to bind _event. In this case, the Processor must leave the event data part of the _event structure unbound. (Note that the event's name will still be available, however and that processing of both the original event and the error event will proceed as usual.)
 * _sessionid. The SCXML Processor must bind the variable _sessionid at load time to the system-generated id for the current SCXML session. (This is of type NMTOKEN.) The Processor must keep the variable bound to this value until the session terminates.
 * _name. The SCXML Processor must bind the variable _name at load time to the value of the 'name' attribute of the <scxml> element. The Processor must keep the variable bound to this value until the session terminates.
 * _ioprocessors. The SCXML Processor must bind the variable _ioprocessors to a set of values, one for each Event I/O Processor that it supports. The syntax to access it depends on the data model. See B Data Models for details. The nature of the values associated with the individual Event I/O Processors depends on the Event I/O Processor in question. See C Event I/O Processors for details. The Processor must keep the variable bound to this set of values until the session terminates.
 * _x. The variable _x is the root element for platform-specific system variables. The Processor must place all platform-specific system variables underneath it. The exact structure of the platform-specific variables depends on the data model. For example, in the ECMAScript data model B.2 The ECMAScript Data Model, '_x' will be a top-level ECMAScript object and the platform-specific system variables will be its properties.
 * The set of system variables may be expanded in future versions of this specification. Variable names beginning with '_' are reserved for system use. A conformant SCXML document must not contain ids beginning with '_' in the <data> element. Platforms must place all platform-specific system variables under the '_x' root.
 */

export const sandboxedEval = (
  code: string,
  customSandbox: ElementExecutionContextSerialized,
  SandboxOptions: SandboxOptions = {}
): any => {
  const { codeInReturn = true } = SandboxOptions;
  const executionBlock = codeInReturn ? `return ${code.trim()}` : code.trim();
  const wrappedCode = `
  // ${Object.keys(customSandbox).join(", ")}
  ${Object.keys(customSandbox)
    .map((key) => {
      const isBuiltin = false; //RunStepContext.builtinKeys.includes(key as any);
      const declarator = isBuiltin ? "const" : "let";
      if (key.includes(".")) {
        const parts = key.split(".");
        return `${declarator} ${parts[0]} = __fw_api.${parts[0]} || {};`;
      }
      return `${declarator} ${key} = __fw_api.${key};`;
    })
    .join("\n")}
    
    ${executionBlock}
  `;

  // console.log('========== wrappedCode', wrappedCode);

  const sandboxjs = new Sandbox();

  let returnedValue: any;
  try {
    const exec = sandboxjs.compile(wrappedCode);
    returnedValue = exec({
      __fw_api: JSON.parse(
        JSON.stringify(customSandbox, function (k, v) {
          return v === undefined ? null : v;
        })
      ),
    }).run();
    // console.log('returnedValue', returnedValue);
  } catch (error: any) {
    // console.error(error);
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
