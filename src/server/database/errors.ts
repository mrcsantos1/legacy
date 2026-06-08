export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly status = 500
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

export class NotFoundError extends DatabaseError {
  constructor(message: string) {
    super(message, 404);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends DatabaseError {
  constructor(message: string) {
    super(message, 400);
    this.name = "ValidationError";
  }
}
