/**
 * @import {Nodes} from 'mdast'
 * @import {Point, Position} from 'unist'
 */
/**
 * Get the offset of a parsed unist point.
 *
 * @param {Point} point
 *   The unist point of which to get the offset.
 * @returns {number}
 *   The offset of the unist point.
 */
export function getPointOffset(point: Point): number;
/**
 * Get the start offset of a parsed unist point.
 *
 * @param {Nodes} node
 *   The unist point of which to get the start offset.
 * @returns {number}
 *   The start offset of the unist point.
 */
export function getNodeStartOffset(node: Nodes): number;
/**
 * Get the end offset of a parsed unist point.
 *
 * @param {Nodes} node
 *   The unist point of which to get the end offset.
 * @returns {number}
 *   The end offset of the unist point.
 */
export function getNodeEndOffset(node: Nodes): number;
import type { Point } from 'unist';
import type { Nodes } from 'mdast';
//# sourceMappingURL=mdast-utils.d.ts.map