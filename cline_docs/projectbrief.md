# Project Brief: AIML

**Project Name:** AIML (Agentic Interface Markup Language)

**Project Goal:** Create a robust, developer-friendly runtime environment for working with large language models that enables structured, multi-turn interactions through a declarative markup language with a progressive enhancement approach.

**Core Requirements:**

1. **Progressive Enhancement Syntax:** Develop a text-based syntax derived from MDX that treats all content as "just text" by default, allowing developers to gradually add JSX-style tags and templated variables as needed
2. **Forgiving Parser:** Implement a parser that treats invalid syntax as plain text rather than throwing errors, producing warnings instead of breaking execution
3. **Runtime Engine:** Build a modular, extensible runtime that can execute AIML workflows with proper state management
4. **Element System:** Create a comprehensive set of elements for state management, control flow, and LLM interactions
5. **Developer Tools:** Provide debugging UI, VSCode plugins, and language server support for AIML syntax
6. **Separation of Concerns:** Ensure backend/runtime code is separate from frontend/VSCode plugin components
7. **Documentation & Examples:** Deliver comprehensive documentation and example workflows ranging from simple text prompts to complex state machines
8. **Transparent Streaming:** Implement first-class support for streaming values with the StepValue and RunValue classes, allowing seamless interoperability between streaming and non-streaming components

**Technical Foundation:**

- Built on the @mastra/core workflow system (https://github.com/mastra-ai/mastra)
- Leverages Mastra's workflow engine for reliable state management and execution
- Integrates parser diagnostics with language server and VSCode plugin for consistent developer feedback

## Core Data Flow Components

### StepValue

StepValue is a fundamental data structure that encapsulates values passed between elements in the AIML runtime. Key characteristics include:

- **Type Safety**: Provides structured typing for values with metadata about the value type
- **Streaming Support**: Native handling of both streaming and non-streaming data
- **Value Transformation**: Methods for transforming between different value representations
- **Serialization**: Consistent serialization/deserialization for network transport
- **Error Handling**: Built-in error state representation and propagation

StepValue serves as the atomic unit of data exchange between elements, ensuring consistent handling regardless of the data's nature (streaming/non-streaming) or source.

### RunValue

RunValue is a comprehensive execution record that captures the entire workflow execution state:

- **Complete Execution Record**: Stores all step inputs, outputs, and execution metadata
- **Immediate Availability**: Returned by the runtime immediately upon workflow initiation, before execution completes
- **Streaming Updates**: Continuously updated as execution progresses, with events emitted for consumers
- **Flexible Consumption Patterns**: Provides APIs for different output consumption needs:
  - Final-value-only consumption (ignoring intermediate steps)
  - Reasoning-with-final-output pattern (intermediate steps as <think> tags)
  - Full execution trace for debugging
  - Custom output formatting and transformation
- **State Observation**: Methods to observe execution state changes in real-time
- **Execution Control**: Capabilities for pausing, resuming, or canceling execution

The RunValue is the primary interface between the runtime and consumers, creating a clean separation between execution logic and output presentation.

**Architecture:**

- Modular TypeScript packages with clear separation of concerns
- Core types package as foundation with no dependencies
- Element-based architecture inspired by SCXML
- Execution graph for declarative runtime behavior
- Factory pattern for element creation
- Dependency injection for runtime services
- Transparent streaming architecture that abstracts away streaming vs. non-streaming concerns
- StepValue and RunValue classes that enable seamless data flow between components
- Future capability for automatic data reshaping between nodes

**Key Packages:**

- **@fireworks/shared:** Base element classes, shared types, and element configurations
- **@fireworks/runtime:** Runtime execution engine, and element implementations
- **@fireworks/parser:** AIML file parsing
- **@fireworks/language-server:** Language services for editor integration
- **VSCode Plugin:** Editor support for AIML syntax

**Source of Truth:** This document serves as the source of truth for the project's scope, core requirements, and overall vision. All other documentation and development efforts should align with the principles and goals outlined here.
