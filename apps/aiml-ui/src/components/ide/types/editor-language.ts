import { LucideIcon } from "lucide-react";

export enum EditorLanguage {
  AIML = "aiml",
}

export type EditorLanguageMetadata = {
  id: EditorLanguage;
  label: string;
  fileName: string;
  fileExtension: string;
  icon: LucideIcon;
};
