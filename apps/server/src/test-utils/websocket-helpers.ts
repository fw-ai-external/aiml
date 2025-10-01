/**
 * Test Utilities for WebSocket Testing
 *
 * Helper functions for WebSocket testing, mock workflow creation, and test data fixtures
 */

import { RuntimeEventEmitter, type RuntimeEvent } from "@aiml/runtime";
import { RuntimeEventBus } from "../lib/runtimeEventBus";

/**
 * Mock WebSocket implementation for testing
 */
export class MockWebSocket {
  public readyState = 1; // WebSocket.OPEN
  public sentMessages: string[] = [];
  private eventHandlers: { [key: string]: Function[] } = {};

  send(message: string) {
    this.sentMessages.push(message);
  }

  on(event: string, handler: Function) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }

  emit(event: string, ...args: any[]) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach((handler) => handler(...args));
    }
  }

  close() {
    this.readyState = 3; // WebSocket.CLOSED
    this.emit("close");
  }

  error(err: Error) {
    this.emit("error", err);
  }

  /**
   * Helper to simulate receiving a message
   */
  receiveMessage(message: any) {
    const buffer = Buffer.from(JSON.stringify(message));
    this.emit("message", buffer);
  }

  /**
   * Get the last message sent
   */
  getLastMessage() {
    return this.sentMessages.length > 0
      ? JSON.parse(this.sentMessages[this.sentMessages.length - 1])
      : null;
  }

  /**
   * Get all messages as parsed JSON
   */
  getAllMessages() {
    return this.sentMessages.map((msg) => JSON.parse(msg));
  }

  /**
   * Clear all sent messages
   */
  clearMessages() {
    this.sentMessages = [];
  }

  /**
   * Get messages of a specific type
   */
  getMessagesByType(type: string) {
    return this.getAllMessages().filter((msg) => msg.type === type);
  }

  /**
   * Get runtime events only
   */
  getRuntimeEvents() {
    return this.getMessagesByType("runtime_event").map((msg) => msg.data);
  }

  /**
   * Wait for a specific number of messages
   */
  async waitForMessages(count: number, timeout = 1000): Promise<any[]> {
    const startTime = Date.now();

    while (this.sentMessages.length < count) {
      if (Date.now() - startTime > timeout) {
        throw new Error(
          `Timeout waiting for ${count} messages. Got ${this.sentMessages.length}`
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }

    return this.getAllMessages();
  }

  /**
   * Wait for a specific message type
   */
  async waitForMessageType(type: string, timeout = 1000): Promise<any> {
    const startTime = Date.now();

    while (true) {
      const messages = this.getMessagesByType(type);
      if (messages.length > 0) {
        return messages[messages.length - 1];
      }

      if (Date.now() - startTime > timeout) {
        throw new Error(`Timeout waiting for message type: ${type}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
}

/**
 * Mock workflow execution that emits events
 */
export class MockWorkflowExecution {
  private eventEmitter: RuntimeEventEmitter;
  private eventBus: RuntimeEventBus;
  private runId: string;
  private accountId: string;

  constructor(runId: string, accountId: string, eventBus: RuntimeEventBus) {
    this.runId = runId;
    this.accountId = accountId;
    this.eventBus = eventBus;
    this.eventEmitter = new RuntimeEventEmitter();

    // Connect runtime events to the event bus
    this.eventEmitter.onEvent((event) => {
      this.eventBus.broadcastEvent(event);
    });
  }

  /**
   * Execute a simple workflow with the given steps
   */
  async executeWorkflow(
    steps: string[],
    options: {
      includeConditions?: boolean;
      stepDelay?: number;
      metadata?: any;
    } = {}
  ): Promise<void> {
    const { includeConditions = true, stepDelay = 10, metadata = {} } = options;

    for (let i = 0; i < steps.length; i++) {
      const stepId = steps[i];

      // Emit step entering
      this.eventEmitter.emitStepTransition({
        runId: this.runId,
        accountId: this.accountId,
        stepId,
        status: "entering",
        input: { stepIndex: i, ...metadata },
      });

      // Simulate some processing time
      if (stepDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, stepDelay));
      }

      // Emit condition check if needed
      if (includeConditions && i % 2 === 0) {
        this.eventEmitter.emitConditionCheck({
          runId: this.runId,
          accountId: this.accountId,
          conditionId: `condition-${i}`,
          conditionType: "if",
          expression: `step${i}.completed`,
          result: true,
          context: { stepIndex: i, ...metadata },
        });
      }

      // Emit step success
      this.eventEmitter.emitStepTransition({
        runId: this.runId,
        accountId: this.accountId,
        stepId,
        status: "success",
        output: { result: `Step ${i} completed`, ...metadata },
        metadata: { duration: stepDelay },
      });
    }
  }

  /**
   * Execute a workflow with an error at a specific step
   */
  async executeWithError(
    steps: string[],
    errorAtStep: number,
    errorMessage = "Simulated error"
  ): Promise<void> {
    for (let i = 0; i < steps.length; i++) {
      const stepId = steps[i];

      this.eventEmitter.emitStepTransition({
        runId: this.runId,
        accountId: this.accountId,
        stepId,
        status: "entering",
        input: { stepIndex: i },
      });

      if (i === errorAtStep) {
        this.eventEmitter.emitStepTransition({
          runId: this.runId,
          accountId: this.accountId,
          stepId,
          status: "failed",
          output: { error: errorMessage },
        });
        break;
      }

      this.eventEmitter.emitStepTransition({
        runId: this.runId,
        accountId: this.accountId,
        stepId,
        status: "success",
        output: { result: `Step ${i} completed` },
      });
    }
  }

  /**
   * Execute a long-running workflow with periodic updates
   */
  async executeLongRunningWorkflow(
    totalSteps: number,
    updateInterval = 5
  ): Promise<void> {
    for (let i = 0; i < totalSteps; i++) {
      const stepId = `long-step-${i}`;

      this.eventEmitter.emitStepTransition({
        runId: this.runId,
        accountId: this.accountId,
        stepId,
        status: "entering",
        input: { stepIndex: i, totalSteps },
      });

      // Emit running status periodically
      if (i % updateInterval === 0) {
        this.eventEmitter.emitStepTransition({
          runId: this.runId,
          accountId: this.accountId,
          stepId,
          status: "running",
          metadata: {
            stepKey: `progress-${i}`,
            duration: (i / totalSteps) * 100,
          },
        });
      }

      this.eventEmitter.emitStepTransition({
        runId: this.runId,
        accountId: this.accountId,
        stepId,
        status: "success",
        output: { result: `Long step ${i} completed` },
      });

      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }
}

/**
 * Test data fixtures for events
 */
export class TestDataFixtures {
  /**
   * Create a sample step transition event
   */
  static createStepTransitionEvent(
    overrides: Partial<RuntimeEvent> = {}
  ): RuntimeEvent {
    return {
      type: "step_transition",
      runId: "test-run-1",
      accountId: "test-account-1",
      stepId: "test-step-1",
      status: "entering",
      timestamp: new Date(),
      sequenceNumber: 1,
      ...overrides,
    } as RuntimeEvent;
  }

  /**
   * Create a sample condition check event
   */
  static createConditionCheckEvent(
    overrides: Partial<RuntimeEvent> = {}
  ): RuntimeEvent {
    return {
      type: "condition_check",
      runId: "test-run-1",
      accountId: "test-account-1",
      conditionId: "test-condition-1",
      conditionType: "if",
      expression: "x > 5",
      result: true,
      timestamp: new Date(),
      sequenceNumber: 1,
      ...overrides,
    } as RuntimeEvent;
  }

  /**
   * Create a sequence of step transition events
   */
  static createStepSequence(
    runId: string,
    accountId: string,
    stepIds: string[],
    startSequence = 1
  ): RuntimeEvent[] {
    const events: RuntimeEvent[] = [];
    let sequence = startSequence;

    for (const stepId of stepIds) {
      // Entering event
      events.push({
        type: "step_transition",
        runId,
        accountId,
        stepId,
        status: "entering",
        timestamp: new Date(),
        sequenceNumber: sequence++,
        input: { stepId },
      } as RuntimeEvent);

      // Success event
      events.push({
        type: "step_transition",
        runId,
        accountId,
        stepId,
        status: "success",
        timestamp: new Date(),
        sequenceNumber: sequence++,
        output: { result: `${stepId} completed` },
      } as RuntimeEvent);
    }

    return events;
  }

  /**
   * Create events for multiple accounts
   */
  static createMultiAccountEvents(
    runId: string,
    accounts: string[],
    stepsPerAccount = 2
  ): RuntimeEvent[] {
    const events: RuntimeEvent[] = [];
    let globalSequence = 1;

    for (const accountId of accounts) {
      for (let i = 0; i < stepsPerAccount; i++) {
        events.push({
          type: "step_transition",
          runId,
          accountId,
          stepId: `${accountId}-step-${i}`,
          status: "entering",
          timestamp: new Date(),
          sequenceNumber: globalSequence++,
        } as RuntimeEvent);

        events.push({
          type: "step_transition",
          runId,
          accountId,
          stepId: `${accountId}-step-${i}`,
          status: "success",
          timestamp: new Date(),
          sequenceNumber: globalSequence++,
        } as RuntimeEvent);
      }
    }

    return events;
  }
}

/**
 * WebSocket test helper functions
 */
export class WebSocketTestHelpers {
  /**
   * Create a test event bus with custom configuration
   */
  static createTestEventBus(
    config: {
      maxEvents?: number;
      ttlMs?: number;
    } = {}
  ): RuntimeEventBus {
    return new RuntimeEventBus({
      maxEvents: config.maxEvents ?? 100,
      ttlMs: config.ttlMs ?? 60000, // 1 minute default
    });
  }

  /**
   * Subscribe a mock WebSocket to a workflow
   */
  static async subscribeToWorkflow(
    ws: MockWebSocket,
    runId: string,
    lastReceivedSequenceNumber = 0
  ): Promise<void> {
    ws.receiveMessage({
      type: "subscribe",
      data: {
        runId,
        lastReceivedSequenceNumber,
      },
    });

    // Wait for subscription confirmation
    await ws.waitForMessageType("subscribed");
  }

  /**
   * Get historical events for a workflow
   */
  static async getHistoricalEvents(
    ws: MockWebSocket,
    runId: string,
    afterSequenceNumber = 0
  ): Promise<RuntimeEvent[]> {
    ws.receiveMessage({
      type: "get_historical",
      data: {
        runId,
        afterSequenceNumber,
      },
    });

    const response = await ws.waitForMessageType("historical_events");
    return response.data.events;
  }

  /**
   * Send a ping and wait for pong
   */
  static async pingPong(ws: MockWebSocket): Promise<void> {
    ws.receiveMessage({ type: "ping" });
    await ws.waitForMessageType("pong");
  }

  /**
   * Verify event sequence integrity
   */
  static verifyEventSequence(events: RuntimeEvent[]): boolean {
    if (events.length === 0) return true;

    const sequences = events.map((e) => e.sequenceNumber).sort((a, b) => a - b);

    for (let i = 1; i < sequences.length; i++) {
      if (sequences[i] !== sequences[i - 1] + 1) {
        return false;
      }
    }

    return true;
  }

  /**
   * Filter events by account
   */
  static filterEventsByAccount(
    events: RuntimeEvent[],
    accountId: string
  ): RuntimeEvent[] {
    return events.filter((event) => event.accountId === accountId);
  }

  /**
   * Filter events by run ID
   */
  static filterEventsByRunId(
    events: RuntimeEvent[],
    runId: string
  ): RuntimeEvent[] {
    return events.filter((event) => event.runId === runId);
  }

  /**
   * Get events after a specific sequence number
   */
  static getEventsAfterSequence(
    events: RuntimeEvent[],
    sequenceNumber: number
  ): RuntimeEvent[] {
    return events.filter((event) => event.sequenceNumber > sequenceNumber);
  }

  /**
   * Create a test user object
   */
  static createTestUser(
    accountId: string,
    username = "testuser"
  ): {
    username: string;
    email: string;
    accountId: string;
    apiKey: string;
  } {
    return {
      username,
      email: `${username}@example.com`,
      accountId,
      apiKey: `test-api-key-${accountId}`,
    };
  }

  /**
   * Wait for a specific number of runtime events
   */
  static async waitForRuntimeEvents(
    ws: MockWebSocket,
    count: number,
    timeout = 1000
  ): Promise<RuntimeEvent[]> {
    const startTime = Date.now();

    while (true) {
      const runtimeEvents = ws.getRuntimeEvents();
      if (runtimeEvents.length >= count) {
        return runtimeEvents.slice(0, count);
      }

      if (Date.now() - startTime > timeout) {
        throw new Error(
          `Timeout waiting for ${count} runtime events. Got ${runtimeEvents.length}`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  /**
   * Assert that events are properly isolated by account
   */
  static assertAccountIsolation(
    account1Events: RuntimeEvent[],
    account2Events: RuntimeEvent[],
    account1Id: string,
    account2Id: string
  ): void {
    // Verify all account1 events belong to account1
    account1Events.forEach((event) => {
      if (event.accountId !== account1Id) {
        throw new Error(
          `Account isolation violated: found ${event.accountId} event in ${account1Id} events`
        );
      }
    });

    // Verify all account2 events belong to account2
    account2Events.forEach((event) => {
      if (event.accountId !== account2Id) {
        throw new Error(
          `Account isolation violated: found ${event.accountId} event in ${account2Id} events`
        );
      }
    });
  }
}
