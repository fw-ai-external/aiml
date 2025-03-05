import { FileIcon } from "lucide-react";
import {
  EditorLanguage,
  EditorLanguageMetadata,
} from "../types/editor-language";

// Define language configurations
const EditorLanguageConfig: Record<EditorLanguage, EditorLanguageMetadata> = {
  [EditorLanguage.AIML]: {
    id: EditorLanguage.AIML,
    label: "AIML",
    fileName: "main",
    fileExtension: ".aiml",
    icon: FileIcon,
  },
};

// Default language configuration
const DefaultEditorLanguageConfig = EditorLanguageConfig[EditorLanguage.AIML]; // Default to C language

export { EditorLanguageConfig, DefaultEditorLanguageConfig };
