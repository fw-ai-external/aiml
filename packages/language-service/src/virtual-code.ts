/**
 * @import {CodeMapping, VirtualCode} from '@volar/language-service'
 * @import {ExportDefaultDeclaration, JSXClosingElement, JSXOpeningElement, Node, Program} from 'estree-jsx'
 * @import {Scope} from 'estree-util-scope'
 * @import {Nodes, Root} from 'mdast'
 * @import {AimljsEsm} from 'mdast-util-aimljs-esm'
 * @import {IScriptSnapshot} from 'typescript'
 * @import {Processor} from 'unified'
 * @import {VFileMessage} from 'vfile-message'
 */

import { createVisitors } from "estree-util-scope";
import { walk } from "estree-walker";
import { getNodeEndOffset, getNodeStartOffset } from "./mdast-utils";
import { ScriptSnapshot } from "./script-snapshot";
import {
  isInjectableComponent,
  isInjectableEstree as originalIsInjectableEstree,
} from "./jsx-utils";

// Define comprehensive type declarations for imported types
// These will be used throughout the file to provide proper typing

// Volar language service types
declare namespace Volar {
  interface CodeMapping {
    sourceOffsets: number[];
    generatedOffsets: number[];
    lengths: number[];
    data?: {
      completion?: boolean;
      format?: boolean;
      navigation?: boolean;
      semantic?: boolean;
      structure?: boolean;
      verification?: boolean;
      [key: string]: any;
    };
  }

  interface VirtualCode {
    id: string;
    languageId: string;
    snapshot?: TypeScript.IScriptSnapshot;
    mappings: CodeMapping[];
    embeddedCodes: VirtualCode[];
    error?: VFileMessage | null;
    [key: string]: any;
  }
}

// Markdown Abstract Syntax Tree types
declare namespace Mdast {
  interface Root {
    type: string;
    children: Nodes[];
    position?: {
      start?: { offset?: number; line: number; column: number };
      end?: { offset?: number; line: number; column: number };
    };
    [key: string]: any;
  }

  interface Nodes {
    type: string;
    position?: {
      start?: { offset?: number; line: number; column: number };
      end?: { offset?: number; line: number; column: number };
    };
    children?: Nodes[];
    [key: string]: any;
  }

  interface AIMLjsEsm {
    type: "aimljsEsm";
    value: string;
    data?: {
      estree?: EstreeJsx.Program;
    };
    position?: {
      start?: { offset?: number; line: number; column: number };
      end?: { offset?: number; line: number; column: number };
    };
    [key: string]: any;
  }
}

// ESTree JSX types
declare namespace EstreeJsx {
  interface Node {
    type: string;
    [key: string]: any;
  }

  interface Identifier extends Node {
    type: "Identifier";
    name: string;
  }

  interface Program extends Node {
    type: "Program";
    body: Node[];
    [key: string]: any;
  }

  interface JSXOpeningElement extends Node {
    type: "JSXOpeningElement";
    name: Node;
    attributes: any[];
    selfClosing: boolean;
    [key: string]: any;
  }

  interface JSXClosingElement extends Node {
    type: "JSXClosingElement";
    name: Node;
    [key: string]: any;
  }

  interface ExportDefaultDeclaration extends Node {
    type: "ExportDefaultDeclaration";
    declaration: {
      type: string;
      params?: any[];
      [key: string]: any;
    };
    [key: string]: any;
  }

  interface FunctionParameters {
    type: string;
    name?: string;
    [key: string]: any;
  }

  interface JSXIdentifier extends Node {
    type: "JSXIdentifier";
    name: string;
  }
}

// ESTree Scope types
declare namespace EstreeUtilScope {
  interface Scope {
    defined: string[];
    [key: string]: any;
  }
}

// TypeScript types
declare namespace TypeScript {
  interface IScriptSnapshot {
    getText(start: number, end: number): string;
    getLength(): number;
    getChangeRange(oldSnapshot: IScriptSnapshot): any;
  }
}

// Unified processor types
declare namespace Unified {
  interface Processor<T = any> {
    use: (plugin: any, ...options: any[]) => Processor<T>;
    freeze: () => Processor<T>;
    parse: (content: string) => T;
    [key: string]: any;
  }
}

