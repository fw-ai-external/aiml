export class ElementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ElementError";
  }
}

export class InternalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InternalError";
  }
}

export class CompositionError extends Error {
  constructor(message: string, details?: Record<string, any>) {
    super(message);
    this.name = "CompositionError";
    if (details) {
      Object.assign(this, details);
    }
  }
}
