# Technical Context

## Technologies Used

1. VSCode Language Server Protocol

   - Provides foundation for language support features
   - Handles communication between client and server
   - Supports diagnostics, hover, and completion

2. Zod Schema Validation

   - Type-safe validation for SCXML attributes
   - Rich description support for documentation
   - Reusable schema components

3. TypeScript
   - Strong typing for code safety
   - Interface definitions for element types
   - Type inference for schema validation

## Implementation Strategy

### Element Definitions

- Centralized schema definitions with shared attributes
- Strict type safety through Zod validation
- Documentation generation from schema metadata
- Hierarchical parent-child relationship validation

```typescript
// Shared attribute schemas
const baseAttributes = {
  id: z.string().describe("Unique element identifier"),
  expr: z.string().describe("Executable expression syntax"),
};

// Element definition structure
type ElementType = {
  schema: z.ZodObject<any>;
  description: string;
  allowedChildren?: string[];
  requiredParent?: string[];
  isRoot?: boolean;
  attributes?: typeof baseAttributes & Record<string, z.ZodTypeAny>;
};
```

### Validation Approach

1. XML Structure

   - Parse XML using regex for simplicity
   - Track element stack for parent-child validation
   - Validate against allowed relationships

2. Attribute Validation

   - Extract attributes using regex
   - Validate against Zod schema
   - Provide detailed error messages

3. Documentation
   - Extract descriptions from Zod schemas
   - Use for hover information
   - Include in completion items

## Development Setup

- VSCode Extension Development
- Language Server Protocol
- TypeScript Configuration
- Bun for Testing
