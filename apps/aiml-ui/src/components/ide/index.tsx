"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
// @ts-expect-error no types on @codingame/monaco-editor-wrapper
import { initialize } from "@codingame/monaco-editor-wrapper";
import { Editor as MonacoEditor } from "@monaco-editor/react";

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

  useEffect(() => {
    initialize()
      .then(() => setIsReady(true))
      .catch(() => {
        setIsReady(true);
      });
  }, []);

  if (!isReady) {
    return <CodeEditorLoadingSkeleton />;
  }

  return (
    <MonacoEditor
      height="auto"
      language="javascript"
      value={value}
      onChange={onChange}
    />
  );
}
