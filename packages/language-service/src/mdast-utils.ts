/**
 * @import {Nodes} from 'mdast'
 * @import {Point, Position} from 'unist'
 */

// Type declarations based on JSDoc references
declare namespace Mdast {
  interface Nodes {
    position?: Unist.Position;
    [key: string]: any;
  }
}

declare namespace Unist {
  interface Point {
    offset?: number;
    line: number;
    column: number;
  }

  interface Position {
    start: Point;
    end: Point;
  }
}

/**
 * Get the offset of a parsed unist point.
 *
 * @param {Point} point
 *   The unist point of which to get the offset.
 * @returns {number}
 *   The offset of the unist point.
 */
export function getPointOffset(point: Unist.Point): number {
  return /** @type {number} */ point.offset ?? 0;
}

/**
 * Get the start offset of a parsed unist point.
 *
 * @param {Nodes} node
 *   The unist point of which to get the start offset.
 * @returns {number}
 *   The start offset of the unist point.
 */
export function getNodeStartOffset(node: Mdast.Nodes): number {
  return getPointOffset(
    /** @type {Position} */ (node.position as Unist.Position).start
  );
}

/**
 * Get the end offset of a parsed unist point.
 *
 * @param {Nodes} node
 *   The unist point of which to get the end offset.
 * @returns {number}
 *   The end offset of the unist point.
 */
export function getNodeEndOffset(node: Mdast.Nodes): number {
  return getPointOffset(
    /** @type {Position} */ (node.position as Unist.Position).end
  );
}
