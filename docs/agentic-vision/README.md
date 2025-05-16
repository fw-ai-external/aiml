# Fireworks' Vision for GenAI Agents and Workflows

## The Agent Revolution: Beyond Frameworks and Code

The AI landscape is experiencing a revolutionary shift in how we build agents and workflows. While many teams struggle with complex frameworks and specialized libraries, the most effective implementations often rely on simpler, more composable patterns. At Fireworks.ai, we've developed AIML to embody this principle—creating a system where the power of AI workflows is accessible through nothing but prompting.

## What is AIML?

AIML is a lightweight, optimized approach to AI agent development that lives just above the inference layer. Unlike traditional frameworks that add layers of abstraction between you and your LLM, AIML uses a familiar markup language (Markdown with XML tags) to define workflows directly in your prompts. This creates a unique paradigm:

- **Declarative Yet Flexible**: Define what you want your agent to do, not how to do it
- **Prompt-Native**: Your entire workflow lives in the prompt itself
- **Developer-Friendly**: Readable, maintainable, and version-control friendly
- **Model-Agnostic**: Works with any LLM that supports chat or completion APIs

## Why Not Traditional Frameworks?

Frameworks like LangChain have provided valuable structure to the emerging field of LLM applications. However, they often:

1. Add unnecessary layers of abstraction that obscure the underlying LLM interactions
2. Create framework lock-in that ties your application to specific libraries and patterns
3. Introduce significant latency (120ms+ per step) due to their architecture 
4. Force developers to bounce between code and natural language

## Why Not No-Code Solutions?

No-code solutions offer GUI-based workflow design that can simplify development, but they typically:

1. Lack the flexibility for complex, nuanced agent behaviors
2. Create a parallel workflow outside your codebase and version control
3. Make collaboration between AI experts and developers more difficult
4. Limit your ability to make fine-grained optimizations

## The Fireworks Approach: Prompts as Code

AIML takes a fundamentally different approach. We believe the prompt itself should be the interface, with just enough structure to create deterministic, reliable workflows without sacrificing flexibility:

- **State Graph Foundation**: AIML's runtime uses a state graph architecture for complex workflows with conditional branching, merging, and orchestration
- **Single-Digit Latency**: By hosting directly next to models, AIML achieves dramatic performance improvements
- **Language Agnostic**: Works across language ecosystems, removing bottlenecks between AI and product teams
- **Developer-Centric Debugging**: Real-time tracing, visualization, and time-travel debugging give you complete visibility

## Beyond "No-Code": The Power of Declarative Prompting

AIML isn't about removing code through visual interfaces—it's about your prompts being declarative enough to not need code, while maintaining the flexibility and open-endedness when you want it. Because AIML definitions live in your codebase as text files, they:

- Work seamlessly with your existing version control systems
- Can be reviewed, diffed, and merged like any other code
- Enable collaboration between AI specialists and traditional developers
- Allow for gradual adoption without rewriting existing systems

## The Future: AI Development as a Collaborative Discipline

We see AIML as bridging the gap between natural language and programming languages. By making the prompt itself the API, we enable:

1. AI experts to focus on optimizing agent behavior through prompt engineering
2. Developers to integrate and extend functionality through familiar tools
3. Product teams to iterate rapidly without waiting for framework updates
4. Operations teams to deploy and monitor systems with existing tools

## Getting Started with AIML

AIML is designed to be approachable for both AI specialists and traditional developers. The core concepts are:

- **Workflows**: Define complex processes with conditional logic and state management
- **Tool Integration**: Connect your agent to external systems and data
- **State Management**: Maintain context and information across interactions
- **Debugging**: Visualize and optimize your agent's behavior

## Conclusion: Prompts as the New Programming Paradigm

As generative AI continues to advance, we at Fireworks believe the future of agent development will increasingly shift toward declarative prompting rather than traditional coding or complex frameworks. Our approach represents our vision for this future—where building sophisticated AI workflows requires nothing but the prompt itself.

By embracing this approach, we can create agents that are more flexible, maintainable, and powerful while reducing the complexity and overhead that has characterized much of AI development to date.

Our vision isn't about "no-code"—it's about making your prompts powerful enough to be your code while living seamlessly within your existing development workflows and version control systems.