# Refactor AIML Architecture to Reduce Circular Dependencies (completed)

## Prologue (Summary)

In the context of the AIML runtime environment,  
facing issues with circular dependencies and duplicate type definitions,  
we decided for a restructured architecture with clear package boundaries and dependency injection  
to achieve improved maintainability and reduced complexity,  
accepting the need for significant refactoring effort and potential temporary regression in functionality.

## Discussion (Context)

The current AIML architecture has evolved organically as features were added, resulting in several architectural issues:

1. **Duplicate Type Definitions**: The same types are defined in multiple packages, particularly between `packages/types` and `packages/element-config`. This creates confusion about the source of truth and increases the risk of inconsistencies.

2. **Circular Dependencies**: There are several potential circular dependencies in the codebase:

   - Elements depend on runtime types for execution, while runtime needs element types for graph construction
   - Core implements interfaces from types, while types reference core implementations
   - Elements import schemas from element-config, while element-config needs to know about element types

3. **Tight Coupling**: The implementation of elements is tightly coupled with the runtime execution, making it difficult to test elements in isolation or to extend the system with new element types.

4. **Complex Type Relationships**: The type system has become complex with interfaces extending other interfaces across package boundaries, making it difficult to understand the full type hierarchy.

These issues make the codebase harder to maintain, extend, and reason about. They also increase the risk of bugs when making changes to the system, as changes in one area can have unexpected effects in seemingly unrelated areas due to hidden dependencies.

## Solution (Decision)

We will refactor the architecture to address these issues through the following changes:

1. **Consolidate Type Definitions**:

   - Move all element type definitions to a single package (`packages/types`)
   - Create a clear hierarchy of types with well-defined interfaces
   - Remove duplicate definitions across packages
   - Rename AIMLNode to SerializedBaseElement to better reflect its purpose
   - Replace usage of IBaseElement with SerializedBaseElement for consistency

2. **Create Clear Package Boundaries**:

   - Restructure packages with clear responsibilities:
     - `types`: Only type definitions, no implementations
     - `parser`: AIML parsing, no runtime dependencies
     - `element-core`: Base element classes and utilities
     - `elements`: Specific element implementations
     - `runtime`: Runtime execution engine
   - Establish a clear dependency direction between packages

3. **Implement Dependency Injection**:

   - Use dependency injection for runtime dependencies
   - Replace direct dependencies with factory functions or interfaces
   - Allow for easier testing and extension

4. **Separate Graph Construction from Element Definition**:

   - Move graph construction logic to a separate module
   - Define clear interfaces between elements and the runtime
   - Allow elements to be defined without knowledge of the runtime implementation

5. **Use Abstract Factory Pattern**:
   - Create factory functions for element creation
   - Standardize the element creation process
   - Reduce duplication in element definition code
   - Refactor createElementDefinition to be a factory that returns two functions:
     - initFromAttributesAndNodes: Creates a BaseElement from attributes and child nodes
     - initFromSerialized: Creates a BaseElement from a serialized representation

The implementation will be phased:

1. **Phase 1: Consolidate Types**

   - Move all type definitions to the types package
   - Remove duplicate definitions
   - Update imports across the codebase
   - Rename AIMLNode to SerializedBaseElement for better semantic clarity
   - Replace IBaseElement with SerializedBaseElement throughout the codebase

2. **Phase 2: Refactor Element Creation**

   - Implement factory pattern for element creation
   - Separate element definition from execution logic
   - Create clear interfaces between elements and runtime
   - Refactor createElementDefinition to be a factory that returns two functions:
     - initFromAttributesAndNodes: Creates a BaseElement from attributes and child nodes
     - initFromSerialized: Creates a BaseElement from a serialized representation
   - Standardize the element creation process across all element types
   - Implement proper inheritance hierarchy for element classes
   - Create dedicated factories for different element categories (states, actions, etc.)

3. **Phase 3: Restructure Runtime**

   - Implement dependency injection for runtime dependencies
   - Move graph construction to dedicated module
   - Create clear boundaries between packages
   - Separate execution context from element definition
   - Implement proper lifecycle hooks for elements
   - Create a clear separation between build-time and runtime operations
   - Refactor workflow execution to use the new architecture
   - Implement proper error handling and recovery mechanisms

4. **Phase 4: Testing and Validation**
   - Ensure all tests pass with new architecture
   - Verify no circular dependencies exist
   - Document new architecture and patterns
   - Create comprehensive test suite for all components
   - Implement integration tests for the full system
   - Create documentation for the new architecture
   - Provide migration guides for existing code
   - Validate performance characteristics of the new implementation

## Consequences (Results)

### Expected Benefits

1. **Reduced Circular Dependencies**:

   - Clear direction of dependencies
   - Proper separation of concerns
   - Easier to reason about code flow

2. **Improved Maintainability**:

   - Single source of truth for types
   - Clear module boundaries
   - Easier to extend with new elements

3. **Better Testability**:

   - Components can be tested in isolation
   - Dependencies can be easily mocked
   - Clearer separation of responsibilities

4. **Enhanced Developer Experience**:
   - Reduced complexity
   - More predictable code behavior
   - Easier onboarding for new developers

### Potential Risks and Mitigations

1. **Significant Refactoring Effort**:

   - Risk: The changes require touching many parts of the codebase
   - Mitigation: Implement changes incrementally with thorough testing at each step

2. **Temporary Regression in Functionality**:

   - Risk: During refactoring, some features may temporarily break
   - Mitigation: Maintain comprehensive test coverage and fix regressions promptly

3. **Learning Curve for New Patterns**:

   - Risk: Developers need to learn new architectural patterns
   - Mitigation: Document the new architecture thoroughly and provide examples

4. **Backward Compatibility**:
   - Risk: API changes may break existing code
   - Mitigation: Provide migration guides and maintain compatibility layers where necessary

### Success Metrics

The success of this architectural refactoring will be measured by:

1. Elimination of circular dependencies as verified by dependency analysis tools
2. Reduction in duplicate code and type definitions
3. Improved test coverage and test isolation
4. Faster onboarding time for new developers
5. Reduced time to implement new features or element types
6. Fewer bugs related to unexpected side effects from changes

This ADR will be revisited after implementation to evaluate the actual outcomes against these expected results.
