import { parseGlassBlocks } from "@workflow/prompt-lang";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver";
import { TextDocument } from "vscode-languageserver-textdocument";
import { glassElements } from "../elements";

export function findEmptyBlocksDiagnostics(
  textDocument: TextDocument
): Diagnostic[] {
  const parsed = parseGlassBlocks(textDocument.getText());
  const tagsToCheck = glassElements.map((e) => e.name);
  const emptyTags = parsed.filter(
    (tag) => tagsToCheck.includes(tag.tag || "") && tag.child?.content === ""
  );
  return emptyTags.map((tag) => {
    const diagnostic: Diagnostic = {
      severity: DiagnosticSeverity.Warning,
      range: {
        start: textDocument.positionAt(tag.position.start.offset),
        end: textDocument.positionAt(tag.position.end.offset),
      },
      message: `Empty <${tag.tag}> tag.`,
      source: "promptfile",
    };

    return diagnostic;
  });
}
