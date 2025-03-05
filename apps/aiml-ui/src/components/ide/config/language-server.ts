import { EditorLanguage } from "../types/editor-language";
import { EditorLanguageConfig } from "./editor-language";
import { LanguageServerMetadata } from "../types/language-server";

const LanguageServerConfig: Record<EditorLanguage, LanguageServerMetadata> = {
  [EditorLanguage.AIML]: {
    protocol: process.env.NEXT_PUBLIC_LSP_AIML_PROTOCOL || "ws",
    hostname: process.env.NEXT_PUBLIC_LSP_AIML_HOSTNAME || "localhost",
    port: process.env.NEXT_PUBLIC_LSP_AIML_PORT
      ? parseInt(process.env.NEXT_PUBLIC_LSP_AIML_PORT, 10)
      : 4594,
    path: process.env.NEXT_PUBLIC_LSP_AIML_PATH || "/aiml",
    lang: EditorLanguageConfig[EditorLanguage.AIML],
  },
};

export default LanguageServerConfig;
