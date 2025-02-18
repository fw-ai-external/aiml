"use client";

import { Editor, loader } from "@monaco-editor/react";
import { useEffect } from "react";
import { FFQuantumTheme } from "./FF-Quantum";
import { defaultScxmlExample } from "@/components/IDE/default-scxml-example";

export function IDE() {
  const handleSubmit = async () => {};

  useEffect(() => {
    loader.init().then((monaco) => {
      monaco.editor.defineTheme("myTheme", {
        base: "vs-dark",
        inherit: false,
        rules: [],
        ...FFQuantumTheme.dark,
      });
      monaco.languages.html.registerHTMLLanguageService(
        "aiml",
        {},
        { documentFormattingEdits: true }
      );
    });
  }, []);

  return (
    <Editor
      height="100%"
      theme="myTheme"
      language="aiml"
      options={{
        formatOnType: true,
        formatOnPaste: true,
        minimap: { enabled: false },
      }}
      value={defaultScxmlExample}
      onMount={(editor, monaco) => {
        if (editor) {
          editor.getAction("editor.action.formatDocument")?.run();
        }
      }}
    />
  );
}
