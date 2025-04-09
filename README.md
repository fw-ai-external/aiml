# AIML Prompting Language

## Modern MDX flavored SCXML, designed for an Agentic world!

> [!IMPORTANT]  
> This repository is in a high state of flux, and might not build correctly at this moment, please be patient as rapid progress is made :)

A comprehensive toolset for working with AIML based workflows, both familiar, yet totally new! featuring a VSCode extension for enhanced development experience, a runtime enviorment, an API server, and a web based management UI!

## Features

- 🔍 VSCode Language Support
  - Syntax highlighting for SCXML files
  - Real-time validation and error diagnostics
  - Intelligent code completion
  - Hover information and documentation
  - Parent-child relationship validation
- 🚀 API Server
  - PostgreSQL backend for workflow state management
  - Drizzle ORM for type-safe database operations
  - Event subscription system
- 📊 Performance Monitoring & Analytics (TO BE BUILT)
  - Real-time metrics dashboard for accuracy, costs, and latency
  - Token usage tracking and optimization suggestions
  - Response quality evaluation with configurable criteria
  - A/B testing capabilities for prompt variations
- 🔬 Agent / Workflow Evaluation UI (TO BE BUILT)
  - Rule-based evaluation of agent outputs
  - Statistical analysis of response patterns
  - Custom evaluation pipelines
  - Automated regression testing
- 🔍 Observability (TO BE BUILT)
  - OpenTelemetry integration for distributed tracing
  - Detailed execution logs with context
  - Performance bottleneck identification
  - Error rate monitoring and alerting
- 🎨 Visual Workflow Editor (TO BE BUILT)
  - Drag-and-drop workflow creation
  - Real-time preview and testing
  - Version control integration
  - Collaborative editing features

## Prerequisites

- [Bun](https://bun.sh) (v1.1.42 or higher)
- [Node.js](https://nodejs.org) (for VSCode extension development)
- [PostgreSQL](https://www.postgresql.org) (for the API server)
- [VSCode](https://code.visualstudio.com) (for extension development)

## Getting Started

1. Clone the repository:

   ```bash
   git clone https://github.com/fw-ai/aiml.git
   cd aiml
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env.development
   ```

   Edit `.env.development` with your credentials:

   - Required AI API keys:
     - `OPENAI_API_KEY`: OpenAI API key
     - `ANTHROPIC_API_KEY`: Anthropic API key
   - PostgreSQL database credentials (for the API server)

4. Run database migrations:

   ```bash
   cd apps/server
   bun run migrate
   ```

5. Get everything running (except the vscode plugin.... see below):
   ```bash
   # CD to the root of the project
   cd ../..
   bun run dev
   ```

### VSCode Extension

```bash
cd apps/vscode-plugin
bun run dev        # Watch mode for development
bun run test       # Run tests
bun run package    # Build VSIX package
```

## Project Structure

```
.
├── apps/
│   ├── aiml-ui/            # Web-based management UI
│   ├── server/             # API server
│   └── vscode-plugin/      # VSCode extension
├── packages/
│   ├── element-config/     # Element schemas and configurations
│   ├── elements/           # Element implementations
│   ├── language-server/    # Language server for VSCode extension
│   ├── parser/             # AIML prompt parser
│   ├── runtime/            # Runtime execution engine
│   ├── shared/             # Base element class and factory
│   ├── tsconfig/           # Shared TypeScript configurations
│   ├── types/              # Shared TypeScript types
│   └── vscode/             # VSCode extension utilities
```

## Architecture

The AIML architecture has been refactored to address circular dependencies and improve maintainability. The key components are:

- **Types Package**: Contains all type definitions used throughout the codebase
- **Element Config Package**: Contains element schemas and configurations
- **Shared Package**: Contains the base element class and factory
- **Elements Package**: Contains specific element implementations
- **Runtime Package**: Contains the runtime execution engine
- **Parser Package**: Responsible for parsing AIML files and creating element instances

For more details on the architecture, see the [architecture documentation](design-docs/architecture.md).
