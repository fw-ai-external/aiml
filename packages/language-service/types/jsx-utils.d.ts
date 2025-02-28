/**
 * Check if a name belongs to a JSX component that can be injected.
 *
 * These are components whose name start with an upper case character. They may
 * also not be defined in the scope.
 *
 * @param {string | null} name
 *   The name of the component to check.
 * @param {Scope} scope
 *  The variable names available in the scope.
 * @returns {boolean}
 *   Whether or not the given name is that of an injectable JSX component.
 */
export function isInjectableComponent(name: string | null, scope: Scope): boolean;
/**
 * @param {JSXIdentifier} node
 * @param {Map<Node, Scope | undefined>} scopes
 * @param {Map<Node, Node | null>} parents
 */
export function isInjectableEstree(node: JSXIdentifier, scopes: Map<Node, Scope | undefined>, parents: Map<Node, Node | null>): boolean;
import type { Scope } from 'estree-util-scope';
import type { JSXIdentifier } from 'estree-jsx';
import type { Node } from 'estree-jsx';
//# sourceMappingURL=jsx-utils.d.ts.map