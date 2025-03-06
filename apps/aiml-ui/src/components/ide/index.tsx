"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useRef } from "react";
import { useEffect, useState } from "react";
// @ts-expect-error no types on @codingame/monaco-editor-wrapper
import { initialize } from "@codingame/monaco-editor-wrapper";
import Editor from "@codingame/monaco-editor-react";

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
    wait?.then(() => setIsReady(true));
  }, []);

  if (!isReady) {
    return <CodeEditorLoadingSkeleton />;
  }

  return (
    <div ref={editorRef} className="h-full w-full">
      <Editor
        height={editorHeight}
        programmingLanguage="javascript"
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
