import { TextDocument } from "vscode-languageserver-textdocument";
import { Connection } from "vscode-languageserver/node";
import { DocumentValidator } from "./validator";
import { DebugLogger } from "../utils/debug";
import { Token, TokenType } from "../acorn";

// Mock Connection and DebugLogger
const mockConnection = {
  sendDiagnostics: jest.fn(),
} as unknown as Connection;

const mockLogger = {
  validation: jest.fn(),
} as unknown as DebugLogger;

describe("DocumentValidator", () => {
  let validator: DocumentValidator;
  let document: TextDocument;

  beforeEach(() => {
    validator = new DocumentValidator(mockConnection, mockLogger);
    jest.clearAllMocks();
  });

  describe("findStateIds", () => {
    it("should find all state IDs in the document", () => {
      document = TextDocument.create(
        "test.xml",
        "xml",
        1,
        `<scxml>
          <state id="state1">
            <state id="state2"/>
          </state>
          <parallel id="p1">
            <state id="state3"/>
          </parallel>
        </scxml>`
      );

      const tokens: Token[] = [
        { type: TokenType.TagStart, startIndex: 0, endIndex: 6 },
        { type: TokenType.TagName, startIndex: 1, endIndex: 5, value: "state" },
        {
          type: TokenType.AttributeName,
          startIndex: 7,
          endIndex: 9,
          value: "id",
        },
        {
          type: TokenType.AttributeString,
          startIndex: 10,
          endIndex: 17,
          value: "state1",
        },
        // Add more tokens as needed
      ];

      const stateIds = validator["findStateIds"](
        document,
        tokens,
        document.getText()
      );
      expect(Array.from(stateIds)).toEqual(["state1", "state2", "state3"]);
    });
  });

  describe("validateElementChildren", () => {
    it("should validate parent-child relationships", () => {
      document = TextDocument.create(
        "test.xml",
        "xml",
        1,
        `<scxml>
          <state id="parent">
            <invalid/>
          </state>
        </scxml>`
      );

      const tokens: Token[] = [
        // Add appropriate tokens
      ];

      const diagnostics = validator.validateDocument(document, tokens);
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toContain("Invalid child element");
    });
  });

  describe("validateElementAttributes", () => {
    it("should validate required attributes", () => {
      document = TextDocument.create(
        "test.xml",
        "xml",
        1,
        `<scxml>
          <transition/>
        </scxml>`
      );

      const tokens: Token[] = [
        // Add appropriate tokens
      ];

      const diagnostics = validator.validateDocument(document, tokens);
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toContain("Missing required attribute");
    });

    it("should validate attribute values against schema", () => {
      document = TextDocument.create(
        "test.xml",
        "xml",
        1,
        `<scxml>
          <state id="123" initial="invalid"/>
        </scxml>`
      );

      const tokens: Token[] = [
        // Add appropriate tokens
      ];

      const diagnostics = validator.validateDocument(document, tokens);
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toContain("Invalid value for attribute");
    });
  });

  describe("validateStateIds", () => {
    it("should detect duplicate state IDs", () => {
      document = TextDocument.create(
        "test.xml",
        "xml",
        1,
        `<scxml>
          <state id="duplicate"/>
          <state id="duplicate"/>
        </scxml>`
      );

      const tokens: Token[] = [
        // Add appropriate tokens
      ];

      const diagnostics = validator.validateDocument(document, tokens);
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toContain("Duplicate state ID");
    });
  });

  describe("validateTransitionIds", () => {
    it("should validate transition targets exist", () => {
      document = TextDocument.create(
        "test.xml",
        "xml",
        1,
        `<scxml>
          <state id="s1">
            <transition target="nonexistent"/>
          </state>
        </scxml>`
      );

      const tokens: Token[] = [
        // Add appropriate tokens
      ];

      const diagnostics = validator.validateDocument(document, tokens);
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toContain("Invalid transition target");
    });

    it("should validate transition target hierarchy", () => {
      document = TextDocument.create(
        "test.xml",
        "xml",
        1,
        `<scxml>
          <parallel id="p1">
            <state id="s1">
              <transition target="s2"/>
            </state>
          </parallel>
          <state id="s2"/>
        </scxml>`
      );

      const tokens: Token[] = [
        // Add appropriate tokens
      ];

      const diagnostics = validator.validateDocument(document, tokens);
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toContain(
        "Invalid transition target hierarchy"
      );
    });
  });

  describe("validateForInfiniteLoops", () => {
    it("should detect potential infinite loops", () => {
      document = TextDocument.create(
        "test.xml",
        "xml",
        1,
        `<scxml>
          <state id="s1">
            <transition target="s2"/>
          </state>
          <state id="s2">
            <transition target="s1"/>
          </state>
        </scxml>`
      );

      const tokens: Token[] = [
        // Add appropriate tokens
      ];

      const diagnostics = validator.validateDocument(document, tokens);
      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toContain(
        "Potential infinite loop detected"
      );
    });

    it("should allow loops with conditional exits", () => {
      document = TextDocument.create(
        "test.xml",
        "xml",
        1,
        `<scxml>
          <state id="s1">
            <transition target="s2"/>
          </state>
          <state id="s2">
            <transition target="s1"/>
            <transition target="s3" cond="someCondition"/>
          </state>
          <state id="s3"/>
        </scxml>`
      );

      const tokens: Token[] = [
        // Add appropriate tokens
      ];

      const diagnostics = validator.validateDocument(document, tokens);
      expect(diagnostics).toHaveLength(0);
    });
  });

  describe("document healing", () => {
    it("should handle missing closing tags", () => {
      document = TextDocument.create(
        "test.xml",
        "xml",
        1,
        `<scxml>
          <state id="s1">
            <transition target="s2"
          </state>
        </scxml>`
      );

      const tokens: Token[] = [
        // Add appropriate tokens
      ];

      const diagnostics = validator.validateDocument(document, tokens);
      expect(diagnostics).toHaveLength(0);
    });

    it("should handle malformed attributes", () => {
      document = TextDocument.create(
        "test.xml",
        "xml",
        1,
        `<scxml>
          <state id=s1>
          </state>
        </scxml>`
      );

      const tokens: Token[] = [
        // Add appropriate tokens
      ];

      const diagnostics = validator.validateDocument(document, tokens);
      expect(diagnostics).toHaveLength(0);
    });
  });
});
