/**
 * Structured logger using Winston
 * Outputs JSON logs to stdout (12-factor compliant)
 * Supports correlation IDs for request tracing
 */

import winston from 'winston';

/**
 * Log metadata interface
 */
export interface LogMetadata {
  correlationId?: string;
  userId?: string;
  walletId?: string;
  transactionId?: string;
  operation?: string;
  duration?: number;
  [key: string]: unknown;
}

/**
 * Create Winston logger instance
 * @returns {winston.Logger} Configured logger
 */
function createLogger(): winston.Logger {
  const logLevel = process.env.LOG_LEVEL || 'info';

  const logger = winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    ),
    defaultMeta: { service: 'wallet-service' },
    transports: [
      new winston.transports.Console({
        stderrLevels: ['error'],
      }),
    ],
  });

  return logger;
}

// Singleton logger instance
const logger = createLogger();

/**
 * Log info message
 * @param message - Log message
 * @param metadata - Additional structured metadata
 */
export function info(message: string, metadata?: LogMetadata): void {
  logger.info(message, metadata);
}

/**
 * Log warning message
 * @param message - Log message
 * @param metadata - Additional structured metadata
 */
export function warn(message: string, metadata?: LogMetadata): void {
  logger.warn(message, metadata);
}

/**
 * Log error message
 * @param message - Log message
 * @param error - Error object (stack trace will be included)
 * @param metadata - Additional structured metadata
 */
export function error(message: string, error?: Error, metadata?: LogMetadata): void {
  logger.error(message, {
    ...metadata,
    error: error
      ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        }
      : undefined,
  });
}

/**
 * Log debug message
 * @param message - Log message
 * @param metadata - Additional structured metadata
 */
export function debug(message: string, metadata?: LogMetadata): void {
  logger.debug(message, metadata);
}

/**
 * Create child logger with default metadata
 * Useful for adding correlation ID to all logs in a request
 * @param defaultMetadata - Metadata to include in all logs from this logger
 * @returns {Object} Logger object with bound metadata
 */
export function child(defaultMetadata: LogMetadata): {
  info: (message: string, meta?: LogMetadata) => void;
  warn: (message: string, meta?: LogMetadata) => void;
  error: (message: string, err?: Error, meta?: LogMetadata) => void;
  debug: (message: string, meta?: LogMetadata) => void;
} {
  return {
    info: (message: string, meta?: LogMetadata) =>
      info(message, { ...defaultMetadata, ...meta }),
    warn: (message: string, meta?: LogMetadata) =>
      warn(message, { ...defaultMetadata, ...meta }),
    error: (message: string, err?: Error, meta?: LogMetadata) =>
      error(message, err, { ...defaultMetadata, ...meta }),
    debug: (message: string, meta?: LogMetadata) =>
      debug(message, { ...defaultMetadata, ...meta }),
  };
}

export default { info, warn, error, debug, child };

