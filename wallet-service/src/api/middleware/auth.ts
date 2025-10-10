/**
 * JWT Authentication middleware
 * Verifies JWT tokens and extracts user information
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getConfig } from '../../config';
import { UnauthorizedError } from '../../utils/errors';
import * as logger from '../../utils/logger';

/**
 * Extend Express Request to include user information
 */
declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

/**
 * JWT payload interface
 */
interface JWTPayload {
  sub: string; // User ID
  iat: number; // Issued at
  exp: number; // Expiration
  [key: string]: unknown;
}

/**
 * Authentication middleware
 * Verifies JWT Bearer token and attaches userId to request
 * 
 * TEST MODE: In development/test environment, you can use X-Test-User-Id header
 * to bypass JWT authentication for easier testing
 */
export function authMiddleware(req: Request, _res: Response, next: NextFunction): void {
  try {
    // TEST MODE: Allow bypassing JWT in development/test with X-Test-User-Id header
    // WARNING: This should NEVER be enabled in production!
    const config = getConfig();
    const isTestMode = config.server.nodeEnv === 'development' || config.server.nodeEnv === 'test';
    const testUserId = req.headers['x-test-user-id'] as string;
    
    if (isTestMode && testUserId) {
      req.userId = testUserId;
      logger.debug('Authentication bypassed (test mode)', {
        correlationId: req.correlationId,
        userId: req.userId,
        testMode: true,
      });
      next();
      return;
    }

    // PRODUCTION MODE: Verify JWT token
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('Missing authorization header');
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedError('Invalid authorization header format');
    }

    const token = parts[1];

    // Verify JWT signature
    const payload = jwt.verify(token, config.jwt.publicKey, {
      algorithms: ['RS256'],
    }) as JWTPayload;

    // Extract user ID from sub claim
    if (!payload.sub) {
      throw new UnauthorizedError('Invalid token: missing sub claim');
    }

    // Attach user ID to request
    req.userId = payload.sub;

    logger.debug('Authentication successful', {
      correlationId: req.correlationId,
      userId: req.userId,
    });

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('JWT verification failed', {
        correlationId: req.correlationId,
        error: error.message,
      });
      next(new UnauthorizedError('Invalid or expired token'));
    } else if (error instanceof UnauthorizedError) {
      next(error);
    } else {
      logger.error('Unexpected error in authentication', error as Error, {
        correlationId: req.correlationId,
      });
      next(new UnauthorizedError('Authentication failed'));
    }
  }
}

