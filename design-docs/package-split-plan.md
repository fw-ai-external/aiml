# Package Split Plan (Implemented)

> **Note**: This plan has been implemented as part of ADR 001 "Refactor AIML Architecture to Reduce Circular Dependencies". The current architecture now follows this structure with some refinements. See [architecture.md](./architecture.md) for the current architecture documentation.

This document outlines the original plan for splitting the `@fireworks/core` package into separate packages for elements and runtime.

## Current Structure

Currently, the `@fireworks/core` package contains both element definitions and runtime functionality:

```
packages/core/
  ├── src/
  │   ├── element/
  │   │   ├── BaseElement.ts
  │   │   ├── factory.ts
  │   │   ├── createElementDefinition.ts
  │   │   ├── actions/
  │   │   ├── control-flow/
  │   │   ├── states/
  │   │   ├── context/
  │   │   └── ai/
  │   ├── runtime/
  │   │   ├── di.ts
  │   │   ├── graph-builder.ts
  │   │   ├── execution-context.ts
  │   │   ├── workflow-runner.ts
  │   │   ├── StepValue.ts
  │   │   └── index.ts
  │   ├── types/
  │   ├── errors/
  │   └── utils/
  └── package.json
```

## Target Structure

We will split the `@fireworks/core` package into the following packages:

1. `@fireworks/shared`: Contains the base element class and factory.
2. `@fireworks/elements`: Contains specific element implementations.
3. `@fireworks/runtime`: Contains the runtime execution engine.

The new structure will be:

```
packages/element-core/
  ├── src/
  │   ├── BaseElement.ts
  │   ├── factory.ts
  │   ├── createElementDefinition.ts
  │   └── index.ts
  └── package.json

packages/elements/
  ├── src/
  │   ├── actions/
  │   ├── control-flow/
  │   ├── states/
  │   ├── context/
  │   ├── ai/
  │   └── index.ts
  └── package.json

packages/runtime/
  ├── src/
  │   ├── di.ts
  │   ├── graph-builder.ts
  │   ├── execution-context.ts
  │   ├── workflow-runner.ts
  │   ├── StepValue.ts
  │   └── index.ts
  └── package.json
```

## Implementation Steps

### 1. Create New Package Directories

Create the new package directories:

```bash
mkdir -p packages/element-core/src
mkdir -p packages/elements/src
mkdir -p packages/runtime/src
```

### 2. Create Package.json Files

Create package.json files for each new package:

#### packages/element-core/package.json

```json
{
  "name": "@fireworks/shared",
  "version": "0.1.0",
  "description": "Core element classes and factories for AIML",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "bun test"
  },
  "dependencies": {
    "@fireworks/types": "workspace:*",
    "@fireworks/element-config": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

#### packages/elements/package.json

```json
{
  "name": "@fireworks/elements",
  "version": "0.1.0",
  "description": "Element implementations for AIML",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "bun test"
  },
  "dependencies": {
    "@fireworks/types": "workspace:*",
    "@fireworks/element-config": "workspace:*",
    "@fireworks/shared": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

#### packages/runtime/package.json

```json
{
  "name": "@fireworks/runtime",
  "version": "0.1.0",
  "description": "Runtime execution engine for AIML",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "bun test"
  },
  "dependencies": {
    "@fireworks/types": "workspace:*",
    "@fireworks/shared": "workspace:*",
    "@fireworks/elements": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

### 3. Create tsconfig.json Files

Create tsconfig.json files for each new package:

#### packages/element-core/tsconfig.json

```json
{
  "extends": "../../packages/tsconfig/library.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### packages/elements/tsconfig.json

```json
{
  "extends": "../../packages/tsconfig/library.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### packages/runtime/tsconfig.json

```json
{
  "extends": "../../packages/tsconfig/library.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 4. Move Files

Move files from the core package to the new packages:

#### Element Core

```bash
cp packages/core/src/element/BaseElement.ts packages/element-core/src/
cp packages/core/src/element/factory.ts packages/element-core/src/
cp packages/core/src/element/createElementDefinition.ts packages/element-core/src/
```

Create an index.ts file in packages/element-core/src/:

```typescript
// Export all element core functionality
export * from "./BaseElement";
export * from "./factory";
export * from "./createElementDefinition";
```

#### Elements

```bash
cp -r packages/core/src/element/actions packages/elements/src/
cp -r packages/core/src/element/control-flow packages/elements/src/
cp -r packages/core/src/element/states packages/elements/src/
cp -r packages/core/src/element/context packages/elements/src/
cp -r packages/core/src/element/ai packages/elements/src/
```

Create an index.ts file in packages/elements/src/:

```typescript
// Export all element implementations
export * from "./actions";
export * from "./control-flow";
export * from "./states";
export * from "./context";
export * from "./ai";
```

Create index.ts files in each subdirectory to export all elements.

#### Runtime

```bash
cp packages/core/src/runtime/di.ts packages/runtime/src/
cp packages/core/src/runtime/graph-builder.ts packages/runtime/src/
cp packages/core/src/runtime/execution-context.ts packages/runtime/src/
cp packages/core/src/runtime/workflow-runner.ts packages/runtime/src/
cp packages/core/src/runtime/StepValue.ts packages/runtime/src/
cp packages/core/src/runtime/index.ts packages/runtime/src/
```

### 5. Update Imports

Update imports in all files to use the new package structure. For example:

- Change `import { BaseElement } from '../BaseElement'` to `import { BaseElement } from '@fireworks/shared'`
- Change `import { StateElement } from '../states/StateElement'` to `import { StateElement } from '@fireworks/elements'`
- Change `import { ExecutionContext } from '../runtime/execution-context'` to `import { ExecutionContext } from '@fireworks/runtime'`

### 6. Update Package References

Update package references in the workspace configuration (e.g., package.json, turbo.json) to include the new packages.

### 7. Update Parser Package

Update the parser package to use the new packages:

```bash
# Update package.json
sed -i 's/"@fireworks\/core"/"@fireworks\/element-core", "@fireworks\/elements", "@fireworks\/runtime"/g' packages/parser/package.json

# Update imports in source files
find packages/parser/src -type f -name "*.ts" -exec sed -i 's/from "@fireworks\/core"/from "@fireworks\/element-core"/g' {} \;
find packages/parser/src -type f -name "*.ts" -exec sed -i 's/from "@fireworks\/core\/element"/from "@fireworks\/elements"/g' {} \;
find packages/parser/src -type f -name "*.ts" -exec sed -i 's/from "@fireworks\/core\/runtime"/from "@fireworks\/runtime"/g' {} \;
```

### 8. Build and Test

Build and test the new packages:

```bash
# Build all packages
turbo run build

# Run tests
turbo run test
```

### 9. Update Documentation

Update documentation to reflect the new package structure.

## Conclusion

This plan outlines the steps to split the `@fireworks/core` package into separate packages for elements and runtime. This will help reduce circular dependencies and make the codebase more maintainable.
