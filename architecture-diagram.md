# AIML Architecture Flow Diagram

The following diagram illustrates the flow from parsing an AIML document/string to running the runtime with it, highlighting key types, classes, and functions from each package after the architecture refactoring.

```mermaid
flowchart TD
    %% Main Flow
    Start([AIML Document/String]) --> Parser
    Parser --> AST
    AST --> Elements
    Elements --> ExecutionGraph
    ExecutionGraph --> Runtime
    Runtime --> Execution

    %% Parser Package
    subgraph "packages/parser"
        Parser[parseMDXToAIML]
        Parser --> MDXParser[unified/remark-mdx]
        MDXParser --> AIMLTransformer[transformToAIMLNodes]
        AIMLTransformer --> AST[SerializedBaseElement[]]
    end

    %% Shared Package
    subgraph "packages/shared"
        BaseElement[BaseElement]
        ElementFactory[createElementFactory]
        StepValueImpl[StepValue]
    end

    %% Elements Package
    subgraph "packages/elements"
        ElementFactory --> WorkflowElement
        ElementFactory --> StateElement
        ElementFactory --> TransitionElement
        ElementFactory --> LLMElement
        ElementFactory --> IfElement
        ElementFactory --> OtherElements[Other Elements...]
    end

    %% Runtime Package
    subgraph "packages/runtime"
        DI[Dependency Injection]
        GraphBuilder[Graph Builder]
        ExecutionContext[Execution Context]
        RuntimeClass[Runtime]
        WorkflowClass[Workflow]

        GraphBuilder --> ExecutionGraph
        ExecutionGraph --> RuntimeClass
        RuntimeClass --> WorkflowClass
        WorkflowClass --> Execution[Element Execution]
    end

    %% Element Config Package
    subgraph "packages/element-config"
        ElementSchemas[Element Schemas]
    end

    %% Data Flow Annotations
    Start -->|"1. Parse AIML"| Parser
    AST -->|"2. Convert to Elements"| Elements
    Elements -->|"3. Build Execution Graph"| ExecutionGraph
    ExecutionGraph -->|"4. Initialize Runtime"| Runtime
    Runtime -->|"5. Execute Workflow"| Execution

```

## Key Components and Their Responsibilities

### Parser Flow

1. **parseMDXToAIML** (packages/parser/src/index.ts)
   - Takes AIML document string as input
   - Uses unified/remark-mdx to parse MDX syntax
   - Transforms the MDX AST to AIML nodes
   - Returns SerializedBaseElement[] and diagnostics

### Element Creation

1. **BaseElement** (packages/shared/src/BaseElement.ts)

   - Base class for all AIML elements
   - Implements SerializedBaseElementinterface
   - Handles execution, state management, and graph construction

2. **createElementFactory** (packages/shared/src/createElementFactory.ts)

   - Factory function for creating element factories
   - Returns functions for creating elements from attributes/nodes or serialized elements
   - Defines element behavior, validation, and execution

3. **Element Types** (packages/elements/src/\*)
   - WorkflowElement: Top-level container
   - StateElement: State management
   - TransitionElement: State transitions
   - LLMElement: AI model interactions
   - Control flow elements (If, ElseIf, Else, ForEach)

### Runtime Execution

1. **Graph Builder** (packages/runtime/src/graph-builder.ts)

   - Builds execution graph from element tree
   - Manages element relationships and dependencies
   - Uses dependency injection for runtime dependencies

2. **ExecutionGraphStep** (packages/types/src/runtime.ts)

   - Declarative JSON structure representing runtime execution
   - Defines execution order, conditions, and relationships

3. **Runtime** (packages/runtime/src/index.ts)

   - Initializes workflow from execution graph
   - Manages state transitions and execution flow
   - Handles input/output and error conditions

4. **ElementExecutionContext** (packages/runtime/src/execution-context.ts)
   - Provides context for element execution
   - Manages data model, attributes, and state
