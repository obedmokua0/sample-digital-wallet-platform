/**
 * Custom error classes for the Wallet Microservice
 * All errors include error codes that map to OpenAPI specification
 */

/**
 * Base application error
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error (400)
 * Used when request parameters fail validation
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

/**
 * Unauthorized error (401)
 * Used when authentication is missing or invalid
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

/**
 * Forbidden error (403)
 * Used when user is authenticated but not authorized to access resource
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'You do not have permission to access this resource') {
    super(message, 'FORBIDDEN', 403);
  }
}

/**
 * Not found error (404)
 * Used when requested resource does not exist
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id ${id} not found` : `${resource} not found`;
    super(message, 'NOT_FOUND', 404);
  }
}

/**
 * Insufficient funds error (422)
 * Used when wallet doesn't have enough balance for withdrawal/transfer
 */
export class InsufficientFundsError extends AppError {
  constructor(requested: string, available: string) {
    super('Insufficient funds for this operation', 'INSUFFICIENT_FUNDS', 422, {
      requested,
      available,
    });
  }
}

/**
 * Currency mismatch error (422)
 * Used when attempting operations between wallets with different currencies
 */
export class CurrencyMismatchError extends AppError {
  constructor(message: string = 'Currency mismatch between wallets') {
    super(message, 'CURRENCY_MISMATCH', 422);
  }
}

/**
 * Amount exceeds limit error (422)
 * Used when transaction amount exceeds configured maximum
 */
export class AmountExceedsLimitError extends AppError {
  constructor(amount: string, limit: string) {
    super('Transaction amount exceeds limit', 'AMOUNT_EXCEEDS_LIMIT', 422, {
      amount,
      limit,
    });
  }
}

/**
 * Balance exceeds limit error (422)
 * Used when resulting wallet balance would exceed configured maximum
 */
export class BalanceExceedsLimitError extends AppError {
  constructor(newBalance: string, limit: string) {
    super('Wallet balance would exceed limit', 'BALANCE_EXCEEDS_LIMIT', 422, {
      newBalance,
      limit,
    });
  }
}

/**
 * Invalid transfer error (422)
 * Used when transfer violates business rules (e.g., same wallet, frozen wallet)
 */
export class InvalidTransferError extends AppError {
  constructor(message: string) {
    super(message, 'INVALID_TRANSFER', 422);
  }
}

/**
 * Conflict error (409)
 * Used for duplicate resources (e.g., wallet already exists for user+currency)
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

/**
 * Rate limit exceeded error (429)
 * Used when client exceeds rate limits
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests, please try again later') {
    super(message, 'RATE_LIMIT_EXCEEDED', 429);
  }
}

/**
 * Internal server error (500)
 * Used for unexpected errors
 */
export class InternalError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message, 'INTERNAL_ERROR', 500);
  }
}

