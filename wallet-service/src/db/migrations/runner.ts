/**
 * Migration runner script
 * Runs database migrations up or down
 * Usage: ts-node src/db/migrations/runner.ts [up|down]
 */

import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { CreateWalletsTable1696867200000 } from './001_create_wallets_table';
import { CreateTransactionsTable1696867300000 } from './002_create_transactions_table';
import { CreateOutboxEventsTable1696867400000 } from './003_create_outbox_events_table';

// Load environment variables
dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  migrations: [
    CreateWalletsTable1696867200000,
    CreateTransactionsTable1696867300000,
    CreateOutboxEventsTable1696867400000,
  ],
  migrationsRun: false,
  logging: true,
});

async function runMigrations(): Promise<void> {
  const command = process.argv[2];

  if (!command || !['up', 'down'].includes(command)) {
    console.error('Usage: ts-node src/db/migrations/runner.ts [up|down]');
    process.exit(1);
  }

  try {
    console.log('Initializing database connection...');
    await AppDataSource.initialize();
    console.log('Database connected');

    if (command === 'up') {
      console.log('Running migrations...');
      await AppDataSource.runMigrations();
      console.log('✓ Migrations completed successfully');
    } else if (command === 'down') {
      console.log('Reverting last migration...');
      await AppDataSource.undoLastMigration();
      console.log('✓ Migration reverted successfully');
    }

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});

