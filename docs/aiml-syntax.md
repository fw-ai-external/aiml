# AIML Syntax Guide

## Introduction

AIML (Agentic Interface Markup Language) is designed to provide a developer-friendly syntax for creating structured, multi-turn interactions with large language models. It is based on MDX (Markdown + JSX) syntax, which allows you to combine the simplicity of Markdown with the power of JSX components.

AIML builds on the MDX foundation but introduces several key differences that make it more suitable for building agentic applications. This guide explains these differences and how to leverage them in your AIML files.

## MDX Foundation with Key Differences

### 1. Forgiving Parser: Warnings Instead of Errors

In standard MDX, syntax errors typically break execution and prevent your code from running. This can be frustrating when working with AI workflows where you want to focus on prompt engineering rather than syntax debugging.

**AIML's Approach:** Instead of throwing errors for invalid syntax, AIML treats problematic lines as plain text and issues warnings. This allows your workflow to continue running even with syntax issues.

**Example:**

```jsx
// In standard MDX, this would cause an error:
<customTag>This tag is unclosed

// In AIML, this is treated as text with a warning:
<customTag>This tag is unclosed
```

The parser will attempt to recover from common issues like:

- Unclosed tags
- Invalid nesting
- Unescaped special characters

This means you can start with simple prompts and progressively enhance them with structured elements, without worrying about syntax breaking your entire workflow.

### 2. Custom Elements Inspired by SCXML

While MDX uses standard HTML elements, AIML introduces a custom element system loosely inspired by SCXML (State Chart XML), but with significant differences in how values are passed and processed.

**Key Differences:**

- The `workflow` element is used instead of SCXML's `scxml` element as the root container
- Values are passed primarily based on document order between elements that have the role "action"
- The element system is designed specifically for AI workflows rather than general state machines

**Core Elements:**

- `workflow`: The root container for all other elements
- `state`: Represents a state in the workflow
- `llm`: Executes an AI model with the provided prompt
- `transition`: Moves from one state to another

**Example:**

```jsx
<workflow id="example">
  <state id="start">
    <llm>
      <prompt>You are a helpful assistant. ${userInput.message}</prompt>
    </llm>
    <transition target="end" />
  </state>
  <final id="end" />
</workflow>
```

### 3. Child Type Validation

Unlike regular JSX within MDX, AIML performs validation on the types/tags of children to ensure they are valid for their parent elements.

**Example:**

```jsx
// This will be validated to ensure the 'llm' element is a valid child of 'state'
<state id="example">
  <llm>
    <prompt>Hello world</prompt>
  </llm>
</state>
```

During the hydration process, the system ensures that:

- Each element has a valid tag name that corresponds to a registered element class
- The parent-child relationships are valid based on each element's allowed children
- Required attributes are present

This validation helps catch errors early while still maintaining the forgiving nature of the parser.

## How These Features Work Together

These three key features work together to create a developer experience that is:

1. **Forgiving**: You can start with simple text and gradually add structure without breaking execution
2. **Structured**: You have clear elements and workflows that guide the AI's behavior
3. **Validated**: You get feedback when elements are used incorrectly, but in a way that doesn't halt execution

## Examples

### Example 1: Simple Prompt with Invalid Syntax

```jsx
This is a simple text prompt that will be sent to the LLM.

<unclosedTag>This would break in MDX, but in AIML it just becomes text

More text after the invalid syntax.
```

In AIML, this entire content would be treated as text and wrapped in an auto-created `llm` element inside a `state` element. The parser would issue a warning about the unclosed tag but continue processing.

### Example 2: Element Relationship and Order

```jsx
<workflow id="conversation">
  <state id="initial">
    <llm>
      <prompt>You are a helpful assistant. How can I help you today?</prompt>
    </llm>
    <transition target="response" />
  </state>

  <state id="response">
    <llm>
      <prompt>
        The user says: ${userInput.message}
        Respond helpfully.
      </prompt>
    </llm>
    <transition target="initial" />
  </state>
</workflow>
```

In this example:

- The document order determines execution flow
- The `transition` elements connect states in a specific sequence
- The `${userInput.message}` expression will be evaluated at runtime

### Example 3: Child Type Validation

```jsx
<workflow id="example">
  <state id="start">
    <!-- Valid: llm is allowed as a child of state -->
    <llm>
      <prompt>Hello world</prompt>
    </llm>

    <!-- Valid: transition is allowed as a child of state -->
    <transition target="end" />

    <!-- Invalid: workflow cannot be nested inside state -->
    <workflow id="nested">
      <state id="inner">...</state>
    </workflow>
  </state>

  <final id="end" />
</workflow>
```

During hydration, the system would validate these relationships and issue warnings for invalid nestings.

## Best Practices

1. **Start Simple**: Begin with plain text prompts and add structure incrementally
2. **Use Comments**: Use `{/* comment */}` for notes that won't be sent to the LLM
3. **Leverage Progressive Enhancement**: Take advantage of AIML's forgiving nature to iteratively improve your workflows
4. **Check Warnings**: Even though errors don't break execution, pay attention to warnings to improve your code
5. **Validate Element Relationships**: Make sure you understand which elements can be children of others

## Conclusion

AIML's syntax is designed to provide the best of both worlds: the simplicity and familiarity of MDX with the power and resilience needed for AI workflows. By treating invalid syntax as text, using custom elements inspired by SCXML, and validating child types, AIML creates a developer experience that is both forgiving and powerful.
