# Active Context

## Current Focus

Refactoring attribute schemas to avoid duplication in scxmlElements.

## Recent Changes

1. Created attributeSchemas object to define common schemas
2. Updated scxmlElements to use shared schemas
3. Removed duplicate schema definitions
4. Added descriptions to shared schemas
5. Added new @scxml/parser package for XML parsing and validation
   - Implemented schema-based validation
   - Added parent-child relationship validation
   - Created comprehensive error reporting

## Next Steps

1. Parser Implementation:

   - Complete XML parsing logic in @scxml/parser
   - Add tokenization and AST generation
   - Implement detailed error tracking
   - Add unit tests for parser functionality

2. Schema Finalization:

   - Finalize shared attribute schemas
   - Implement expression type validation
   - Add ID pattern validation
   - Create schema versioning system

3. Performance Optimization:

   - Implement schema validation caching
   - Add incremental document parsing
   - Optimize parent-child validation
   - Benchmark validation speeds

4. Documentation:
   - Create schema reference guide
   - Add validation rule examples
   - Document error code system
   - Publish extension API docs

## Active Decisions

1. Schema Organization

   ```typescript
   const attributeSchemas = {
     id: z.string().describe("..."),
     expr: z.string().describe("..."),
     // Common schemas defined once
   };

   const elements = {
     element: {
       schema: z.object({
         attr: attributeSchemas.id, // Reuse schemas
       }),
     },
   };
   ```

2. Validation Strategy
   - Use shared schemas for common attributes
   - Add element-specific validation where needed
   - Keep descriptions in schema definitions
   - Maintain type safety through Zod

## Current Considerations

1. Schema Reusability

   - Balance between reuse and specificity
   - Consider attribute variants
   - Handle element-specific constraints
   - Maintain clear documentation

2. Type Safety
   - Ensure proper typing for schemas
   - Consider adding runtime checks
   - Add schema validation tests
   - Document type constraints
