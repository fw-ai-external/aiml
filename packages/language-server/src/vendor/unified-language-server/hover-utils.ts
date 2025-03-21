import type { Hover } from 'vscode-languageserver';
import type { Token } from '../../vendor/acorn';
import type { DebugLogger } from '../../vendor/utils/debug';

type ElementConfig = {
  documentation: string;
  propsSchema: {
    shape: Record<string, any>;
  };
};

/**
 * Generates hover information for an element based on the element's config
 */
export function generateElementHover(
  tagName: string,
  elementConfig: ElementConfig,
  range: { start: any; end: any },
  logger: DebugLogger,
): Hover | null {
  logger.info(`Generating hover for element: ${tagName}`);

  return {
    contents: {
      kind: 'markdown',
      value: `**${tagName}**\n\n${elementConfig.documentation || `${tagName} element`}`,
    },
    range,
  };
}

/**
 * Generates hover information for an attribute based on the element's config and attribute name
 */
export function generateAttributeHover(
  tagName: string,
  attrName: string,
  elementConfig: ElementConfig,
  schema: any,
  range: { start: any; end: any },
  logger: DebugLogger,
): Hover | null {
  logger.info(`Generating hover for attribute: ${tagName}.${attrName}`);

  if (!schema) {
    logger.info(`No schema found for attribute: ${attrName}`);
    return null;
  }

  // Safely get the constructor name
  const typeName = schema.constructor ? schema.constructor.name : 'Object';

  return {
    contents: {
      kind: 'markdown',
      value: `**${tagName}.${attrName}**\n\n${schema.description || ''}\n\nAttribute type: ${typeName}`,
    },
    range,
  };
}

/**
 * Safely extracts a text from document content based on a token
 */
export function getTextFromToken(content: string, token: Token): string {
  try {
    if (token.startIndex < 0 || token.endIndex > content.length || token.startIndex >= token.endIndex) {
      console.error('Invalid token bounds:', token);
      return '';
    }
    return content.substring(token.startIndex, token.endIndex);
  } catch (error) {
    console.error('Error extracting text from token:', error);
    return '';
  }
}
