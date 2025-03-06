"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useRef } from "react";
import { useEffect, useState } from "react";
// @ts-expect-error no types on @codingame/monaco-editor-wrapper
import { initialize } from "@codingame/monaco-editor-wrapper";
import Editor from "@codingame/monaco-editor-react";

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
}: {
  value: string;
  onChange: (value: string | undefined) => void;
}) {
  const [isReady, setIsReady] = useState(false);
  const [editorHeight, setEditorHeight] = useState<string>("100%");
  const editorRef = useRef<HTMLDivElement>(null);

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
      ?.then(() => setIsReady(true))
      .catch((error) => {
        // This is for dev hot reloads
        setIsReady(true);
      });
  }, []);

  if (!isReady) {
    return <CodeEditorLoadingSkeleton />;
  }

  return (
    <div ref={editorRef} className="h-[95%] w-full rounded-xl overflow-hidden">
      <Editor
        height={editorHeight}
        options={{
          minimap: {
            enabled: false,
          },
          glyphMargin: false,
          lineNumbers: "off",
          showFoldingControls: "never",
          scrollBeyondLastLine: false,
        }}
        programmingLanguage="mdx"
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
