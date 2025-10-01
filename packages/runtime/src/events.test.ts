/**
 * Tests for the runtime event system
 */

import { afterEach, beforeEach, describe, expect, test, spyOn } from "bun:test";
import {
  RuntimeEventEmitter,
  type StepTransitionEvent,
  type ConditionCheckEvent,
} from "./events";

describe("RuntimeEventEmitter", () => {
  let eventEmitter: RuntimeEventEmitter;

  beforeEach(() => {
    eventEmitter = new RuntimeEventEmitter();
  });

  afterEach(() => {
    eventEmitter.removeAllListeners();
  });

  test("should emit step transition events", () => {
    const events: StepTransitionEvent[] = [];

    eventEmitter.onEvent((event) => {
      if (event.type === "step_transition") {
        events.push(event);
      }
    });

    eventEmitter.emitStepTransition({
      runId: "test-run-1",
      accountId: "test-account",
      stepId: "step-1",
      status: "entering",
      input: { test: "data" },
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "step_transition",
      runId: "test-run-1",
      accountId: "test-account",
      stepId: "step-1",
      status: "entering",
      input: { test: "data" },
      sequenceNumber: 1,
    });
    expect(events[0].timestamp).toBeInstanceOf(Date);
  });

  test("should emit condition check events", () => {
    const events: ConditionCheckEvent[] = [];

    eventEmitter.onEvent((event) => {
      if (event.type === "condition_check") {
        events.push(event);
      }
    });

    eventEmitter.emitConditionCheck({
      runId: "test-run-1",
      accountId: "test-account",
      conditionId: "condition-1",
      conditionType: "if",
      expression: "x > 5",
      result: true,
      context: { x: 10 },
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "condition_check",
      runId: "test-run-1",
      accountId: "test-account",
      conditionId: "condition-1",
      conditionType: "if",
      expression: "x > 5",
      result: true,
      context: { x: 10 },
      sequenceNumber: 1,
    });
    expect(events[0].timestamp).toBeInstanceOf(Date);
  });

  test("should maintain sequence numbers", () => {
    const events: any[] = [];

    eventEmitter.onEvent((event) => {
      events.push(event);
    });

    eventEmitter.emitStepTransition({
      runId: "test-run-1",
      accountId: "test-account",
      stepId: "step-1",
      status: "entering",
    });

    eventEmitter.emitConditionCheck({
      runId: "test-run-1",
      accountId: "test-account",
      conditionId: "condition-1",
      conditionType: "if",
      result: true,
    });

    eventEmitter.emitStepTransition({
      runId: "test-run-1",
      accountId: "test-account",
      stepId: "step-1",
      status: "success",
    });

    expect(events).toHaveLength(3);
    expect(events[0].sequenceNumber).toBe(1);
    expect(events[1].sequenceNumber).toBe(2);
    expect(events[2].sequenceNumber).toBe(3);
  });

  test("should reset sequence numbers", () => {
    const events: any[] = [];

    eventEmitter.onEvent((event) => {
      events.push(event);
    });

    eventEmitter.emitStepTransition({
      runId: "test-run-1",
      accountId: "test-account",
      stepId: "step-1",
      status: "entering",
    });

    expect(events[0].sequenceNumber).toBe(1);

    eventEmitter.resetSequence();

    eventEmitter.emitStepTransition({
      runId: "test-run-2",
      accountId: "test-account",
      stepId: "step-1",
      status: "entering",
    });

    expect(events[1].sequenceNumber).toBe(1);
  });

  test("should handle multiple subscribers", () => {
    const events1: any[] = [];
    const events2: any[] = [];

    eventEmitter.onEvent((event) => {
      events1.push(event);
    });

    eventEmitter.onEvent((event) => {
      events2.push(event);
    });

    eventEmitter.emitStepTransition({
      runId: "test-run-1",
      accountId: "test-account",
      stepId: "step-1",
      status: "entering",
    });

    expect(events1).toHaveLength(1);
    expect(events2).toHaveLength(1);
    expect(events1[0]).toEqual(events2[0]);
  });

  test("should allow unsubscribing", () => {
    const events: any[] = [];

    const unsubscribe = eventEmitter.onEvent((event) => {
      events.push(event);
    });

    eventEmitter.emitStepTransition({
      runId: "test-run-1",
      accountId: "test-account",
      stepId: "step-1",
      status: "entering",
    });

    expect(events).toHaveLength(1);

    unsubscribe();

    eventEmitter.emitStepTransition({
      runId: "test-run-1",
      accountId: "test-account",
      stepId: "step-2",
      status: "entering",
    });

    expect(events).toHaveLength(1); // Should not have received the second event
  });

  test("should handle errors in callbacks gracefully", () => {
    const events: any[] = [];
    const consoleSpy = spyOn(console, "error").mockImplementation(() => {});

    // Add a callback that throws an error
    eventEmitter.onEvent(() => {
      throw new Error("Test error");
    });

    // Add a normal callback
    eventEmitter.onEvent((event) => {
      events.push(event);
    });

    eventEmitter.emitStepTransition({
      runId: "test-run-1",
      accountId: "test-account",
      stepId: "step-1",
      status: "entering",
    });

    // The normal callback should still receive the event
    expect(events).toHaveLength(1);
    // Error should be logged
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error in event callback:",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});
