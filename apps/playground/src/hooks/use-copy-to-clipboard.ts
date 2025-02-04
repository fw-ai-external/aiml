import { useCallback, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";

type UseCopyToClipboardProps = {
  text: string;
  copyMessage?: string;
};

export function useCopyToClipboard({
  text,
  copyMessage = "Copied to clipboard!",
}: UseCopyToClipboardProps) {
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const handleCopy = useCallback(() => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast({
          title: copyMessage,
        });
        setIsCopied(true);
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        // @ts-ignore
        timeoutRef.current = setTimeout(() => {
          setIsCopied(false);
        }, 2000);
      })
      .catch(() => {
        toast({
          variant: "destructive",
          title: "Failed to copy to clipboard.",
        });
      });
  }, [text, copyMessage]);

  return { isCopied, handleCopy };
}
