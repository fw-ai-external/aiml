/**
 * @import {IScriptSnapshot} from 'typescript'
 */

// Type declaration for TypeScript's IScriptSnapshot
declare namespace TypeScript {
  interface IScriptSnapshot {
    getText(start: number, end: number): string;
    getLength(): number;
    getChangeRange(oldSnapshot: IScriptSnapshot): any;
  }
}

/**
 * A TypeScript compatible script snapshot that wraps a string of text.
 *
 * @implements {IScriptSnapshot}
 */
export class ScriptSnapshot implements TypeScript.IScriptSnapshot {
  /**
   * @param {string} text
   *   The text to wrap.
   */
  constructor(private readonly text: string) {}

  /**
   * Not implemented.
   *
   * @returns {undefined}
   */
  getChangeRange(oldSnapshot: TypeScript.IScriptSnapshot): undefined {
    return undefined;
  }

  /**
   * @returns {number}
   */
  getLength(): number {
    return this.text.length;
  }

  /**
   * @param {number} start
   * @param {number} end
   * @returns {string}
   */
  getText(start: number, end: number): string {
    return this.text.slice(start, end);
  }
}
