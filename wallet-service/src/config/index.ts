/**
 * Configuration module
 * Loads and validates all environment variables on startup
 * Follows 12-factor app principles: all config from environment
 */

export interface Config {
  server: {
    nodeEnv: string;
    port: number;
    logLevel: string;
  };
  database: {
    url: string;
    poolMin: number;
    poolMax: number;
  };
  redis: {
    url: string;
    streamName: string;
  };
  jwt: {
    publicKey: string;
  };
  limits: {
    maxTransactionAmount: {
      USD: number;
      EUR: number;
      GBP: number;
    };
    maxWalletBalance: {
      USD: number;
      EUR: number;
      GBP: number;
    };
  };
  rateLimit: {
    walletPerMinute: number;
    userPerMinute: number;
    globalPerMinute: number;
  };
  outbox: {
    pollIntervalMs: number;
    batchSize: number;
  };
}

/**
 * Load configuration from environment variables
 * Throws error if required variables are missing
 * @returns {Config} Validated configuration object
 */
export function loadConfig(): Config {
  const required = [
    'DATABASE_URL',
    'REDIS_URL',
    'JWT_PUBLIC_KEY',
  ];

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const config: Config = {
    server: {
      nodeEnv: process.env.NODE_ENV || 'development',
      port: parseInt(process.env.PORT || '3000', 10),
      logLevel: process.env.LOG_LEVEL || 'info',
    },
    database: {
      url: process.env.DATABASE_URL!,
      poolMin: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
      poolMax: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
    },
    redis: {
      url: process.env.REDIS_URL!,
      streamName: process.env.REDIS_STREAM_NAME || 'wallet-events',
    },
    jwt: {
      publicKey: process.env.JWT_PUBLIC_KEY!.replace(/\\n/g, '\n'),
    },
    limits: {
      maxTransactionAmount: {
        USD: parseInt(process.env.MAX_TRANSACTION_AMOUNT_USD || '10000', 10),
        EUR: parseInt(process.env.MAX_TRANSACTION_AMOUNT_EUR || '9000', 10),
        GBP: parseInt(process.env.MAX_TRANSACTION_AMOUNT_GBP || '8000', 10),
      },
      maxWalletBalance: {
        USD: parseInt(process.env.MAX_WALLET_BALANCE_USD || '100000', 10),
        EUR: parseInt(process.env.MAX_WALLET_BALANCE_EUR || '90000', 10),
        GBP: parseInt(process.env.MAX_WALLET_BALANCE_GBP || '80000', 10),
      },
    },
    rateLimit: {
      walletPerMinute: parseInt(process.env.RATE_LIMIT_WALLET_PER_MINUTE || '100', 10),
      userPerMinute: parseInt(process.env.RATE_LIMIT_USER_PER_MINUTE || '1000', 10),
      globalPerMinute: parseInt(process.env.RATE_LIMIT_GLOBAL_PER_MINUTE || '10000', 10),
    },
    outbox: {
      pollIntervalMs: parseInt(process.env.OUTBOX_POLL_INTERVAL_MS || '1000', 10),
      batchSize: parseInt(process.env.OUTBOX_BATCH_SIZE || '100', 10),
    },
  };

  return config;
}

// Singleton instance
let configInstance: Config | null = null;

/**
 * Get configuration instance
 * Loads config on first call, returns cached instance on subsequent calls
 * @returns {Config} Configuration object
 */
export function getConfig(): Config {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}

