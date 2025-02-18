import { arrayIncludes } from "./utils";
import { voidTags } from "./tags";
import { ElementNode, FormattedNode, PositionRange, StackNode } from "./types";

export interface ValidationNode extends FormattedNode {
  errors?: ValidationError[];
  tagValue?: string;
}

export interface ValidationError {
  message: string;
  value: string;
  position?: PositionRange;
}

export interface ValidationOptions {
  rules?: ValidationRule[];
}

export type ValidationRule = (node: ValidationNode) => string | undefined;

function getValue({ type, content, tagValue }: ValidationNode): string {
  if (type === "text") {
    return content || "";
  }
  if (type === "comment") {
    return `<!--${content}-->`;
  }
  return tagValue || "";
}

function verifyVoidTags({
  type,
  tagName,
  tagValue,
}: ValidationNode): string | undefined {
  if (type !== "element") return;
  const value = tagValue?.trim() || "";
  if (
    tagName &&
    arrayIncludes(voidTags, tagName.toLowerCase()) &&
    value[value.length - 2] !== "/"
  ) {
    return `Missing closing "/>" on "${type}". ${value}`;
  }
}

const defaultRules: ValidationRule[] = [verifyVoidTags];

export function validator(
  tree: (ElementNode | ValidationNode | StackNode)[],
  options: ValidationOptions = {}
): ValidationError[] {
  const allErrors: ValidationError[] = [];
  const { rules = defaultRules } = options;

  tree.forEach((node) => {
    const validationNode = node as ValidationNode;
    const { type, tagName = "", children, position } = validationNode;

    if (!validationNode.tagValue) {
      validationNode.tagValue = getValue(validationNode);
    }
    if (!validationNode.tagName) {
      validationNode.tagName = "";
    }

    /* Run verification rules */
    const errorsFound = rules
      .map((execRule) => execRule(validationNode))
      .filter((error): error is string => error !== undefined);

    function addError(err: string): void {
      if (!validationNode.errors) validationNode.errors = [];
      const error: ValidationError = {
        message: err,
        value: validationNode.tagValue || "",
        position,
      };
      validationNode.errors.push(error);
      allErrors.push(error);
    }

    if (errorsFound.length) {
      errorsFound.forEach(addError);
    }

    if (children && children.length) {
      const childErrors = validator(
        children as (ElementNode | ValidationNode)[],
        options
      );
      allErrors.push(...childErrors);
    }
  });

  return allErrors;
}

export { defaultRules };
