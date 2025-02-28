/**
 * @import {IScriptSnapshot} from 'typescript'
 */
/**
 * A TypeScript compatible script snapshot that wraps a string of text.
 *
 * @implements {IScriptSnapshot}
 */
export class ScriptSnapshot implements IScriptSnapshot {
    /**
     * @param {string} text
     *   The text to wrap.
     */
    constructor(text: string);
    text: string;
    /**
     * Not implemented.
     *
     * @returns {undefined}
     */
    getChangeRange(): undefined;
    /**
     * @returns {number}
     */
    getLength(): number;
    /**
     * @param {number} start
     * @param {number} end
     * @returns {string}
     */
    getText(start: number, end: number): string;
}
import type { IScriptSnapshot } from 'typescript';
//# sourceMappingURL=script-snapshot.d.ts.map