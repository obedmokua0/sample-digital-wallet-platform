/**
 * Request logging middleware
 * Logs all incoming requests and outgoing responses with timing
 */

import { Request, Response, NextFunction } from 'express';
import * as logger from '../../utils/logger';

/**
 * Request logger middleware
 * Logs request details and response status with duration
 */
export function requestLoggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const startTime = Date.now();

  // Log incoming request
  logger.info('Incoming request', {
    correlationId: req.correlationId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
  });

  // Capture original end function
  const originalEnd = res.end;

  // Override end to log response
  res.end = function (chunk?: unknown, encoding?: unknown, callback?: unknown): Response {
    const duration = Date.now() - startTime;
    
    logger.info('Outgoing response', {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
    });

    // Call original end
    if (typeof chunk === 'function') {
      return originalEnd.call(this, chunk as () => void);
    } else if (typeof encoding === 'function') {
      return originalEnd.call(this, chunk, encoding as () => void);
    } else {
      return originalEnd.call(this, chunk, encoding as BufferEncoding, callback as (() => void) | undefined);
    }
  };

  next();
}

