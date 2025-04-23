"use client";

import { Skeleton } from "@/components/ui/skeleton";
import Editor from "@codingame/monaco-editor-react";
// @ts-expect-error no types on @codingame/monaco-editor-wrapper
import { initialize } from "@codingame/monaco-editor-wrapper";
import type { IStandaloneCodeEditor } from "@codingame/monaco-vscode-api/vscode/vs/editor/standalone/browser/standaloneCodeEditor";
import { type Diagnostic, DiagnosticSeverity } from "@aiml/shared";
import { MarkerSeverity } from "monaco-editor";
import { useRef } from "react";
import { useEffect, useState } from "react";

// This should only be initialized once
// And react strict mode will initialize it twice
// if we do this in the component
// So we initialize it in the global scope
// and then we use a promise to wait for it in the hook
let wait: Promise<void> | undefined;
if (typeof window !== "undefined") {
  wait = initialize();
}

// Skeleton component for loading state
const CodeEditorLoadingSkeleton = () => (
  <div className="h-full w-full p-2">
    <Skeleton className="h-full w-full rounded-3xl" />
  </div>
);

export function CodeEditor({
  value,
  onChange,
  diagnostics,
}: {
  value: string;
  onChange: (value: string | undefined) => void;
  diagnostics: Diagnostic[];
}) {
  const [isReady, setIsReady] = useState(false);
  const [editorHeight, setEditorHeight] = useState<string>("100%");
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoRef = useRef<IStandaloneCodeEditor>(null);

  useEffect(() => {
    function updateHeight() {
      if (editorRef.current) {
        const parentHeight = editorRef.current.clientHeight;
        setEditorHeight(`${parentHeight}px`);
      }
    }

    // Initial height calculation
    updateHeight();

    // Update height on window resize
    window.addEventListener("resize", updateHeight);

    return () => {
      window.removeEventListener("resize", updateHeight);
    };
  }, []);

  useEffect(() => {
    wait
      ?.then(() => {
        setIsReady(true);
      })
      .catch((error) => {
        // This is for dev hot reloads
        setIsReady(true);
      });
  }, []);

  if (!isReady) {
    return <CodeEditorLoadingSkeleton />;
  }

  return (
    <div ref={editorRef} className="h-[95%] w-full rounded-xl">
      <Editor
        ref={monacoRef as any}
        height={editorHeight}
        options={{
          minimap: {
            enabled: false,
          },
          glyphMargin: false,
          lineNumbers: "on",
          showFoldingControls: "never",
          scrollBeyondLastLine: false,
        }}
        markers={diagnostics.map((diagnostic) => ({
          code: diagnostic.code,
          severity: (() => {
            switch (diagnostic.severity) {
              case DiagnosticSeverity.Error:
                return MarkerSeverity.Error;
              case DiagnosticSeverity.Warning:
                return MarkerSeverity.Warning;
              case DiagnosticSeverity.Information:
                return MarkerSeverity.Info;
              case DiagnosticSeverity.Hint:
                return MarkerSeverity.Hint;
              default:
                return MarkerSeverity.Info;
            }
          })(),
          startLineNumber: diagnostic.range.start.line,
          endLineNumber: diagnostic.range.end.line,
          startColumn: diagnostic.range.start.column,
          endColumn: diagnostic.range.end.column,
          message: diagnostic.message,
          source: diagnostic.source,
        }))}
        // markers={[
        //   {
        //     code: "test",
        //     severity: MarkerSeverity.Error,
        //     startLineNumber: 1,
        //     endLineNumber: 1,
        //     startColumn: 1,
        //     endColumn: 1,
        //     message: "Test here",
        //   },
        // ]}
        programmingLanguage="mdx"
        value={value}
        onChange={(value) => {
          onChange(value);
        }}
      />
    </div>
  );
}