// VFile message for errors
interface VFileMessage {
  message: string;
  source?: string;
  ruleId?: string;
  url?: string;
  place?: any;
  [key: string]: any;
}

// Define helper types for function parameters
interface ComponentStartParams {
  isAsync: boolean;
  scope?: EstreeUtilScope.Scope;
}

/**
 * Render the content that should be prefixed to the embedded JavaScript file.
 *
 * @param {boolean} tsCheck
 *   If true, insert a `@check-js` comment into the virtual JavaScript code.
 * @param {string} jsxImportSource
 *   The string to use for the JSX import source tag.
 */
const jsPrefix = (
  tsCheck: boolean,
  jsxImportSource: string
) => `${tsCheck ? "// @ts-check\n" : ""}/* @jsxRuntime automatic
@jsxImportSource ${jsxImportSource} */
`;

/**
 * @param {string} propsName
 */
const layoutJsDoc = (propsName: string) => `
/** @typedef {AIMLContentProps & { children: JSX.Element }} AIMLLayoutProps */

/**
 * There is one special component: [AIML layout](https://aimljs.com/docs/using-aiml/#layout).
 * If it is defined, it's used to wrap all content.
 * A layout can be defined from within AIML using a default export.
 *
 * @param {{readonly [K in keyof AIMLLayoutProps]: AIMLLayoutProps[K]}} ${propsName}
 *   The [props](https://aimljs.com/docs/using-aiml/#props) that have been passed to the AIML component.
 *   In addition, the AIML layout receives the \`children\` prop, which contains the rendered AIML content.
 * @returns {JSX.Element}
 *   The AIML content wrapped in the layout.
 */`;

/**
 * @param {boolean} isAsync
 *   Whether or not the `_createAimlContent` should be async
 * @param {Scope} [scope]
 */
const componentStart = (params: any) => `
/**
 * @internal
 *   **Do not use.** This function is generated by AIML for internal use.
 *
 * @param {{readonly [K in keyof AIMLContentProps]: AIMLContentProps[K]}} props
 *   The [props](https://aimljs.com/docs/using-aiml/#props) that have been passed to the AIML component.
 */
${params.isAsync ? "async " : ""}function _createAimlContent(props) {
  /**
   * @internal
   *   **Do not use.** This variable is generated by AIML for internal use.
   */
  const _components = {
    // @ts-ignore
    .../** @type {0 extends 1 & AIMLProvidedComponents ? {} : AIMLProvidedComponents} */ ({}),
    ...props.components,
    /** The [props](https://aimljs.com/docs/using-aiml/#props) that have been passed to the AIML component. */
    props${
      params.scope?.defined
        .map(
          (name: string) => ",\n    /** {@link " + name + "} */\n    " + name
        )
        .join("") ?? ""
    }
  }
  _components
  return <>`;

const componentEnd = `
  </>
}

/**
 * Render the AIML contents.
 *
 * @param {{readonly [K in keyof AIMLContentProps]: AIMLContentProps[K]}} props
 *   The [props](https://aimljs.com/docs/using-aiml/#props) that have been passed to the AIML component.
 */
export default function AIMLContent(props) {
  return <_createAimlContent {...props} />
}

// @ts-ignore
/** @typedef {(void extends Props ? {} : Props) & {components?: {}}} AIMLContentProps */
`;

const jsxIndent = "\n    ";

const fallback =
  jsPrefix(false, "react") + componentStart({ isAsync: false }) + componentEnd;

// Create a typed wrapper around isInjectableEstree to match our specific types
function isInjectableEstree(
  name: EstreeJsx.JSXIdentifier,
  scopes: Map<EstreeJsx.Node, EstreeUtilScope.Scope | undefined>,
  parents: Map<EstreeJsx.Node, EstreeJsx.Node | null>
): boolean {
  return originalIsInjectableEstree(name, scopes as any, parents as any);
}

/**
 * Visit an mdast tree with and enter and exit callback.
 *
 * @param {Nodes} node
 *   The mdast tree to visit.
 * @param {(node: Nodes) => undefined} onEnter
 *   The callback caled when entering a node.
 * @param {(node: Nodes) => undefined} onExit
 *   The callback caled when exiting a node.
 */
