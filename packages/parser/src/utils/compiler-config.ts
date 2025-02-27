import { CompilerOptions } from "ts-morph";

export class CompilerConfig {
  static getDefaultOptions(): CompilerOptions {
    return {
      jsx: 1, // Preserve
      allowJs: true,
      allowJsx: true,
      moduleResolution: 2, // Node
      noImplicitAny: false,
      skipLibCheck: true,
      noResolve: true,
      types: [],
      jsxFactory: "createElement",
      jsxFragmentFactory: "Fragment",
      target: 6, // ES2020
      module: 99, // ESNext
      esModuleInterop: true,
      resolveJsonModule: true,
      noLib: true,
      skipDefaultLibCheck: true,
    };
  }

  static getDiagnosticFilters(): string[] {
    return [
      "Cannot find name",
      "JSX element implicitly has type 'any'",
      "Cannot find module",
      "File is a CommonJS module",
      "Cannot redeclare block-scoped variable",
      "Cannot find namespace",
      "createElement",
      "Fragment",
      "Cannot find global type",
      "Cannot find type definition file",
      "Could not resolve the path",
      "Cannot find lib.dom.d.ts",
      "Cannot find lib.es2020.d.ts",
      "Cannot find lib.es5.d.ts",
      "Cannot find lib.es6.d.ts",
    ];
  }
}
