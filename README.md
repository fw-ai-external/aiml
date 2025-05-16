# AIML Agentic Prompting Language

> [!IMPORTANT]  
> This repository is in a high state of flux, and might not build correctly at this moment, please be patient as rapid progress is made :)

A comprehensive toolset for working with AIML based workflows, both familiar, yet totally new! featuring a VSCode extension for enhanced development experience, a runtime enviorment, an API server, and a web based management UI!

## Features

- 🔬 Agent / Workflow Developer Web UI (In-Progress)
  - Visual output of agent workflows including each LLM call's full input and output
  - Logging/tracing UI for each request
  - Debug prompt parsing issues
  - Automated evaluation of agentic workflows
  - Automated regression testing
- 👨‍💻 VSCode Language Support
  - Syntax highlighting for AIML files
  - Real-time validation and error diagnostics
  - Intelligent code completion
  - Hover information and documentation
  - PLUS all the features of the evaluation UI
- 🚀 API Server
  - Allows use of AIML features on top of any LLM provider supporting:
    - OpenAI Chat API specification
    - OpenAI Response API specification (In-Progress)
    - Anthropic API specification ((TO BE BUILT)
  - PostgreSQL backend for workflow state management
  - Drizzle ORM for type-safe database operations
  - Event subscription system
- 📊 Performance Monitoring & Analytics (TO BE BUILT)
  - Real-time metrics dashboard for accuracy, costs, and latency
  - Token usage tracking and optimization suggestions
  - Response quality evaluation with configurable criteria
  - A/B testing capabilities for prompt variations
- 🔍 Observability (TO BE BUILT)
  - OpenTelemetry integration for distributed tracing
  - Detailed execution logs with context
  - Performance bottleneck identification
  - Error rate monitoring and alerting

## Prerequisites

- [Bun](https://bun.sh) (v1.1.42 or higher)
- [Node.js](https://nodejs.org) (for VSCode extension development)
- [PostgreSQL](https://www.postgresql.org) (for the API server)
- [VSCode](https://code.visualstudio.com) (for extension development)

## Getting Started

1. Clone the repository:

   ```bash
   git clone https://github.com/fw-ai-external/aiml.git
   cd aiml
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Set up environment variables:

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.development` with your credentials:

   - `FIREWORKS_API_KEY`: Fireworks API key for tests
   - `DATABASE_URL` PostgreSQL database credentials (for the API server)

4. Run database migrations:

   ```bash
   bun run initial-setup
   ```

5. Get everything running (except the vscode plugin.... see below):
   ```bash
   bun run dev
   ```

### VSCode Extension

```bash
cd packages/vscode
bun run dev        # Watch mode for development
bun run test       # Run tests
bun run package    # Build VSIX package
```

## Project Structure

```
AIML
├── apps/
│   ├── aiml-ui/            # Web-based management UI (Next.js)
│   ├── landing-page/       # Project landing page (Next.js)
│   └── server/             # API server (Hono)
├── packages/
│   ├── parser/             # AIML prompt parser
│   ├── runtime/            # Runtime execution engine
│   ├── shared/             # Shared utilities and base components
│   ├── tsconfig/           # Shared TypeScript configurations
│   └-─ vscode/             # VSCode extension
└── turbo.json              # Turborepo configuration
```