function visit(
  node: any,
  onEnter: (node: any) => void,
  onExit: (node: any) => void
) {
  onEnter(node);
  if ("children" in node && Array.isArray(node.children)) {
    for (const child of node.children) {
      visit(child, onEnter, onExit);
    }
  }

  onExit(node);
}

/**
 * Generate mapped virtual content based on a source string and start and end offsets.
 *
 * @param {CodeMapping} mapping
 *   The Volar mapping to append the offsets to.
 * @param {string} source
 *   The original source code.
 * @param {string} generated
 *   The generated content so far.
 * @param {number} startOffset
 *   The start offset in the original source code.
 * @param {number} endOffset
 *   The end offset in the original source code.
 * @param {boolean} [includeNewline]
 *  If true, and the source range is followed directly by a newline, extend the
 *  end offset to include that newline.
 * @returns {string}
 *   The updated generated content.
 */
function addOffset(
  mapping: any,
  source: string,
  generated: string,
  startOffset: number,
  endOffset: number,
  includeNewline?: boolean
) {
  if (startOffset === endOffset) {
    return generated;
  }

  if (includeNewline) {
    const LF = 10;
    const CR = 13;
    // eslint-disable-next-line unicorn/prefer-code-point
    const charCode = source.charCodeAt(endOffset);
    if (charCode === LF) {
      endOffset += 1;
    }
    // eslint-disable-next-line unicorn/prefer-code-point
    else if (charCode === CR && source.charCodeAt(endOffset + 1) === LF) {
      endOffset += 2;
    }
  }

  const length = endOffset - startOffset;
  const previousSourceOffset = mapping.sourceOffsets.at(-1);
  const previousGeneratedOffset = mapping.generatedOffsets.at(-1);
  const previousLength = mapping.lengths.at(-1);
  if (
    previousSourceOffset !== undefined &&
    previousGeneratedOffset !== undefined &&
    previousLength !== undefined &&
    previousSourceOffset + previousLength === startOffset &&
    previousGeneratedOffset + previousLength === generated.length
  ) {
    mapping.lengths[mapping.lengths.length - 1] += length;
  } else {
    mapping.sourceOffsets.push(startOffset);
    mapping.generatedOffsets.push(generated.length);
    mapping.lengths.push(length);
  }

  return generated + source.slice(startOffset, endOffset);
}

/**
 * @param {ExportDefaultDeclaration} node
 */
function getPropsName(node: any): string | undefined {
  const declaration = node.declaration;

  if (!declaration || !declaration.type) {
    return undefined;
  }

  const { type } = declaration;

  if (
    type !== "ArrowFunctionExpression" &&
    type !== "FunctionDeclaration" &&
    type !== "FunctionExpression"
  ) {
    return undefined;
  }

  if (declaration.params && declaration.params.length === 1) {
    const parameter = declaration.params[0];
    if (parameter.type === "Identifier") {
      return parameter.name;
    }
  }

  return "props";
}

/**
 * Process exports of an AIML ESM node.
 *
 * @param {string} aiml
 *   The full AIML code to process.
 * @param {AimljsEsm} node
 *   The AIML ESM node to process.
 * @param {CodeMapping} mapping
 *   The Volar mapping to add offsets to.
 * @param {string} esm
 *   The virtual ESM code up to the point this function was called.
 * @returns {string}
 *   The updated virtual ESM code.
 */
