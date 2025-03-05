import { type editor } from "monaco-editor";

export const DefaultEditorOptionConfig: editor.IEditorConstructionOptions = {
  autoIndent: "full",
  automaticLayout: true,
  contextmenu: true,
  fontFamily: "Fira Code",
  fontLigatures: true,
  fontSize: 14,
  guides: {
    bracketPairs: true,
    indentation: true,
  },
  hideCursorInOverviewRuler: true,
  lineHeight: 20,
  matchBrackets: "always",
  minimap: {
    enabled: false,
  },
  readOnly: false,
  scrollbar: {
    horizontalSliderSize: 10,
    verticalSliderSize: 10,
  },
  showFoldingControls: "always",
  wordWrap: "on",
};
