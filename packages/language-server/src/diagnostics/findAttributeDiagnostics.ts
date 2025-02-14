import { parseGlassBlocks } from "@workflow/prompt-lang";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { glassElements } from "../elements";

export function findAttributeDiagnostics(
  textDocument: TextDocument
): Diagnostic[] {
  const parsed = parseGlassBlocks(textDocument.getText());
  const invalidAttributes: { type: string; tag: any; attribute: string }[] = [];
  for (const tag of parsed) {
    const existingAttributes = tag.attrs ?? [];
    const glassElement = glassElements.find(
      (element) => element.name === tag.tag
    );
    const validAttributes = glassElement?.attributes ?? [];
    const missingRequiredAttributes = validAttributes.filter(
      (attribute) =>
        attribute.optional !== true &&
        !existingAttributes.some(
          (existingAttribute: any) => existingAttribute.name === attribute.name
        )
    );
    invalidAttributes.push(
      ...missingRequiredAttributes.map((attribute) => ({
        tag,
        attribute: attribute.name,
        type: "missing",
      }))
    );
    const analyzedAttributes: string[] = [];
    for (const attribute of existingAttributes) {
      const validAttribute = validAttributes.find(
        (validAttribute) => validAttribute.name === attribute.name
      );
      if (validAttribute) {
        if (
          validAttribute.values &&
          !validAttribute.values.some((a) => a.name === attribute.stringValue)
        ) {
          invalidAttributes.push({
            tag,
            attribute: attribute.name,
            type: "invalid",
          });
        }
        if (analyzedAttributes.includes(attribute.name)) {
          invalidAttributes.push({
            tag,
            attribute: attribute.name,
            type: "duplicate",
          });
        }
        analyzedAttributes.push(attribute.name);
      } else {
        invalidAttributes.push({
          tag,
          attribute: attribute.name,
          type: "unknown",
        });
      }
    }
  }
  return invalidAttributes.map((item) => {
    const diagnostic: Diagnostic = {
      severity: DiagnosticSeverity.Error,
      range: {
        start: textDocument.positionAt(item.tag.position.start.offset),
        end: textDocument.positionAt(item.tag.position.end.offset),
      },
      message:
        item.type === "duplicate"
          ? `Duplicate attribute: "${item.attribute}"`
          : item.type === "unknown"
            ? `Unknown "${item.attribute}" attribute`
            : item.type === "invalid"
              ? `Invalid value for attribute "${item.attribute}"`
              : `Missing attribute: "${item.attribute}"`,
      source: "promptfile",
    };
    return diagnostic;
  });
}
