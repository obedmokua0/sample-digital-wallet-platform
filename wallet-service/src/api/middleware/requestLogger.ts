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
  const originalEnd = res.end.bind(res);

  // Override end to log response
  res.end = ((...args: any[]): any => {
    const duration = Date.now() - startTime;
    
    logger.info('Outgoing response', {
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
    });

    // Call original end with all arguments
    return originalEnd(...args);
  }) as any;

  next();
}