function processExports(
  aiml: string,
  node: any,
  mapping: any,
  esm: string
): string {
  const start = node.position?.start?.offset;
  const end = node.position?.end?.offset;

  if (start === undefined || end === undefined) {
    return esm;
  }

  const body = node.data?.estree?.body;

  if (!body?.length) {
    return addOffset(mapping, aiml, esm, start, end, true);
  }

  for (const child of body) {
    if (child.type === "ExportDefaultDeclaration") {
      const propsName = getPropsName(child);
      if (propsName) {
        esm += layoutJsDoc(propsName);
      }

      esm = addOffset(
        mapping,
        aiml,
        esm + "\nconst AIMLLayout = ",
        child.declaration.start,
        child.end,
        true
      );
      continue;
    }

    if (child.type === "ExportNamedDeclaration" && child.source) {
      const { specifiers } = child;
      for (let index = 0; index < specifiers.length; index++) {
        const specifier = specifiers[index];
        if (
          specifier.local.type === "Identifier"
            ? specifier.local.name === "default"
            : specifier.local.value === "default"
        ) {
          esm = addOffset(mapping, aiml, esm, start, specifier.start);
          const nextPosition =
            index === specifiers.length - 1
              ? specifier.end
              : aiml.indexOf(",", specifier.end) + 1;
          return (
            addOffset(mapping, aiml, esm, nextPosition, end, true) +
            "\nimport {" +
            (specifier.exported.type === "Identifier"
              ? specifier.exported.name
              : JSON.stringify(specifier.exported.value)) +
            " as AIMLLayout} from " +
            JSON.stringify(child.source.value) +
            "\n"
          );
        }
      }
    }

    esm = addOffset(mapping, aiml, esm, child.start, child.end, true);
  }

  return esm + "\n";
}

/**
 * @param {string} aiml
 * @param {Root} ast
 * @param {boolean} checkAiml
 * @param {string} jsxImportSource
 * @returns {VirtualCode[]}
 */
