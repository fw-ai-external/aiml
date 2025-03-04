/**
 * A Volar virtual code that contains some additional metadata for MDX files.
 */
export class VirtualMdxCode {
    /**
     * @param {IScriptSnapshot} snapshot
     *   The original TypeScript snapshot.
     * @param {Processor<Root>} processor
     *   The unified processor to use for parsing.
     * @param {boolean} checkMdx
     *   If true, insert a `@check-js` comment into the virtual JavaScript code.
     * @param {string} jsxImportSource
     *   The JSX import source to use in the embedded JavaScript file.
     */
    constructor(snapshot: IScriptSnapshot, processor: Processor<Root>, checkMdx: boolean, jsxImportSource: string);
    /**
     * The mdast of the document, but only if it’s valid.
     *
     * @type {Root | undefined}
     */
    ast: Root | undefined;
    /**
     * The virtual files embedded in the MDX file.
     *
     * @type {VirtualCode[]}
     */
    embeddedCodes: VirtualCode[];
    /**
     * The error that was throw while parsing.
     *
     * @type {VFileMessage | undefined}
     */
    error: VFileMessage | undefined;
    /**
     * The file ID.
     *
     * @type {'mdx'}
     */
    id: "mdx";
    /**
     * The language ID.
     *
     * @type {'mdx'}
     */
    languageId: "mdx";
    /**
     * The code mappings of the MDX file. There is always only one mapping.
     *
     * @type {CodeMapping[]}
     */
    mappings: CodeMapping[];
    snapshot: IScriptSnapshot;
    #private;
}
import type { Root } from 'mdast';
import type { VirtualCode } from '@volar/language-service';
import type { VFileMessage } from 'vfile-message';
import type { CodeMapping } from '@volar/language-service';
import type { IScriptSnapshot } from 'typescript';
import type { Processor } from 'unified';
//# sourceMappingURL=virtual-code.d.ts.map