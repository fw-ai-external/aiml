# @fireworks/shared Documentation

## Overview

This package contains shared code, types, interfaces, utilities, and potentially base classes used across multiple Fireworks AIML applications and packages (e.g., `server`, `runtime`, `parser`, `language-server`). Its main purpose is to promote code reuse and maintain consistency.

Based on the description "Core element classes and factories for AIML", it likely defines the fundamental building blocks for representing AIML structures in memory.

## Key Features/Functionality

- **Core AIML Types/Interfaces:** Defines TypeScript interfaces or classes for AIML elements (e.g., `Aiml`, `Category`, `Pattern`, `Template`).
- **Element Factories:** May provide functions for creating instances of AIML element classes.
- **Common Utilities:** Utility functions needed by multiple packages (e.g., string manipulation, logging, configuration helpers).
- **Constants:** Shared constants used across the platform.
- **Base Classes:** Potentially abstract base classes for common components.

## Setup/Usage

This package is intended to be imported and used by other packages/applications within the monorepo.

```typescript
// Example Usage (Conceptual)
import { createCategory, AimlElement } from '@fireworks/shared';

const category = createCategory();
// Use types
function processElement(element: AimlElement) { ... }
```

Setup involves installing it as a dependency in the `package.json` of consuming packages.

## Key Dependencies

- Generally has minimal external dependencies to avoid bloating consumers.
- May depend on utility libraries (e.g., `lodash`).

## Architecture Notes

- **High Cohesion:** Classes and functions within this package should be closely related.
- **Low Coupling:** Aims to have minimal dependencies on other specific packages within the monorepo.
- **Clear Exports:** Uses a well-defined entry point (e.g., `index.ts`) to export public APIs.
- **Well-Documented:** Public APIs should be clearly documented using TSDoc or similar.
