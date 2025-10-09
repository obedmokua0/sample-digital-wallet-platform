/**
 * Rate limiting middleware
 * Token bucket algorithm using Redis for distributed rate limiting
 */

import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../../events/publisher';
import { getConfig } from '../../config';
import { RateLimitError } from '../../utils/errors';
import * as logger from '../../utils/logger';

/**
 * Rate limit key types
 */
enum RateLimitType {
  WALLET = 'wallet',
  USER = 'user',
  GLOBAL = 'global',
}

/**
 * Check rate limit using token bucket algorithm
 * @param key - Rate limit key
 * @param limit - Maximum requests per minute
 * @returns {Promise<{allowed: boolean, remaining: number, resetAt: number}>}
 */
async function checkRateLimit(
  key: string,
  limit: number,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const redis = getRedisClient();
  const now = Date.now();
  const windowMs = 60000; // 1 minute window
  const windowStart = now - windowMs;

  // Use Redis sorted set for sliding window
  const multi = redis.multi();

  // Remove old entries outside the window
  multi.zremrangebyscore(key, 0, windowStart);

  // Count current requests in window
  multi.zcard(key);

  // Add current request
  multi.zadd(key, now, `${now}`);

  // Set expiry
  multi.expire(key, 60);

  const results = await multi.exec();

  if (!results) {
    // If Redis fails, allow the request (fail open)
    logger.warn('Rate limit check failed, allowing request', { key });
    return { allowed: true, remaining: limit, resetAt: now + windowMs };
  }

  const count = (results[1][1] as number) || 0;
  const allowed = count < limit;
  const remaining = Math.max(0, limit - count - 1);
  const resetAt = now + windowMs;

  return { allowed, remaining, resetAt };
}

/**
 * Rate limiting middleware
 * Applies per-wallet and per-user rate limits
 */
export async function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const config = getConfig();

    // Skip rate limiting for health checks
    if (req.path.startsWith('/health') || req.path === '/metrics') {
      return next();
    }

    // Extract wallet ID from path if present
    const walletIdMatch = req.path.match(/\/wallets\/([^/]+)/);
    const walletId = walletIdMatch ? walletIdMatch[1] : null;

    // Check wallet-level rate limit
    if (walletId && req.userId) {
      const walletKey = `ratelimit:${RateLimitType.WALLET}:${walletId}`;
      const walletLimit = await checkRateLimit(walletKey, config.rateLimit.walletPerMinute);

      if (!walletLimit.allowed) {
        logger.warn('Wallet rate limit exceeded', {
          correlationId: req.correlationId,
          userId: req.userId,
          walletId,
        });

        res.setHeader('X-RateLimit-Limit', config.rateLimit.walletPerMinute.toString());
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', Math.ceil(walletLimit.resetAt / 1000).toString());

        throw new RateLimitError('Wallet rate limit exceeded');
      }

      res.setHeader('X-RateLimit-Limit', config.rateLimit.walletPerMinute.toString());
      res.setHeader('X-RateLimit-Remaining', walletLimit.remaining.toString());
      res.setHeader('X-RateLimit-Reset', Math.ceil(walletLimit.resetAt / 1000).toString());
    }

    // Check user-level rate limit
    if (req.userId) {
      const userKey = `ratelimit:${RateLimitType.USER}:${req.userId}`;
      const userLimit = await checkRateLimit(userKey, config.rateLimit.userPerMinute);

      if (!userLimit.allowed) {
        logger.warn('User rate limit exceeded', {
          correlationId: req.correlationId,
          userId: req.userId,
        });

        throw new RateLimitError('User rate limit exceeded');
      }
    }

    // Check global rate limit
    const globalKey = `ratelimit:${RateLimitType.GLOBAL}`;
    const globalLimit = await checkRateLimit(globalKey, config.rateLimit.globalPerMinute);

    if (!globalLimit.allowed) {
      logger.warn('Global rate limit exceeded', {
        correlationId: req.correlationId,
      });

      throw new RateLimitError('Service rate limit exceeded');
    }

    next();
  } catch (error) {
    if (error instanceof RateLimitError) {
      next(error);
    } else {
      // If rate limiting fails, allow the request (fail open)
      logger.error('Rate limit middleware error, allowing request', error as Error, {
        correlationId: req.correlationId,
      });
      next();
    }
  }
}

