import { TextDocument } from "vscode-languageserver-textdocument";
import { StateTracker } from "./stateTracker";
import { DebugLogger } from "../utils/debug";
import { describe, expect, it, beforeEach } from "bun:test";
import { parseToTokens } from "../acorn";

describe("StateTracker", () => {
  let stateTracker: StateTracker;
  let mockLogger: Partial<DebugLogger>;
  let logs: any[] = [];

  beforeEach(() => {
    logs = [];
    mockLogger = {
      state: (message: string, context: any) => {
        logs.push({ message, context });
        console.log("[StateTracker]", message, context);
      },
      info: (message: string, context?: any) => {
        logs.push({ message, context });
        console.log("[StateTracker]", message, context);
      },
      token: (token: any, message: string) => {
        logs.push({ token, message });
        console.log("[StateTracker]", message, token);
      },
      error: (message: string, context?: any) => {
        logs.push({ message, context });
        console.log("[StateTracker]", message, context);
      },
      validation: (message: string, context?: any) => {
        logs.push({ message, context });
        console.log("[StateTracker]", message, context);
      },
    } as DebugLogger;
    stateTracker = new StateTracker(mockLogger as DebugLogger);
  });

  describe("trackStates", () => {
    it("should track basic state elements", async () => {
      const document = TextDocument.create(
        "test.aiml",
        "aiml",
        1,
        `<>
          <state id="idle"/>
          <state id="active"/>
        </>`
      );
      const tokens = parseToTokens(document.getText());
      stateTracker.trackStates(document, tokens);

      const states = stateTracker.getStatesForDocument(document.uri);
      expect(states).toEqual(new Set(["idle", "active"]));
    });

    it("should track parallel states", async () => {
      const document = TextDocument.create(
        "test.aiml",
        "aiml",
        1,
        `<>
          <parallel id="concurrent"/>
        </>`
      );
      const tokens = parseToTokens(document.getText());
      stateTracker.trackStates(document, tokens);

      const states = stateTracker.getStatesForDocument(document.uri);
      expect(states).toEqual(new Set(["concurrent"]));
    });

    it("should track final states", async () => {
      const document = TextDocument.create(
        "test.aiml",
        "aiml",
        1,
        `<>
          <final id="completed"/>
        </>`
      );
      const tokens = parseToTokens(document.getText());
      stateTracker.trackStates(document, tokens);

      const states = stateTracker.getStatesForDocument(document.uri);
      expect(states).toEqual(new Set(["completed"]));
    });

    it("should track history states", async () => {
      const document = TextDocument.create(
        "test.aiml",
        "aiml",
        1,
        `<>
          <history id="prev-state"/>
        </>`
      );
      const tokens = parseToTokens(document.getText());
      stateTracker.trackStates(document, tokens);

      const states = stateTracker.getStatesForDocument(document.uri);
      expect(states).toEqual(new Set(["prev-state"]));
    });

    it("should track multiple state types in the same document", async () => {
      const document = TextDocument.create(
        "test.aiml",
        "aiml",
        1,
        `<>
          <state id="normal"/>
          <parallel id="concurrent"/>
          <final id="done"/>
          <history id="prev"/>
        </>`
      );
      const tokens = parseToTokens(document.getText());
      stateTracker.trackStates(document, tokens);

      const states = stateTracker.getStatesForDocument(document.uri);
      expect(states).toEqual(new Set(["normal", "concurrent", "done", "prev"]));
    });

    it("should track nested states", async () => {
      const document = TextDocument.create(
        "test.aiml",
        "aiml",
        1,
        `<>
          <state id="parent">
            <state id="child1"/>
            <parallel id="child2">
              <state id="grandchild"/>
            </parallel>
          </state>
        </>`
      );
      const tokens = parseToTokens(document.getText());
      stateTracker.trackStates(document, tokens);

      const states = stateTracker.getStatesForDocument(document.uri);
      expect(states).toEqual(
        new Set(["parent", "child1", "child2", "grandchild"])
      );
    });

    it("should handle documents with no states", async () => {
      const document = TextDocument.create(
        "test.aiml",
        "aiml",
        1,
        `<>
          <transition target="unknown"/>
        </>`
      );
      const tokens = parseToTokens(document.getText());
      stateTracker.trackStates(document, tokens);

      const states = stateTracker.getStatesForDocument(document.uri);
      expect(states.size).toBe(0);
    });

    it("should update states when document changes", async () => {
      const document1 = TextDocument.create(
        "test.aiml",
        "aiml",
        1,
        `<>
          <state id="idle"/>
        </>`
      );
      const tokens1 = parseToTokens(document1.getText());
      stateTracker.trackStates(document1, tokens1);
      expect(stateTracker.getStatesForDocument(document1.uri)).toEqual(
        new Set(["idle"])
      );

      const document2 = TextDocument.create(
        document1.uri,
        "aiml",
        2,
        `<>
          <parallel id="concurrent"/>
        </>`
      );
      const tokens2 = parseToTokens(document2.getText());
      stateTracker.trackStates(document2, tokens2);
      expect(stateTracker.getStatesForDocument(document2.uri)).toEqual(
        new Set(["concurrent"])
      );
    });

    it("should handle states without IDs", async () => {
      const document = TextDocument.create(
        "test.aiml",
        "aiml",
        1,
        `<>
          <final/>
          <history/>
          <state id="withId"/>
        </>`
      );
      const tokens = parseToTokens(document.getText());
      console.log("tokens", tokens);
      stateTracker.trackStates(document, tokens);

      const states = stateTracker.getStatesForDocument(document.uri);
      expect(states).toEqual(new Set(["withId"]));
    });
  });

  describe("clearStates", () => {
    it("should remove states for the specified document", async () => {
      const document = TextDocument.create(
        "test.aiml",
        "aiml",
        1,
        `<>
          <state id="idle"/>
        </>`
      );
      const tokens = parseToTokens(document.getText());
      stateTracker.trackStates(document, tokens);
      expect(stateTracker.getStatesForDocument(document.uri).size).toBe(1);

      stateTracker.clearStates(document.uri);
      expect(stateTracker.getStatesForDocument(document.uri).size).toBe(0);
    });
  });

  describe("getStatesForDocument", () => {
    it("should return empty set for unknown document", () => {
      const states = stateTracker.getStatesForDocument("unknown.aiml");
      expect(states.size).toEqual(0);
    });

    it("should return tracked states for known document", async () => {
      const document = TextDocument.create(
        "test.aiml",
        "aiml",
        1,
        `<>
          <state id="idle"/>
          <parallel id="concurrent"/>
        </>`
      );
      const tokens = parseToTokens(document.getText());
      stateTracker.trackStates(document, tokens);

      const states = stateTracker.getStatesForDocument(document.uri);
      expect(states.size).toEqual(2);
      expect(states.has("idle")).toBe(true);
      expect(states.has("concurrent")).toBe(true);
    });
  });
});
