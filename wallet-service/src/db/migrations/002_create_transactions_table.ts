/**
 * Migration: Create transactions table
 * Creates the transactions table with all required columns, indexes, constraints, and foreign keys
 */

import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateTransactionsTable1696867300000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'transactions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'wallet_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'related_wallet_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '30',
            isNullable: false,
          },
          {
            name: 'amount',
            type: 'decimal',
            precision: 19,
            scale: 4,
            isNullable: false,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            isNullable: false,
          },
          {
            name: 'balance_before',
            type: 'decimal',
            precision: 19,
            scale: 4,
            isNullable: false,
          },
          {
            name: 'balance_after',
            type: 'decimal',
            precision: 19,
            scale: 4,
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'completed'",
            isNullable: false,
          },
          {
            name: 'idempotency_key',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'NOW()',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Add check constraints
    await queryRunner.query(`
      ALTER TABLE transactions 
      ADD CONSTRAINT chk_transactions_amount_positive 
      CHECK (amount > 0)
    `);

    await queryRunner.query(`
      ALTER TABLE transactions 
      ADD CONSTRAINT chk_transactions_balance_after_non_negative 
      CHECK (balance_after >= 0)
    `);

    await queryRunner.query(`
      ALTER TABLE transactions 
      ADD CONSTRAINT chk_transactions_type_valid 
      CHECK (type IN ('deposit', 'withdrawal', 'transfer_debit', 'transfer_credit'))
    `);

    await queryRunner.query(`
      ALTER TABLE transactions 
      ADD CONSTRAINT chk_transactions_status_valid 
      CHECK (status IN ('pending', 'completed', 'failed'))
    `);

    // Create indexes
    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'idx_transactions_wallet_id',
        columnNames: ['wallet_id'],
      }),
    );

    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'idx_transactions_idempotency_key',
        columnNames: ['idempotency_key'],
        isUnique: true,
        where: 'idempotency_key IS NOT NULL',
      }),
    );

    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'idx_transactions_created_at',
        columnNames: ['created_at'],
      }),
    );

    await queryRunner.createIndex(
      'transactions',
      new TableIndex({
        name: 'idx_transactions_wallet_created',
        columnNames: ['wallet_id', 'created_at'],
      }),
    );

    // Add foreign keys
    await queryRunner.createForeignKey(
      'transactions',
      new TableForeignKey({
        name: 'fk_transactions_wallet',
        columnNames: ['wallet_id'],
        referencedTableName: 'wallets',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );

    await queryRunner.createForeignKey(
      'transactions',
      new TableForeignKey({
        name: 'fk_transactions_related_wallet',
        columnNames: ['related_wallet_id'],
        referencedTableName: 'wallets',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('transactions', true);
  }
}

