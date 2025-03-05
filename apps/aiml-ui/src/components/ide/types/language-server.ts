import { EditorLanguageMetadata } from "./editor-language";

export type LanguageServerMetadata = {
  protocol: string;
  hostname: string;
  port: number | null;
  path: string | null;
  lang: EditorLanguageMetadata;
};
