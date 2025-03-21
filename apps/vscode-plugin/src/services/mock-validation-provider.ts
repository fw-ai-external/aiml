// This file creates a mock implementation of the validator that doesn't depend on element-config
import { type Connection, type Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { DebugLogger } from '../utils/debug';
import { healXML } from '../utils/xml';

// Mock element-config schemas for validation
const mockElementConfigSchemas = {
  state: {
    requiredAttributes: ['id'],
    allowedChildren: ['transition', 'onentry', 'onexit'],
    role: 'state',
    validateAttributes: (attrs: Record<string, any>) => {
      const diagnostics: Diagnostic[] = [];
      if (!attrs.id) {
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 0 },
          },
          message: "State element requires an 'id' attribute",
          source: 'aiml-validator',
        });
      }
      return diagnostics;
    },
  },
  transition: {
    requiredAttributes: ['target'],
    allowedChildren: ['condition'],
    validateAttributes: (attrs: Record<string, any>) => {
      const diagnostics: Diagnostic[] = [];
      if (!attrs.target) {
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 0 },
          },
          message: "Transition element requires a 'target' attribute",
          source: 'aiml-validator',
        });
      }
      return diagnostics;
    },
  },
};

export class MockValidator {
  private stateIds = new Set<string>();

  constructor(
    private connection: Connection,
    private logger: DebugLogger,
  ) {}

  public validateDocument(document: TextDocument): Diagnostic[] {
    try {
      const diagnostics: Diagnostic[] = [];
      const text = document.getText();

      // Heal XML for validation if needed
      const healedXml = healXML(text);

      // Log state IDs for debugging
      console.log('stateIds', this.stateIds);

      // Find all state IDs in the document
      this.findStateIds(healedXml);

      // Return empty diagnostics for testing
      return diagnostics;
    } catch (error) {
      this.logger.error(`Error validating document: ${error}`);
      return [];
    }
  }

  public findStateIds(text: string): Set<string> {
    // Simplified implementation for testing
    this.stateIds = new Set(['state1', 'state2', 'state3']);
    return this.stateIds;
  }

  public validateElementChildren(text: string): Diagnostic[] {
    // Simplified implementation for testing
    return [];
  }

  public validateElementAttributes(text: string): Diagnostic[] {
    // Simplified implementation for testing
    return [];
  }

  public validateStateIds(text: string): Diagnostic[] {
    // Simplified implementation for testing
    return [];
  }

  public validateTransitionIds(text: string): Diagnostic[] {
    // Simplified implementation for testing
    return [];
  }

  public validateForInfiniteLoops(text: string): Diagnostic[] {
    // Simplified implementation for testing
    return [];
  }

  public getStateIds(): Set<string> {
    return this.stateIds;
  }
}
