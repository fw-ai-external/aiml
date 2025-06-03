# WebSocket Testing Utilities

This directory contains comprehensive testing utilities for the WebSocket runtime event system.

## Overview

The testing suite provides:

1. **Unit Tests** - Test individual components in isolation
2. **Integration Tests** - Test component interactions
3. **End-to-End Tests** - Test complete workflows
4. **Test Utilities** - Helper functions and mock objects

## Test Structure

```
apps/server/
├── src/
│   ├── lib/
│   │   └── runtimeEventBus.test.ts          # Unit tests for event bus
│   ├── endpoints/
│   │   └── websocket.test.ts                # Unit tests for WebSocket endpoint
│   ├── integration/
│   │   └── websocket-integration.test.ts    # Integration tests
│   └── test-utils/
│       ├── websocket-helpers.ts             # Test helper functions
│       ├── test-config.ts                   # Test configuration
│       └── README.md                        # This file
└── e2e/
    └── websocket-runtime-events.e2e.ts      # End-to-end tests
```

## Running Tests

### All Tests

```bash
npm run test
```

### Specific Test Suites

```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# End-to-end tests only
npm run test:e2e

# WebSocket-specific tests
npm run test:websocket

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

## Test Utilities

### MockWebSocket

A comprehensive WebSocket mock for testing:

```typescript
import { MockWebSocket } from "../test-utils/websocket-helpers";

const mockWs = new MockWebSocket();

// Send messages
mockWs.receiveMessage({ type: "subscribe", data: { runId: "test" } });

// Check received messages
const messages = mockWs.getAllMessages();
const lastMessage = mockWs.getLastMessage();

// Wait for specific messages
await mockWs.waitForMessageType("subscribed");
await mockWs.waitForMessages(5);

// Get runtime events only
const events = mockWs.getRuntimeEvents();
```

### MockWorkflowExecution

Simulates workflow execution with event emission:

```typescript
import { MockWorkflowExecution } from "../test-utils/websocket-helpers";

const workflow = new MockWorkflowExecution("run-1", "account-1", eventBus);

// Execute simple workflow
await workflow.executeWorkflow(["step1", "step2", "step3"]);

// Execute with error
await workflow.executeWithError(["step1", "step2"], 1, "Custom error");

// Execute long-running workflow
await workflow.executeLongRunningWorkflow(20, 5);
```

### TestDataFixtures

Pre-built test data for common scenarios:

```typescript
import { TestDataFixtures } from "../test-utils/websocket-helpers";

// Create sample events
const stepEvent = TestDataFixtures.createStepTransitionEvent({
  runId: "custom-run",
  stepId: "custom-step",
});

const conditionEvent = TestDataFixtures.createConditionCheckEvent({
  result: false,
});

// Create event sequences
const events = TestDataFixtures.createStepSequence("run-1", "account-1", [
  "step1",
  "step2",
  "step3",
]);

// Multi-account events
const multiAccountEvents = TestDataFixtures.createMultiAccountEvents(
  "shared-run",
  ["account-1", "account-2"],
  3
);
```

### WebSocketTestHelpers

High-level testing utilities:

```typescript
import { WebSocketTestHelpers } from "../test-utils/websocket-helpers";

// Create test event bus
const eventBus = WebSocketTestHelpers.createTestEventBus({
  maxEvents: 100,
  ttlMs: 60000,
});

// Subscribe to workflow
await WebSocketTestHelpers.subscribeToWorkflow(mockWs, "run-1");

// Get historical events
const events = await WebSocketTestHelpers.getHistoricalEvents(
  mockWs,
  "run-1",
  5
);

// Verify event sequence integrity
const isValid = WebSocketTestHelpers.verifyEventSequence(events);

// Assert account isolation
WebSocketTestHelpers.assertAccountIsolation(
  account1Events,
  account2Events,
  "account-1",
  "account-2"
);
```

## Test Configuration

The `test-config.ts` file provides centralized configuration:

```typescript
import { TEST_CONFIG } from "../test-utils/test-config";

// Use predefined test data
const user = TEST_CONFIG.users.user1;
const workflow = TEST_CONFIG.workflows.simple;
const runId = TEST_CONFIG.runIds.basic;
```

### Environment Setup

```typescript
import { TestEnvironment } from "../test-utils/test-config";

// Setup test environment
TestEnvironment.setup();

// Generate unique IDs
const runId = TestEnvironment.generateRunId();
const accountId = TestEnvironment.generateAccountId();

// Utility functions
await TestEnvironment.delay(100);
const result = await TestEnvironment.retry(asyncFunction, 3, 100);
```

### Test Assertions

```typescript
import { TestAssertions } from "../test-utils/test-config";

// Custom assertions
TestAssertions.assertSameLength(actual, expected);
TestAssertions.assertContains(array, items);
TestAssertions.assertInRange(value, 0, 100);

// Promise assertions
await TestAssertions.assertResolvesWithin(promise, 1000);
await TestAssertions.assertRejectsWithin(promise, 1000);
```

### Performance Testing

```typescript
import { PerformanceTestUtils } from "../test-utils/test-config";

// Measure execution time
const { result, timeMs } = await PerformanceTestUtils.measureTime(asyncFn);

// Benchmark function
const stats = await PerformanceTestUtils.benchmark(asyncFn, 10);
console.log(`Average time: ${stats.avgTime}ms`);

// Memory usage
const { result, memoryUsed } = await PerformanceTestUtils.measureMemory(
  asyncFn
);
```

## Test Scenarios Covered

### Unit Tests (runtimeEventBus.test.ts)

- Event subscription and unsubscription
- Event broadcasting and filtering
- Account isolation
- TTL and cleanup
- Queue management
- Error handling
- Historical event retrieval

### Unit Tests (websocket.test.ts)

- WebSocket connection handling
- Message parsing and routing
- Authentication
- Subscription management
- Historical event requests
- Error scenarios
- Connection lifecycle

### Integration Tests (websocket-integration.test.ts)

- Event bus and WebSocket integration
- Account isolation across components
- Room management
- Historical event retrieval
- Connection management
- Multi-client scenarios

### End-to-End Tests (websocket-runtime-events.e2e.ts)

- Complete workflow execution flow
- Real-time event streaming
- Reconnection with sequence tracking
- Multi-account isolation
- Concurrent workflows
- Performance and stress testing

## Best Practices

### Test Organization

- Group related tests in describe blocks
- Use descriptive test names
- Setup and teardown properly
- Use beforeEach/afterEach for common setup

### Mock Usage

- Use MockWebSocket for WebSocket testing
- Use MockWorkflowExecution for workflow simulation
- Clean up mocks after tests
- Verify mock interactions

### Async Testing

- Always await async operations
- Use proper timeouts
- Handle promise rejections
- Test both success and error cases

### Data Management

- Use TestDataFixtures for consistent test data
- Generate unique IDs for isolation
- Clean up test data after tests
- Use realistic test scenarios

### Performance Testing

- Test with realistic data volumes
- Measure execution times
- Monitor memory usage
- Test concurrent scenarios

## Debugging Tests

### Enable Verbose Logging

```bash
DEBUG=true npm run test
```

### Run Specific Tests

```bash
# Run single test file
bun test src/lib/runtimeEventBus.test.ts

# Run specific test
bun test -t "should handle subscription"
```

### Test Coverage

```bash
npm run test:coverage
```

This will generate a coverage report showing which parts of the code are tested.

## Contributing

When adding new tests:

1. Follow the existing test structure
2. Use the provided test utilities
3. Add appropriate documentation
4. Ensure tests are isolated and repeatable
5. Test both success and error scenarios
6. Update this README if adding new utilities
