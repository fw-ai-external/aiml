import { type Diagnostic, DiagnosticSeverity } from "@fireworks/shared";
import type { Root } from "mdast";
import type { Processor } from "unified";
import { VFile } from "vfile";
import { aimlElements } from "@fireworks/shared";

/**
 * Parses MDX content recursively, handling missing closing tags and removing problematic lines
 * @param content The MDX content to parse
 * @param options Options including file path
 * @returns Object containing parsed nodes and diagnostics
 */
export async function parseWithRecursiveRecovery(
  content: string,
  options: {
    filePath: string;
    processor: Processor<Root, Root, Root, undefined, undefined>;
  }
): Promise<{
  ast: Root | null;
  diagnostics: Diagnostic[];
  file: VFile;
}> {
  // Initialize diagnostics array
  const diagnostics: Diagnostic[] = [];

  // Keep track of our content through each iteration
  let currentContent = content;

  // Track number of attempts to prevent infinite loops
  let attempts = 0;
  const MAX_ATTEMPTS = 100;
  let file = new VFile({ value: currentContent, path: options.filePath });

  // Keep attempting to parse until we succeed or hit max attempts
  while (attempts < MAX_ATTEMPTS) {
    attempts++;

    try {
      // Create a file instance
      file = new VFile({ value: currentContent, path: options.filePath });

      // Parse the content to get the AST
      const ast = options.processor.parse(file);

      // If we reach here, parsing succeeded
      console.log("Parsing succeeded, current content: ", currentContent);
      return { ast, diagnostics, file };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.log("Error parsing content: ", errorMessage);

      // Extract error position information if available
      let errorPosition = { line: 1, column: 1 };
      if (error instanceof Error && "loc" in error) {
        const loc = (error as any).loc;
        if (
          loc &&
          typeof loc.line === "number" &&
          typeof loc.column === "number"
        ) {
          errorPosition = { line: loc.line, column: loc.column };
        }
      }

      // Add to diagnostics
      diagnostics.push({
        message: errorMessage,
        severity: DiagnosticSeverity.Error,
        code: "AIML002",
        source: "aiml-parser",
        range: {
          start: { line: errorPosition.line, column: errorPosition.column },
          end: { line: errorPosition.line, column: errorPosition.column + 1 },
        },
      });

      // Check for unexpected closing tag errors
      const unexpectedClosingTagMatch = errorMessage.match(
        /Unexpected closing tag `<\/(\w+)>`/i
      );
      if (unexpectedClosingTagMatch) {
        const tagName = unexpectedClosingTagMatch[1];

        // Only process if this is a known AIML element
        if (aimlElements.includes(tagName as any)) {
          console.log(`Detected unexpected closing tag: </${tagName}>`);

          // Find and remove the unexpected closing tag
          const unexpectedTag = `</${tagName}>`;
          currentContent = currentContent.replace(unexpectedTag, "");

          console.log(
            `Removed unexpected closing tag </${tagName}> from content`
          );
          continue;
        } else {
          // Escape the tag as plain text
          currentContent = currentContent.replace(
            `</${tagName}>`,
            `\\</${tagName}\\>`
          );
          console.log(
            `Escaped non-AIML closing tag </${tagName}> as plain text`
          );
          continue;
        }
      }

      // Check if the error involves a missing closing tag
      const closingTagMatch = errorMessage.match(/closing tag for `<(\w+)>`/i);
      // Check for unexpected end of file errors related to unclosed tags
      const unclosedTagMatch = errorMessage.match(
        /Unexpected end of file.*or the end of the tag/i
      );
      if (unclosedTagMatch) {
        console.log("Detected unclosed tag, appending '>' to content");
        // Find the line with unclosed tag (containing '</' without a following '>')
        const contentLines = currentContent.split("\n");
        let fixedContent = false;

        for (let i = 0; i < contentLines.length; i++) {
          const line = contentLines[i];
          // Look for a '</' that isn't followed by a '>' before another '<'
          const match = line.match(/(<\/[a-zA-Z0-9]*(?!\>)(?=[^<]*$))/);
          if (match) {
            // Trim the line and append '>' to it
            contentLines[i] = line.trim() + ">";
            fixedContent = true;
            break;
          }
        }

        if (fixedContent) {
          currentContent = contentLines.join("\n");
        } else {
          // Fallback if we can't locate the line
          currentContent += ">";
        }
        console.log("Appended missing '>' to the offending line");
        continue;
      }

      if (closingTagMatch) {
        // Extract the tag name from the error message
        const tagName = closingTagMatch[1];

        // Only process if this is a known AIML element
        if (aimlElements.includes(tagName as any)) {
          console.log(`Detected missing closing tag: </${tagName}>`);

          // Append the missing closing tag to the content
          currentContent += `\n</${tagName}>`;

          // Log the recovery action
          console.log(`Appended missing tag </${tagName}> to content`);
        } else {
          // Escape the opening tag as plain text
          const openingTag = new RegExp(`<${tagName}(\\s[^>]*)?>`);
          currentContent = currentContent.replace(openingTag, (match) =>
            match.replace(/</g, "\\<").replace(/>/g, "\\>")
          );
          console.log(`Escaped non-AIML tag <${tagName}> as plain text`);
        }
        continue;
      } else {
        // Check if the error mentions a tag
        const tagMentionMatch = errorMessage.includes(" tag ");

        const contentLines = currentContent.split("\n");
        if (errorPosition.line <= contentLines.length) {
          if (tagMentionMatch) {
            // Escape < and > on the offending line for any non-AIML tags
            const line = contentLines[errorPosition.line - 1];
            const tagMatch = line.match(/<(\w+)/);

            if (tagMatch && !aimlElements.includes(tagMatch[1] as any)) {
              console.log("Escaping non-AIML tag on line: " + line);
              contentLines[errorPosition.line - 1] = line
                .trimEnd()
                .replace(/</g, "\\<")
                .replace(/>/g, "\\>");
            }
          } else {
            // If it's not a tag-related error, replace the offending line with a newline
            contentLines[errorPosition.line - 1] = "";
          }
          currentContent = contentLines.join("\n");
          console.log(
            "Recovered from error, current content: ",
            currentContent
          );
        } else {
          console.log("No line found to recover from");
          // If we can't locate the line, we can't continue
          break;
        }
      }
    }
  }

  // If we exit the loop without returning, parsing failed despite our attempts
  console.error(`Failed to parse MDX after ${attempts} attempts`);
  return { ast: null, diagnostics, file };
}
