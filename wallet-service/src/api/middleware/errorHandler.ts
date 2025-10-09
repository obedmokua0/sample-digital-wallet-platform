/**
 * Error handling middleware
 * Catches all errors and formats them according to API specification
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../utils/errors';
import * as logger from '../../utils/logger';

/**
 * Error response interface
 */
interface ErrorResponse {
  error: string;
  message: string;
  details?: Record<string, unknown>;
  correlationId?: string;
}

/**
 * Error handler middleware
 * Must be registered last in middleware chain
 */
export function errorHandlerMiddleware(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Log error with correlation ID
  logger.error('Request error', error, {
    correlationId: req.correlationId,
    method: req.method,
    path: req.path,
  });

  // Handle known application errors
  if (error instanceof AppError) {
    const response: ErrorResponse = {
      error: error.code,
      message: error.message,
      correlationId: req.correlationId,
    };

    if (error.details) {
      response.details = error.details;
    }

    res.status(error.statusCode).json(response);
    return;
  }

  // Handle unexpected errors
  const response: ErrorResponse = {
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    correlationId: req.correlationId,
  };

  // Include error message in development
  if (process.env.NODE_ENV === 'development') {
    response.details = {
      message: error.message,
      stack: error.stack,
    };
  }

  res.status(500).json(response);
}

