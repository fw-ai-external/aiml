/**
 * Runtime Event System
 *
 * This module provides event types and an EventEmitter for the runtime workflow system.
 * Events are emitted during workflow execution to provide visibility into step transitions
 * and condition evaluations.
 */

/**
 * Base event interface with common fields
 */
export interface BaseEvent {
  /** Unique identifier for the workflow run */
  runId: string;
  /** Account identifier for multi-tenant scenarios */
  accountId: string;
  /** Timestamp when the event occurred */
  timestamp: Date;
  /** Sequence number for ordering events within a run */
  sequenceNumber: number;
}

/**
 * Event emitted when a step transitions (enters or exits)
 */
export interface StepTransitionEvent extends BaseEvent {
  type: "step_transition";
  /** Unique identifier for the step */
  stepId: string;
  /** Status of the step transition */
  status: "entering" | "exiting" | "success" | "failed" | "running";
  /** Input data for the step (when entering) */
  input?: any;
  /** Output data from the step (when exiting) */
  output?: any;
  /** Additional metadata about the step */
  metadata?: {
    stepKey?: string;
    stepTag?: string;
    duration?: number;
  };
}

/**
 * Event emitted when a condition is evaluated (if/when/while)
 */
export interface ConditionCheckEvent extends BaseEvent {
  type: "condition_check";
  /** Unique identifier for the condition */
  conditionId: string;
  /** Type of condition being evaluated */
  conditionType: "if" | "when" | "while" | "else";
  /** The condition expression that was evaluated */
  expression?: string;
  /** Result of the condition evaluation */
  result: boolean;
  /** Input data available during condition evaluation */
  input?: any;
  /** Context data available during evaluation */
  context?: any;
}

/**
 * Union type of all possible events
 */
export type RuntimeEvent = StepTransitionEvent | ConditionCheckEvent;

/**
 * Event callback function type
 */
export type EventCallback = (event: RuntimeEvent) => void;

/**
 * Simple EventEmitter implementation for runtime events
 */
export class RuntimeEventEmitter {
  private callbacks: EventCallback[] = [];
  private sequenceCounter: number = 0;

  /**
   * Subscribe to runtime events
   * @param callback Function to call when events are emitted
   * @returns Unsubscribe function
   */
  public onEvent(callback: EventCallback): () => void {
    this.callbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Emit a step transition event
   */
  public emitStepTransition(
    event: Omit<StepTransitionEvent, "type" | "timestamp" | "sequenceNumber">
  ): void {
    const fullEvent: StepTransitionEvent = {
      ...event,
      type: "step_transition",
      timestamp: new Date(),
      sequenceNumber: ++this.sequenceCounter,
    };

    this.emit(fullEvent);
  }

  /**
   * Emit a condition check event
   */
  public emitConditionCheck(
    event: Omit<ConditionCheckEvent, "type" | "timestamp" | "sequenceNumber">
  ): void {
    const fullEvent: ConditionCheckEvent = {
      ...event,
      type: "condition_check",
      timestamp: new Date(),
      sequenceNumber: ++this.sequenceCounter,
    };

    this.emit(fullEvent);
  }

  /**
   * Emit an event to all subscribers
   */
  private emit(event: RuntimeEvent): void {
    for (const callback of this.callbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error("Error in event callback:", error);
      }
    }
  }

  /**
   * Reset the sequence counter (useful for new workflow runs)
   */
  public resetSequence(): void {
    this.sequenceCounter = 0;
  }

  /**
   * Get the current sequence number
   */
  public getCurrentSequence(): number {
    return this.sequenceCounter;
  }

  /**
   * Remove all event listeners
   */
  public removeAllListeners(): void {
    this.callbacks = [];
  }
}
