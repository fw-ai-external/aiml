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

## Getting Started

To use AIML you dont need to do anything except call an AIML enabled LLM API Such as [Fireworks OpenAI compattible Chat API](https://aiml.fireworks.ai/docs/using-with-fireworks). See the docs [here](https://aiml.fireworks.ai/docs/using-with-fireworks) to get started with using AIML!

### Using AIML with a provider that does not yet support AIML

_Prerequisites_

- [Bun](https://bun.sh/docs/cli/install) (v1.1.42 or higher)
- [Node.js](https://nodejs.org) (for VSCode extension development)
- [PostgreSQL](https://www.postgresql.org) (for the API server)
- [VSCode](https://code.visualstudio.com) (for extension development)

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

These need to be set via your environment or using .env files. If using .env files, you will need to do so in the project root as well as in `/apps/server`

```bash
cp .env.example .env && cp apps/server/.env.example apps/server/.env
```

Edit both `.env` files with your credentials:

```
# Use the URL of your Postgres database
# You can use a local Postgres database by installing Postgres locally
# == OR ==
#Using a cloud based Postgres database such as Neon https://neon.tech
DATABASE_URL=postgresql://postgres:postgres@0.0.0.0:5432/aiml-server
```

4. Run database migrations:

   ```bash
   bun run initial-setup
   ```

5. Get everything running (except the vscode plugin.... see below):
   ```bash
   bun run dev
   ```

## AIML support in your IDE

To get AIML syntax highlighting, auto-complete and more! Check out our [IDE plugin docs](https://aiml.fireworks.ai/docs/editor-plugins)
