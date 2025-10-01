/**
 * Test Configuration and Setup
 *
 * Centralized configuration for WebSocket testing
 */

export const TEST_CONFIG = {
  // Event bus configuration for testing
  eventBus: {
    maxEvents: 1000,
    ttlMs: 300000, // 5 minutes
  },

  // WebSocket test timeouts
  timeouts: {
    connection: 1000,
    message: 1000,
    workflow: 5000,
  },

  // Test data
  accounts: {
    account1: "test-account-1",
    account2: "test-account-2",
    account3: "test-account-3",
  },

  runIds: {
    basic: "test-run-basic",
    complex: "test-run-complex",
    error: "test-run-error",
    longRunning: "test-run-long",
    multiAccount: "test-run-multi",
  },

  // Sample workflow steps
  workflows: {
    simple: ["step1", "step2", "step3"],
    complex: ["init", "validate", "process", "transform", "output", "cleanup"],
    error: ["step1", "step2", "error-step", "step4"],
    longRunning: Array.from({ length: 20 }, (_, i) => `long-step-${i + 1}`),
  },

  // Test users
  users: {
    user1: {
      username: "testuser1",
      email: "testuser1@example.com",
      accountId: "test-account-1",
      apiKey: "test-api-key-1",
    },
    user2: {
      username: "testuser2",
      email: "testuser2@example.com",
      accountId: "test-account-2",
      apiKey: "test-api-key-2",
    },
    user3: {
      username: "testuser3",
      email: "testuser3@example.com",
      accountId: "test-account-3",
      apiKey: "test-api-key-3",
    },
  },
};

/**
 * Test environment setup utilities
 */
export class TestEnvironment {
  /**
   * Setup test environment before running tests
   */
  static setup() {
    // Set test environment variables if needed
    process.env.NODE_ENV = "test";

    // Mock console methods to reduce noise during testing
    if (process.env.SILENT_TESTS === "true") {
      console.log = () => {};
      console.info = () => {};
      console.warn = () => {};
    }
  }

  /**
   * Cleanup test environment after tests
   */
  static cleanup() {
    // Restore console methods if they were mocked
    if (process.env.SILENT_TESTS === "true") {
      console.log = console.log;
      console.info = console.info;
      console.warn = console.warn;
    }
  }

  /**
   * Generate unique test identifiers
   */
  static generateTestId(prefix = "test"): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique run ID for tests
   */
  static generateRunId(): string {
    return this.generateTestId("run");
  }

  /**
   * Generate unique account ID for tests
   */
  static generateAccountId(): string {
    return this.generateTestId("account");
  }

  /**
   * Create test delay
   */
  static async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Retry a function with exponential backoff
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxAttempts = 3,
    baseDelay = 100
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt === maxAttempts) {
          throw lastError;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1);
        await this.delay(delay);
      }
    }

    throw lastError!;
  }
}

/**
 * Test assertions and utilities
 */
export class TestAssertions {
  /**
   * Assert that two arrays have the same length
   */
  static assertSameLength<T>(
    actual: T[],
    expected: T[],
    message?: string
  ): void {
    if (actual.length !== expected.length) {
      throw new Error(
        message ||
          `Expected array length ${expected.length}, got ${actual.length}`
      );
    }
  }

  /**
   * Assert that an array contains specific items
   */
  static assertContains<T>(array: T[], items: T[], message?: string): void {
    for (const item of items) {
      if (!array.includes(item)) {
        throw new Error(
          message || `Expected array to contain ${JSON.stringify(item)}`
        );
      }
    }
  }

  /**
   * Assert that an array does not contain specific items
   */
  static assertNotContains<T>(array: T[], items: T[], message?: string): void {
    for (const item of items) {
      if (array.includes(item)) {
        throw new Error(
          message || `Expected array to not contain ${JSON.stringify(item)}`
        );
      }
    }
  }

  /**
   * Assert that a value is within a range
   */
  static assertInRange(
    value: number,
    min: number,
    max: number,
    message?: string
  ): void {
    if (value < min || value > max) {
      throw new Error(
        message || `Expected value ${value} to be between ${min} and ${max}`
      );
    }
  }

  /**
   * Assert that a promise resolves within a timeout
   */
  static async assertResolvesWithin<T>(
    promise: Promise<T>,
    timeoutMs: number,
    message?: string
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(message || `Promise did not resolve within ${timeoutMs}ms`)
        );
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Assert that a promise rejects within a timeout
   */
  static async assertRejectsWithin(
    promise: Promise<any>,
    timeoutMs: number,
    message?: string
  ): Promise<Error> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(message || `Promise did not reject within ${timeoutMs}ms`)
        );
      }, timeoutMs);
    });

    try {
      await Promise.race([promise, timeoutPromise]);
      throw new Error("Expected promise to reject, but it resolved");
    } catch (error) {
      return error as Error;
    }
  }
}

/**
 * Performance testing utilities
 */
export class PerformanceTestUtils {
  /**
   * Measure execution time of a function
   */
  static async measureTime<T>(
    fn: () => Promise<T>
  ): Promise<{ result: T; timeMs: number }> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();

    return {
      result,
      timeMs: end - start,
    };
  }

  /**
   * Run a function multiple times and get statistics
   */
  static async benchmark<T>(
    fn: () => Promise<T>,
    iterations = 10
  ): Promise<{
    results: T[];
    times: number[];
    avgTime: number;
    minTime: number;
    maxTime: number;
    medianTime: number;
  }> {
    const results: T[] = [];
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const { result, timeMs } = await this.measureTime(fn);
      results.push(result);
      times.push(timeMs);
    }

    const sortedTimes = [...times].sort((a, b) => a - b);
    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const medianTime = sortedTimes[Math.floor(sortedTimes.length / 2)];

    return {
      results,
      times,
      avgTime,
      minTime,
      maxTime,
      medianTime,
    };
  }

  /**
   * Test memory usage during function execution
   */
  static async measureMemory<T>(fn: () => Promise<T>): Promise<{
    result: T;
    memoryUsed: number;
  }> {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const memBefore = process.memoryUsage().heapUsed;
    const result = await fn();
    const memAfter = process.memoryUsage().heapUsed;

    return {
      result,
      memoryUsed: memAfter - memBefore,
    };
  }
}
