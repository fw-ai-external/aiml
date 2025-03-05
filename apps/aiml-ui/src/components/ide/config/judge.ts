import { EditorLanguage } from "@/types/editor-language";
import { EditorLanguageConfig } from "./editor-language";
import { DockerMetadata, JudgeMetadata } from "@/types/judge";

export const DockerConfig: Record<EditorLanguage, DockerMetadata> = {
  [EditorLanguage.C]: {
    image: "gcc",
    tag: "latest",
    workingDir: "/src",
    timeLimit: 1000,
    memoryLimit: 128,
    compileOutputLimit: 1 * 1024 * 1024,
    runOutputLimit: 1 * 1024 * 1024,
  },
  [EditorLanguage.CPP]: {
    image: "gcc",
    tag: "latest",
    workingDir: "/src",
    timeLimit: 1000,
    memoryLimit: 128,
    compileOutputLimit: 1 * 1024 * 1024,
    runOutputLimit: 1 * 1024 * 1024,
  }
}

export const JudgeConfig: Record<EditorLanguage, JudgeMetadata> = {
  [EditorLanguage.C]: {
    editorLanguageMetadata: EditorLanguageConfig[EditorLanguage.C],
    dockerMetadata: DockerConfig[EditorLanguage.C],
  },
  [EditorLanguage.CPP]: {
    editorLanguageMetadata: EditorLanguageConfig[EditorLanguage.CPP],
    dockerMetadata: DockerConfig[EditorLanguage.CPP],
  },
};
