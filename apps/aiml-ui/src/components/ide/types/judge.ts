import { EditorLanguageMetadata } from "./editor-language";

// Result type definitions
export enum ExitCode {
  SE = 0,  // System Error
  CS = 1,  // Compilation Success
  CE = 2,  // Compilation Error
  TLE = 3, // Time Limit Exceeded
  MLE = 4, // Memory Limit Exceeded
  RE = 5,  // Runtime Error
  AC = 6,  // Accepted
  WA = 7,  // Wrong Answer
}

export type JudgeResultMetadata = {
  output: string;
  exitCode: ExitCode;
  executionTime?: number;
  memoryUsage?: number;
};

export type JudgeMetadata = {
  editorLanguageMetadata: EditorLanguageMetadata;
  dockerMetadata: DockerMetadata;
};

export type DockerMetadata = {
  image: string;
  tag: string;
  workingDir: string;
  timeLimit: number;
  memoryLimit: number;
  compileOutputLimit: number;
  runOutputLimit: number;
}
