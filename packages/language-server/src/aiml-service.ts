import { Plugin, PluggableList } from "unified";
import { WorkspaceFolder } from "vscode-languageserver";
import { URI } from "vscode-uri";

// Define a type for the workspace parameter
type WorkspaceType = {
  getWorkspaceFolders: () =>
    | Promise<WorkspaceFolder[] | null>
    | WorkspaceFolder[]
    | null;
  getConfiguration?: (section: string, resource?: string) => any;
};

// Define a type for virtual code
interface VirtualCode {
  getText(): string;
  getLanguageId(): string;
}

/**
 * Creates an AIML language plugin
 */
export function createAimlLanguagePlugin(
  plugins: PluggableList,
  checkAiml: boolean,
  jsxImportSource: string
) {
  return {
    name: "aiml",
    // Required by LanguagePlugin interface
    getLanguageId(uri: URI) {
      return "aiml";
    },
    createVirtualFiles(fileName: string, content: string) {
      return [];
    },
    resolveConfig() {
      return {
        plugins,
        checkAiml,
        jsxImportSource,
      };
    },
  };
}

/**
 * Creates an AIML service plugin
 */
export function createAimlServicePlugin(workspace: WorkspaceType) {
  // Implement the LanguageServicePlugin interface
  return {
    name: "aiml-service",
    // Required capabilities
    capabilities: {
      hoverProvider: true,
      completionProvider: {
        triggerCharacters: [".", "/", "#"],
      },
    },
    // Required create method
    create(context: any) {
      return {
        dispose() {
          // Cleanup
        },
        // Add any required methods here
        provideHover() {
          return null;
        },
        provideCompletionItems() {
          return { isIncomplete: false, items: [] };
        },
      };
    },
  };
}

/**
 * Resolves remark plugins
 */
export async function resolveRemarkPlugins(
  config: any,
  loadPlugin: (name: string) => Promise<Plugin>
): Promise<PluggableList> {
  if (!config || !config.plugins) {
    return [];
  }

  const plugins: PluggableList = [];

  for (const pluginName of config.plugins) {
    try {
      const plugin = await loadPlugin(pluginName);
      plugins.push(plugin);
    } catch (error) {
      console.error(`Failed to load plugin ${pluginName}:`, error);
    }
  }

  return plugins;
}
