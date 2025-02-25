# AIML Parser End-to-End Tests

This directory contains end-to-end tests for the AIML parser, using example AIML files from the project.

## Test Structure

The tests are organized into three main files:

1. **parser.test.ts**: Basic parsing tests that verify all example AIML files can be parsed without errors.

2. **structure-validation.test.ts**: Tests that validate the structural integrity of parsed AIML files, ensuring they contain the expected elements and attributes.

3. **workflow-integration.test.ts**: Tests that validate the integration between the parser and workflow execution, including SCXML generation.

## Running the Tests

To run all e2e tests:

```bash
bun test:e2e
```

Or, to run a specific test file:

```bash
bun test ./e2e/parser.test.ts
```

## Test Coverage

These tests cover:

- Basic parsing functionality for all example AIML files
- Structure validation for AIML files
- SCXML generation from AIML files
- XML validation of generated SCXML
- Integration with workflow execution

## Adding New Tests

When adding new example AIML files, consider adding corresponding tests to ensure they are parsed correctly and have the expected structure.

## Directory Structure

```
e2e/
├── parser.test.ts           # Basic parsing tests
├── structure-validation.test.ts  # Structure validation tests
├── workflow-integration.test.ts  # Integration tests
└── README.md                # This file
```
