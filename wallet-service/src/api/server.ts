/**
 * Express server setup
 * Configures Express app with all middleware and routes
 */

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { correlationIdMiddleware } from './middleware/correlationId';
import { requestLoggerMiddleware } from './middleware/requestLogger';
import { errorHandlerMiddleware } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { rateLimitMiddleware } from './middleware/rateLimit';
import healthRoutes from './routes/health';
import walletRoutes from './routes/wallets';

/**
 * Create and configure Express application
 * @returns {Express} Configured Express app
 */
export function createApp(): Express {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: process.env.CORS_ORIGINS?.split(',') || '*',
      credentials: true,
    }),
  );

  // Body parsing middleware
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Correlation ID middleware (must be early in chain)
  app.use(correlationIdMiddleware);

  // Request logging middleware
  app.use(requestLoggerMiddleware);

  // Health check routes (no authentication or rate limiting required)
  app.use('/api/v1', healthRoutes);

  // Wallet routes (authentication and rate limiting required)
  app.use('/api/v1/wallets', authMiddleware, rateLimitMiddleware, walletRoutes);

  // Error handling middleware (must be last)
  app.use(errorHandlerMiddleware);

  return app;
}

