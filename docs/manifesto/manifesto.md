# Build Production-Ready Agents with Just Prompts: Fireworks' Vision

## The Agent Revolution: Beyond Complex Frameworks

Tired of complicated frameworks and boilerplate code for AI agents? AIML lets you build reliable, production-ready agents and workflows using nothing but declarative prompts. Define complex behavior, manage state, and connect to tools—all within familiar Markdown and XML syntax that works with any language ecosystem. At Fireworks, we're eliminating the gap between prototyping and production with an approach that puts agent intelligence where it belongs: in the prompt, not the framework.

## What is AIML?

[AIML](https://aiml.fireworks.ai) is a lightweight, optimized approach to AI agent development that lives just above the inference layer. Unlike traditional frameworks that add layers of abstraction between you and your LLM, AIML uses familiar syntax to define workflows directly in your prompts.

Importantly, AIML is **not** a new domain-specific language (DSL). It simply provides declarative functionality to the Markdown and XML syntax that developers already use in their prompts. Additional features like importing other files, using programmatic expressions, and headers are all based on the widely-adopted [MDX](https://mdxjs.com/) syntax that's already loved by the developer community. This creates a unique paradigm:

- **Declarative Yet Familiar**: Define what you want your agent to do using syntax you already know
- **Prompt-Native**: Your entire workflow lives in the prompt itself
- **Developer-Friendly**: Readable, maintainable, and version-control friendly
- **Model-Agnostic**: Works with any LLM that supports chat or completion APIs
- **No New DSL**: Minimal learning curve with syntax that builds on existing standards

## Why Not Traditional Frameworks?

Frameworks like LangChain have provided valuable structure to the emerging field of LLM applications. However, they often:

1. Add unnecessary layers of abstraction that obscure the underlying LLM interactions
2. Create framework lock-in that ties your application to specific libraries and patterns
3. Introduce significant latency (120ms+ per step) due to their architecture
4. Force developers to bounce between code and natural language
5. Restrict developers to specific programming languages (typically Python and occasionally TypeScript)
6. Create organizational friction when AI engineers (proficient in Python) need to collaborate with developers using other languages
7. Fragment development teams by requiring specialized knowledge of framework-specific concepts

This language limitation is particularly problematic in enterprise environments with diverse tech stacks. When AI engineering teams build agents in Python-based frameworks, they create silos that make it difficult to integrate those agents into applications written in Java, Go, Ruby, or other languages. This separation forces companies to either maintain duplicate codebases or create complex inter-service communication patterns.

## Why Not No-Code Solutions?

No-code solutions offer GUI-based workflow design that can simplify development and make AI accessible to non-technical users. However, when it comes to production-grade AI workflows, these solutions:

1. Lack the scalability needed for high-volume, mission-critical applications
2. Create parallel workflows outside your codebase and version control systems
3. Make collaboration between AI experts and developers more difficult
4. Provide limited capabilities for comprehensive evaluation and testing
5. Struggle with complex, nuanced agent behaviors that require fine-grained control
6. Often cannot handle the performance demands of enterprise-scale deployments

We recognize that no-code tools offer benefits in terms of rapid prototyping and accessibility. However, with AIML's declarative approach, we provide many of the same benefits—visual development, rapid iteration, accessibility to non-coders—while eliminating the fundamental limitations that make no-code solutions impractical for serious production applications.

## The Spectrum of Workflows and Agents

While we appreciate [Anthropic's conceptual distinction](https://www.anthropic.com/engineering/building-effective-agents) between workflows and agents:

- **Workflows**: Systems where LLMs and tools are orchestrated through predefined code paths
- **Agents**: Systems where LLMs dynamically direct their own processes and tool usage

Our view differs in a fundamental way: we don't see workflows and agents as binary categories, but rather as points on a continuous spectrum of AI system design. Real-world applications often benefit from elements of both approaches, with varying degrees of structure and autonomy required in different parts of the same system.

Furthermore, we've identified a critical issue in the industry: most frameworks force developers to use completely different APIs and paradigms for workflows versus agents. This creates unnecessary complexity and cognitive overhead when deciding which approach to use and when.

Fireworks' approach with AIML solves this problem by providing a unified, declarative syntax that spans the entire workflow-agent spectrum. This allows developers to:

- Start from either end of the spectrum (highly structured workflows or highly dynamic agents)
- Iteratively add structure or flexibility precisely where needed
- Seamlessly blend deterministic and autonomous behaviors within the same system
- Apply constraints only where they're beneficial, not where the framework dictates

This unified approach enables teams to fine-tune the balance between predictability and autonomy for each specific use case, without being forced to choose between two entirely separate programming models. As applications evolve, developers can adjust this balance without rewriting their entire system.

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

[AIML](https://aiml.fireworks.ai) is designed to be approachable for both AI specialists and traditional developers. The core concepts are:

- **Workflows**: Define complex processes with conditional logic and state management
- **Tool Integration**: Connect your agent to external systems and data
- **State Management**: Maintain context and information across interactions
- **Debugging**: Visualize and optimize your agent's behavior

## Conclusion: Prompts as the New Programming Paradigm

As generative AI continues to advance, we at Fireworks believe the future of agent development will increasingly shift toward declarative prompting rather than traditional coding or complex frameworks. Our approach represents our vision for this future—where building sophisticated AI workflows requires nothing but the prompt itself.

By embracing this approach, we can create agents that are more flexible, maintainable, and powerful while reducing the complexity and overhead that has characterized much of AI development to date.

Our vision isn't about "no-code"—it's about making your prompts powerful enough to be your code while living seamlessly within your existing development workflows and version control systems.