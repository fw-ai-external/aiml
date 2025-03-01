// import { createAimlServicePlugin } from "./service-plugin";

import { visitParents } from "unist-util-visit-parents";
import { URI } from "vscode-uri";
import { getNodeEndOffset, getNodeStartOffset } from "./mdast-utils";
import { VirtualAimlCode } from "./virtual-code";

// Import types based on JSDoc comments
import type {
  LanguageServiceContext,
  Range,
  TextEdit,
} from "@volar/language-service";
import type { Node } from "unist";
import { Nodes } from "mdast";
import { Root } from "mdast";

// Define specific node types we need for our implementation
interface TextNode extends Node {
  type: "text";
  value: string;
}

interface ParentNode extends Node {
  type: string;
  children: Node[];
}

// Use the Mdast namespace types
type MdastNodes = Node[];
type MdastRoot = Root;

// Define the Options interface for createAimlServicePlugin
namespace createAimlServicePlugin {
  export interface Options {
    applyEdit: (edit: {
      changes: Record<string, TextEdit[]>;
    }) => Promise<unknown>;
  }
}

/**
 * Toggle prose syntax based on the AST.
 *
 * @param {LanguageServiceContext} context
 *   The Volar service context.
 * @param {createAimlServicePlugin.Options} options
 *   The options to use for applying workspace edits.
 * @param {string} type
 *   The type of the mdast node to toggle.
 * @param {string} separator
 *   The mdast node separator to insert.
 * @param {string} uri
 *   The URI of the document the request is for.
 * @param {Range} range
 *   The range that is selected by the user.
 * @returns {Promise<undefined>}
 */
export async function toggleSyntax(
  context: LanguageServiceContext,
  options: createAimlServicePlugin.Options,
  type: string,
  separator: string,
  uri: string,
  range: Range
) {
  const parsedUri = URI.parse(uri);
  const sourceScript = context.language.scripts.get(parsedUri);
  const root = sourceScript?.generated?.root;

  if (!(root instanceof VirtualAimlCode)) {
    return;
  }

  // Use a type assertion to handle the incompatible AST structure
  const ast = root.ast as unknown as MdastRoot;

  if (!ast) {
    return;
  }

  // Assuming the VirtualMdxCode type has languageId but not snapshot
  // We'll use a type assertion to access snapshot property
  const doc = context.documents.get(
    parsedUri,
    root.languageId,
    (root as any).snapshot
  );
  const selectionStart = doc.offsetAt(range.start);
  const selectionEnd = doc.offsetAt(range.end);

  const edits: TextEdit[] = [];

  // Use type assertion to make visitParents accept our AST structure
  visitParents(
    ast as unknown as Node,
    "text",
    (node: TextNode, ancestors: Node[]) => {
      const nodeStart = getNodeStartOffset(node as unknown as Nodes);
      const nodeEnd = getNodeEndOffset(node as unknown as Nodes);

      if (selectionStart < nodeStart) {
        // Outside of this node
        return;
      }

      if (selectionEnd > nodeEnd) {
        // Outside of this node
        return;
      }

      // Find ancestor with matching type
      const matchingAncestor = ancestors.find(
        (ancestor) => ancestor.type === type
      );

      if (matchingAncestor) {
        // Cast to ParentNode for type safety
        const ancestorWithChildren = matchingAncestor as ParentNode;
        const ancestorStart = getNodeStartOffset(
          ancestorWithChildren as unknown as Nodes
        );
        const ancestorEnd = getNodeEndOffset(
          ancestorWithChildren as unknown as Nodes
        );

        // Ensure we have children before accessing them
        if (
          ancestorWithChildren.children &&
          ancestorWithChildren.children.length > 0
        ) {
          const firstChildStart = getNodeStartOffset(
            ancestorWithChildren.children[0] as unknown as Nodes
          );
          const lastChild =
            ancestorWithChildren.children[
              ancestorWithChildren.children.length - 1
            ];
          const lastChildEnd = getNodeEndOffset(lastChild as unknown as Nodes);

          edits.push(
            {
              newText: "",
              range: {
                start: doc.positionAt(ancestorStart),
                end: doc.positionAt(firstChildStart),
              },
            },
            {
              newText: "",
              range: {
                start: doc.positionAt(lastChildEnd),
                end: doc.positionAt(ancestorEnd),
              },
            }
          );
        }
      } else {
        const valueOffset = getNodeStartOffset(node as unknown as Nodes);
        let insertStart = valueOffset;
        let insertEnd = getNodeEndOffset(node as unknown as Nodes);

        for (const match of node.value.matchAll(/\b/g)) {
          if (match.index === undefined) {
            continue;
          }

          const matchOffset = valueOffset + match.index;

          if (matchOffset <= selectionStart) {
            insertStart = matchOffset;
            continue;
          }

          if (matchOffset >= selectionEnd) {
            insertEnd = matchOffset;
            break;
          }
        }

        const startPosition = doc.positionAt(insertStart);
        const endPosition = doc.positionAt(insertEnd);
        edits.push(
          {
            newText: separator,
            range: { start: startPosition, end: startPosition },
          },
          {
            newText: separator,
            range: { start: endPosition, end: endPosition },
          }
        );
      }
    }
  );

  if (edits.length > 0) {
    await options.applyEdit({ changes: { [uri]: edits } });
  }
}
