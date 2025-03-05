import { create } from "zustand";
import { getPath } from "../lib/utils";
import type { editor } from "monaco-editor";
import { JudgeResultMetadata } from "../types/judge";
import { EditorLanguage } from "../types/editor-language";
import { createJSONStorage, persist } from "zustand/middleware";
import { LanguageServerMetadata } from "../types/language-server";
import { DefaultEditorOptionConfig } from "../config/editor-option";
import { DefaultEditorLanguageConfig } from "../config/editor-language";

interface CodeEditorState {
  hydrated: boolean;
  language: EditorLanguage;
  path: string;
  value: string;
  lspConfig: LanguageServerMetadata | null;
  isLspEnabled: boolean;
  editorConfig: editor.IEditorConstructionOptions;
  editor: editor.IStandaloneCodeEditor | null;
  result: JudgeResultMetadata | null;
  setHydrated: (value: boolean) => void;
  setLanguage: (language: EditorLanguage) => void;
  setPath: (path: string) => void;
  setValue: (value: string) => void;
  setLspConfig: (lspConfig: LanguageServerMetadata) => void;
  setIsLspEnabled: (enabled: boolean) => void;
  setEditorConfig: (editorConfig: editor.IEditorConstructionOptions) => void;
  setEditor: (editor: editor.IStandaloneCodeEditor) => void;
  setResult: (result: JudgeResultMetadata) => void;
}

export const useCodeEditorStore = create<CodeEditorState>()(
  persist(
    (set) => ({
      hydrated: false,
      language: DefaultEditorLanguageConfig.id,
      path: getPath(DefaultEditorLanguageConfig.id),
      value: "#include<stdio.h>",
      lspConfig: null,
      isLspEnabled: true,
      editorConfig: DefaultEditorOptionConfig,
      editor: null,
      result: null,
      setHydrated: (value) => set({ hydrated: value }),
      setLanguage: (language) => set({ language }),
      setPath: (path) => set({ path }),
      setValue: (value) => set({ value }),
      setLspConfig: (lspConfig) => set({ lspConfig }),
      setIsLspEnabled: (enabled) => set({ isLspEnabled: enabled }),
      setEditorConfig: (editorConfig) => set({ editorConfig }),
      setEditor: (editor) => set({ editor: editor }),
      setResult: (result) => set({ result }),
    }),
    {
      name: "code-editor-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        language: state.language,
        path: state.path,
        value: state.value,
        isLspEnabled: state.isLspEnabled,
        editorConfig: state.editorConfig,
      }),
      onRehydrateStorage: () => {
        return (state, error) => {
          if (error) {
            console.error("An error happened during hydration", error);
          } else if (state) {
            state.setHydrated(true);
          }
        };
      },
    }
  )
);
