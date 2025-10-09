/**
 * Health check routes
 * Provides liveness, readiness, and metrics endpoints
 */

import { Router, Request, Response } from 'express';
import { checkDatabaseHealth } from '../../db/connection';
import { checkRedisHealth } from '../../events/publisher';
import { register } from 'prom-client';

const router = Router();

/**
 * GET /api/v1/health
 * Liveness probe - checks if service is running
 */
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/v1/health/ready
 * Readiness probe - checks if service and dependencies are ready
 */
router.get('/health/ready', async (_req: Request, res: Response) => {
  try {
    const dbHealthy = await checkDatabaseHealth();
    const redisHealthy = await checkRedisHealth();

    const ready = dbHealthy && redisHealthy;

    if (ready) {
      res.status(200).json({
        status: 'ready',
        checks: {
          database: 'ok',
          redis: 'ok',
        },
      });
    } else {
      res.status(503).json({
        status: 'not_ready',
        checks: {
          database: dbHealthy ? 'ok' : 'failed',
          redis: redisHealthy ? 'ok' : 'failed',
        },
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      checks: {
        database: 'unknown',
        redis: 'unknown',
      },
    });
  }
});

/**
 * GET /api/v1/metrics
 * Prometheus metrics endpoint
 */
router.get('/metrics', async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.send(metrics);
  } catch (error) {
    res.status(500).send('Error collecting metrics');
  }
});

export default router;

