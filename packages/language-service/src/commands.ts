/**
 * @import {LanguageServiceContext, Range, TextEdit} from '@volar/language-service'
 * @import {createMdxServicePlugin} from '../lib/service-plugin.js'
 */

import { visitParents } from "unist-util-visit-parents";
import { URI } from "vscode-uri";
import { getNodeEndOffset, getNodeStartOffset } from "./mdast-utils";
import { VirtualMdxCode } from "./virtual-code";

// Import types based on JSDoc comments
import type {
  LanguageServiceContext,
  Range,
  TextEdit,
  WorkspaceEdit,
} from "@volar/language-service";
import type { Node, Position } from "unist";

// Define Mdast namespace with the same structure as in virtual-code.ts
// But ensure it's compatible with unist's Position and Point types
declare namespace Mdast {
  interface Root {
    type: string;
    children: Nodes[];
    position?: Position;
    [key: string]: any;
  }

  interface Nodes {
    type: string;
    position?: Position;
    children?: Nodes[];
    [key: string]: any;
  }
}

// Define specific node types we need for our implementation
interface TextNode extends Node {
  type: "text";
  value: string;
}

// Use the Mdast namespace types
type MdastNodes = Mdast.Nodes;
type MdastRoot = Mdast.Root;

/**
 * Toggle prose syntax based on the AST.
 *
 * @param {LanguageServiceContext} context
 *   The Volar service context.
 * @param {createMdxServicePlugin.Options} options
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
  options: { applyEdit: (edit: WorkspaceEdit) => PromiseLike<unknown> },
  type: string,
  separator: string,
  uri: string,
  range: Range
) {
  const parsedUri = URI.parse(uri);
  const sourceScript = context.language.scripts.get(parsedUri);
  const root = sourceScript?.generated?.root;

  if (!(root instanceof VirtualMdxCode)) {
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
    (node: any, ancestors: any[]) => {
      // Cast node to MdastNodes for getNodeStartOffset and getNodeEndOffset
      const typedNode = node as MdastNodes;
      const nodeStart = getNodeStartOffset(typedNode);
      const nodeEnd = getNodeEndOffset(typedNode);

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
        // Cast to MdastNodes for type safety
        const ancestorWithChildren = matchingAncestor as MdastNodes;
        const ancestorStart = getNodeStartOffset(ancestorWithChildren);
        const ancestorEnd = getNodeEndOffset(ancestorWithChildren);

        // Ensure we have children before accessing them
        if (
          ancestorWithChildren.children &&
          ancestorWithChildren.children.length > 0
        ) {
          const firstChildStart = getNodeStartOffset(
            ancestorWithChildren.children[0]
          );
          const lastChild =
            ancestorWithChildren.children[
              ancestorWithChildren.children.length - 1
            ];
          const lastChildEnd = getNodeEndOffset(lastChild);

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
        const valueOffset = getNodeStartOffset(typedNode);
        let insertStart = valueOffset;
        let insertEnd = getNodeEndOffset(typedNode);

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
