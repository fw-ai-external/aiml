import { TsConfigSourceFile } from "typescript";

import { Plugin } from "unified";
import { pathToFileURL } from "node:url";
import { createAsyncLanguageServicePlugin } from "@volar/typescript/lib/quickstart/createAsyncLanguageServicePlugin.js";

const plugin = createAsyncLanguageServicePlugin(
  [".aiml"],
  2 /* JSX */,
  async (ts, info) => {
    // Debug info to help with development
    console.log("Plugin activated for AIML file");

    const [
      { createAimlLanguagePlugin, resolveRemarkPlugins },
      { loadPlugin },
      { default: remarkFrontmatter },
      { default: remarkGfm },
    ] = await Promise.all([
      import("@fireworks/language-service"),
      import("load-plugin"),
      import("remark-frontmatter"),
      import("remark-gfm"),
    ]);

    if (info.project.projectKind !== ts.server.ProjectKind.Configured) {
      return {
        languagePlugins: [
          createAimlLanguagePlugin([
            [remarkFrontmatter, ["toml", "yaml"]],
            remarkGfm,
          ]),
        ],
      };
    }

    const cwd = info.project.getCurrentDirectory();
    const configFile = info.project.getCompilerOptions()
      .configFile as TsConfigSourceFile;

    const commandLine = ts.parseJsonSourceFileConfigFileContent(
      configFile,
      ts.sys,
      cwd,
      undefined,
      configFile?.fileName
    );

    const plugins = await resolveRemarkPlugins(
      commandLine.raw?.mdx,
      (name: string) =>
        loadPlugin(name, {
          prefix: "remark",
          from: pathToFileURL(cwd) + "/",
        }) as Promise<Plugin>
    );

    return {
      languagePlugins: [
        createAimlLanguagePlugin(
          plugins || [[remarkFrontmatter, ["toml", "yaml"]], remarkGfm],
          Boolean(commandLine.raw?.aiml?.checkAiml),
          commandLine.options.jsxImportSource
        ),
      ],
    } as any;
  }
);

export default plugin;
