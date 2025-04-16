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

   - Supported LLM providers AI API keys:
     - `FIREWORKS_API_KEY`: Fireworks API key
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
│   ├── aiml-ui/            # Web-based management UI (Next.js)
│   ├── landing-page/       # Project landing page (Astro)
│   ├── server/             # API server (Hono/Elysia - TBD)
│   └── vscode-plugin/      # VSCode extension
├── packages/
│   ├── language-server/    # Language server implementation for VSCode extension
│   ├── parser/             # AIML prompt parser
│   ├── runtime/            # Runtime execution engine
│   ├── shared/             # Shared utilities and base components
│   ├── test-tmp/           # Temporary files for testing
│   ├── tsconfig/           # Shared TypeScript configurations
│   └── vscode/             # VSCode extension utilities
├── design-docs/            # Design and architecture documents
├── scripts/                # Utility scripts
└── turbo.json              # Turborepo configuration
```

## Architecture

The AIML architecture utilizes a monorepo structure managed by Turborepo. Key components include:

- **`packages/shared`**: Contains base types, utilities, and classes used across multiple packages.
- **`packages/parser`**: Responsible for parsing AIML (MDX/SCXML flavored) files and constructing the initial workflow representation.
- **`packages/runtime`**: Contains the core execution engine (`Mastra`) that manages workflow state and transitions based on the parsed structure.
- **`packages/language-server`**: Provides language intelligence (diagnostics, completion, hover info) for AIML files in VSCode.
- **`packages/vscode`**: Contains utilities specific to the VSCode extension development.
- **`packages/tsconfig`**: Centralized TypeScript configurations.
- **`apps/server`**: The backend API server managing state persistence (PostgreSQL w/ Drizzle) and potentially handling events.
- **`apps/aiml-ui`**: A web interface (likely Next.js) for managing and monitoring workflows.
- **`apps/vscode-plugin`**: Integrates the language server and other features into VSCode.
- **`apps/landing-page`**: The public-facing landing page for the project (Astro).

This structure aims to separate concerns, improve code sharing, and facilitate independent development and deployment of components.

For more details on the architecture, see the [architecture documentation](design-docs/architecture.md).