function getEmbeddedCodes(
  aiml: string,
  ast: any,
  checkAiml: boolean,
  jsxImportSource: string
): Volar.VirtualCode[] {
  /** @type {CodeMapping[]} */
  const jsMappings: Volar.CodeMapping[] = [];

  /**
   * The Volar mapping that maps all ESM syntax of the AIML file to the virtual JavaScript file.
   *
   * @type {CodeMapping}
   */
  const esmMapping: Volar.CodeMapping = {
    sourceOffsets: [] as number[],
    generatedOffsets: [] as number[],
    lengths: [] as number[],
    data: {
      completion: true,
      format: true,
      navigation: true,
      semantic: true,
      structure: true,
      verification: true,
    },
  };

  /**
   * The Volar mapping that maps all JSX syntax of the AIML file to the virtual JavaScript file.
   *
   * @type {CodeMapping}
   */
  const jsxMapping: Volar.CodeMapping = {
    sourceOffsets: [] as number[],
    generatedOffsets: [] as number[],
    lengths: [] as number[],
    data: {
      completion: true,
      format: false,
      navigation: true,
      semantic: true,
      structure: true,
      verification: true,
    },
  };

  /**
   * The Volar mapping that maps all markdown content to the virtual markdown file.
   *
   * @type {CodeMapping}
   */
  const markdownMapping: Volar.CodeMapping = {
    sourceOffsets: [] as number[],
    generatedOffsets: [] as number[],
    lengths: [] as number[],
    data: {
      completion: true,
      format: false,
      navigation: true,
      semantic: true,
      structure: true,
      verification: true,
    },
  };

  /** @type {VirtualCode[]} */
  const virtualCodes: Volar.VirtualCode[] = [];

  let hasAwait = false;
  let esm = jsPrefix(checkAiml, jsxImportSource);
  let jsx = "";
  let markdown = "";
  let nextMarkdownSourceStart = 0;

  const visitors = createVisitors();

  for (const child of ast.children) {
    if (child.type !== "aimljsEsm") {
      continue;
    }

    const estree = child.data?.estree;

    if (estree) {
      walk(estree, {
        enter(node) {
          visitors.enter(node);

          if (
            node.type === "ArrowFunctionExpression" ||
            node.type === "FunctionDeclaration" ||
            node.type === "FunctionExpression"
          ) {
            this.skip();
            visitors.exit(node);
          }
        },
        leave: visitors.exit,
      });
    }
  }

  const programScope = visitors.scopes[0];

  /**
   * Update the **markdown** mappings from a start and end offset of a **JavaScript** chunk.
   *
   * @param {number} startOffset
   *   The start offset of the JavaScript chunk.
   * @param {number} endOffset
   *   The end offset of the JavaScript chunk.
   */
  function updateMarkdownFromOffsets(startOffset: number, endOffset: number) {
    if (nextMarkdownSourceStart !== startOffset) {
      const slice = aiml.slice(nextMarkdownSourceStart, startOffset);
      for (const match of slice.matchAll(/^[\t ]*(.*\r?\n?)/gm)) {
        const [line, lineContent] = match;
        if (line.length === 0) {
          continue;
        }

        const lineEnd = nextMarkdownSourceStart + match.index + line.length;
        let lineStart = lineEnd - lineContent.length;
        if (
          match.index === 0 &&
          nextMarkdownSourceStart !== 0 &&
          aiml[lineStart - 1] !== "\n"
        ) {
          lineStart = nextMarkdownSourceStart + match.index;
        }

        markdown = addOffset(
          markdownMapping,
          aiml,
          markdown,
          lineStart,
          lineEnd
        );
      }

      if (startOffset !== endOffset) {
        markdown += "<!---->";
      }
    }

    nextMarkdownSourceStart = endOffset;
  }

  /**
   * Update the **markdown** mappings from a start and end offset of a **JavaScript** node.
   *
   * @param {Nodes} node
   *   The JavaScript node.
   */
  function updateMarkdownFromNode(node: any) {
    const startOffset = getNodeStartOffset(node);
    const endOffset = getNodeEndOffset(node);

    updateMarkdownFromOffsets(startOffset, endOffset);
  }

  /**
   * @param {EstreeJsx.Program} program
   * @param {number} lastIndex
   * @returns {number}
   */
  function processJsxExpression(program: EstreeJsx.Program, lastIndex: number) {
    /** @type {Map<EstreeJsx.Node, EstreeUtilScope.Scope | undefined>} */
    const localScopes = new Map<
      EstreeJsx.Node,
      EstreeUtilScope.Scope | undefined
    >();
    /** @type {Map<EstreeJsx.Node, EstreeJsx.Node | null>} */
    const parents = new Map<EstreeJsx.Node, EstreeJsx.Node | null>();
    let newIndex = lastIndex;
    let functionNesting = 0;

    /**
     * @param {EstreeJsx.JSXClosingElement | EstreeJsx.JSXOpeningElement} node
     * @returns {undefined}
     */
    function processJsxTag(
      node: EstreeJsx.JSXClosingElement | EstreeJsx.JSXOpeningElement
    ) {
      const { name } = node;

      if (name.type !== "JSXIdentifier") {
        return;
      }

      if (
        !isInjectableEstree(
          name as EstreeJsx.JSXIdentifier,
          localScopes,
          parents
        )
      ) {
        return;
      }

      jsx =
        addOffset(jsxMapping, aiml, jsx, newIndex, name.start) + "_components.";
      newIndex = name.start;
    }

    // Add sourceType to make it compatible with the walk function
    const programWithSourceType = {
      ...program,
      sourceType: "module" as const,
    };

    walk(programWithSourceType as any, {
      enter(node, parent) {
        if (node.type === "Program") {
          return;
        }

        visitors.enter(node);
        localScopes.set(node, visitors.scopes.at(-1));
        parents.set(node, parent);
      },
      leave(node) {
        if (node.type === "Program") {
          return;
        }

        visitors.exit(node);
      },
    });

    walk(programWithSourceType as any, {
      enter(node) {
        switch (node.type) {
          case "JSXElement": {
            processJsxTag(node.openingElement);
            break;
          }

          case "ArrowFunctionExpression":
          case "FunctionDeclaration":
          case "FunctionExpression": {
            functionNesting++;
            break;
          }

          case "AwaitExpression": {
            if (!functionNesting) {
              hasAwait = true;
            }

            break;
          }

          case "ForOfStatement": {
            if (!functionNesting) {
              hasAwait ||= node.await;
            }

            break;
          }

          default:
        }
      },

      leave(node) {
        switch (node.type) {
          case "ArrowFunctionExpression":
          case "FunctionDeclaration":
          case "FunctionExpression": {
            functionNesting--;
            break;
          }

          case "JSXElement": {
            const { closingElement } = node;

            if (closingElement) {
              processJsxTag(closingElement);
            }

            break;
          }

          default:
        }
      },
    });

    return newIndex;
  }

  visit(
    ast,
    (node) => {
      const start = node.position?.start?.offset;
      let end = node.position?.end?.offset;

      if (start === undefined || end === undefined) {
        return;
      }

      switch (node.type) {
        case "toml":
        case "yaml": {
          const frontmatterWithFences = aiml.slice(start, end);
          const frontmatterStart = frontmatterWithFences.indexOf(node.value);
          virtualCodes.push({
            id: node.type,
            languageId: node.type,
            mappings: [
              {
                sourceOffsets: [frontmatterStart] as number[],
                generatedOffsets: [0] as number[],
                lengths: [node.value.length] as number[],
                data: {
                  completion: true,
                  format: true,
                  navigation: true,
                  semantic: true,
                  structure: true,
                  verification: true,
                },
              },
            ],
            snapshot: new ScriptSnapshot(node.value),
            embeddedCodes: [] as Volar.VirtualCode[],
          });

          break;
        }

        case "aimljsEsm": {
          updateMarkdownFromNode(node);
          esm = processExports(aiml, node, esmMapping, esm);
          break;
        }

        case "aimlJsxFlowElement":
        case "aimlJsxTextElement": {
          if (node.children.length > 0) {
            end =
              aiml.lastIndexOf(">", getNodeStartOffset(node.children[0]) - 1) +
              1;
          }

          updateMarkdownFromOffsets(start, end);

          let lastIndex = start + 1;
          jsx = addOffset(jsxMapping, aiml, jsx + jsxIndent, start, lastIndex);
          if (isInjectableComponent(node.name, programScope)) {
            jsx += "_components.";
          }

          if (node.name) {
            jsx = addOffset(
              jsxMapping,
              aiml,
              jsx,
              lastIndex,
              lastIndex + node.name.length
            );
            lastIndex += node.name.length;
          }

          for (const attribute of node.attributes) {
            if (typeof attribute.value !== "object") {
              continue;
            }

            const program = attribute.value?.data?.estree;

            if (program) {
              lastIndex = processJsxExpression(program, lastIndex);
            }
          }

          jsx = addOffset(jsxMapping, aiml, jsx, lastIndex, end);
          break;
        }

        case "aimlFlowExpression":
        case "aimlTextExpression": {
          updateMarkdownFromNode(node);
          const program = node.data?.estree;
          jsx += jsxIndent;

          if (program?.body.length) {
            const newIndex = processJsxExpression(program, start);
            jsx = addOffset(jsxMapping, aiml, jsx, newIndex, end);
          } else {
            jsx = addOffset(jsxMapping, aiml, jsx, start, start + 1);
            jsx = addOffset(jsxMapping, aiml, jsx, end - 1, end);
            esm = addOffset(esmMapping, aiml, esm, start + 1, end - 1) + "\n";
          }

          break;
        }

        case "root": {
          break;
        }

        case "text": {
          jsx += jsxIndent + "{''}";
          break;
        }

        default: {
          jsx += jsxIndent + "<>";
          break;
        }
      }
    },
    (node) => {
      switch (node.type) {
        case "aimlJsxFlowElement":
        case "aimlJsxTextElement": {
          const child = node.children?.at(-1);

          if (child) {
            const start = aiml.indexOf("<", getNodeEndOffset(child) - 1);
            const end = getNodeEndOffset(node);

            updateMarkdownFromOffsets(start, end);
            if (isInjectableComponent(node.name, programScope)) {
              const closingStart = start + 2;
              jsx = addOffset(
                jsxMapping,
                aiml,
                addOffset(
                  jsxMapping,
                  aiml,
                  jsx + jsxIndent,
                  start,
                  closingStart
                ) + "_components.",
                closingStart,
                end
              );
            } else {
              jsx = addOffset(jsxMapping, aiml, jsx + jsxIndent, start, end);
            }
          }

          break;
        }

        case "aimlTextExpression":
        case "aimljsEsm":
        case "aimlFlowExpression":
        case "root":
        case "text":
        case "toml":
        case "yaml": {
          break;
        }

        default: {
          jsx += jsxIndent + "</>";
          break;
        }
      }
    }
  );

  updateMarkdownFromOffsets(aiml.length, aiml.length);
  esm += componentStart({ isAsync: hasAwait, scope: programScope });

  for (let i = 0; i < jsxMapping.generatedOffsets.length; i++) {
    jsxMapping.generatedOffsets[i] += esm.length;
  }

  esm += jsx + componentEnd;

  if (esmMapping.sourceOffsets.length > 0) {
    jsMappings.push(esmMapping);
  }

  if (jsxMapping.sourceOffsets.length > 0) {
    jsMappings.push(jsxMapping);
  }

  virtualCodes.unshift(
    {
      id: "jsx",
      languageId: "javascriptreact",
      mappings: jsMappings,
      snapshot: new ScriptSnapshot(esm),
      embeddedCodes: [] as Volar.VirtualCode[],
    },
    {
      id: "md",
      languageId: "markdown",
      mappings: [markdownMapping],
      snapshot: new ScriptSnapshot(markdown),
      embeddedCodes: [] as Volar.VirtualCode[],
    }
  );

  return virtualCodes;
}

