import { useTheme } from "next-themes";
import { MonacoTheme } from "../types/monaco-theme";
import { MonacoThemeConfig } from "../config/monaco-theme";

export function useMonacoTheme() {
  const { resolvedTheme } = useTheme();

  const monacoTheme =
    resolvedTheme === "light"
      ? MonacoThemeConfig[MonacoTheme.GitHubLightDefault]
      : MonacoThemeConfig[MonacoTheme.GitHubDarkDefault];

  return {
    monacoTheme,
  };
}
