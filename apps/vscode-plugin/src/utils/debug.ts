import { Connection } from "vscode-languageserver/node";
import { Token, TokenType } from "../acorn";

export function createDebugger(connection: Connection) {
  const prefix = (category: string) => `[${category}]`;

  return {
    token: (token: Token, msg: string) => {
      connection.console.log(
        `${prefix("Token")} ${TokenType[token.type]} at ${token.startIndex}-${
          token.endIndex
        }: ${msg}`
      );
    },

    validation: (msg: string, data?: any) => {
      connection.console.log(
        `${prefix("Validation")} ${msg}${
          data ? ": " + JSON.stringify(data) : ""
        }`
      );
    },

    completion: (msg: string, data?: any) => {
      connection.console.log(
        `${prefix("Completion")} ${msg}${
          data ? ": " + JSON.stringify(data) : ""
        }`
      );
    },

    error: (msg: string, error?: Error) => {
      connection.console.log(
        `${prefix("Error")} ${msg}${error ? ": " + error.message : ""}`
      );
      if (error?.stack) {
        connection.console.log(error.stack);
      }
    },

    info: (msg: string) => {
      connection.console.log(`${prefix("Info")} ${msg}`);
    },

    state: (msg: string, data?: any) => {
      connection.console.log(
        `${prefix("State")} ${msg}${data ? ": " + JSON.stringify(data) : ""}`
      );
    },
  };
}

export type DebugLogger = ReturnType<typeof createDebugger>;