/**
 * A Volar virtual code that contains some additional metadata for AIML files.
 */
export class VirtualAimlCode implements Volar.VirtualCode {
  private _processor: Unified.Processor<Mdast.Root>;
  private _checkAiml: boolean;
  private _jsxImportSource: string;
  /**
   * The mdast of the document, but only if it's valid.
   *
   * @type {Root | undefined}
   */
  ast?: Mdast.Root;
  /**
   * The virtual files embedded in the AIML file.
   *
   * @type {VirtualCode[]}
   */
  embeddedCodes: Volar.VirtualCode[] = [];
  /**
   * The error that was throw while parsing.
   *
   * @type {VFileMessage | null}
   */
  error: VFileMessage | null = null;
  /**
   * The file ID.
   *
   * @type {'aiml'}
   */
  id = "aiml";
  /**
   * The language ID.
   *
   * @type {'aiml'}
   */
  languageId = "aiml";
  /**
   * The code mappings of the AIML file. There is always only one mapping.
   *
   * @type {CodeMapping[]}
   */
  mappings: Volar.CodeMapping[] = [];
  /**
   * The original TypeScript snapshot.
   */
  snapshot: TypeScript.IScriptSnapshot;

  /**
   * @param {IScriptSnapshot} snapshot
   *   The original TypeScript snapshot.
   * @param {Processor<Root>} processor
   *   The unified processor to use for parsing.
   * @param {boolean} checkAiml
   *   If true, insert a `@check-js` comment into the virtual JavaScript code.
   * @param {string} jsxImportSource
   *   The JSX import source to use in the embedded JavaScript file.
   */
  constructor(
    snapshot: TypeScript.IScriptSnapshot,
    processor: Unified.Processor<Mdast.Root>,
    checkAiml: boolean,
    jsxImportSource: string
  ) {
    this._processor = processor;
    this._checkAiml = checkAiml;
    this._jsxImportSource = jsxImportSource;
    this.snapshot = snapshot;
    const length = snapshot.getLength();
    this.mappings[0] = {
      sourceOffsets: [0] as number[],
      generatedOffsets: [0] as number[],
      lengths: [length] as number[],
      data: {
        completion: true,
        format: true,
        navigation: true,
        semantic: true,
        structure: true,
        verification: true,
      },
    };

    const aiml = snapshot.getText(0, length);

    try {
      const ast = this._processor.parse(aiml);
      this.embeddedCodes = getEmbeddedCodes(
        aiml,
        ast,
        this._checkAiml,
        this._jsxImportSource
      );
      this.ast = ast;
      this.error = null;
    } catch (error: unknown) {
      this.error = error as VFileMessage;
      this.ast = undefined;
      this.embeddedCodes = [
        {
          id: "jsx",
          languageId: "javascriptreact",
          mappings: [] as Volar.CodeMapping[],
          snapshot: new ScriptSnapshot(fallback),
          embeddedCodes: [] as Volar.VirtualCode[],
        },
        {
          id: "md",
          languageId: "markdown",
          mappings: [] as Volar.CodeMapping[],
          snapshot: new ScriptSnapshot(aiml),
          embeddedCodes: [] as Volar.VirtualCode[],
        },
      ];
    }
  }
}
