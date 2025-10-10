/**
 * Migration: Create wallets table
 * Creates the wallets table with all required columns, indexes, and constraints
 */

import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateWalletsTable1696867200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'wallets',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'user_id',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'balance',
            type: 'decimal',
            precision: 19,
            scale: 4,
            default: 0,
            isNullable: false,
          },
          {
            name: 'currency',
            type: 'varchar',
            length: '3',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'active'",
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'NOW()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'NOW()',
            isNullable: false,
          },
          {
            name: 'version',
            type: 'int',
            default: 1,
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Add check constraints
    await queryRunner.query(`
      ALTER TABLE wallets 
      ADD CONSTRAINT chk_wallets_balance_non_negative 
      CHECK (balance >= 0)
    `);

    await queryRunner.query(`
      ALTER TABLE wallets 
      ADD CONSTRAINT chk_wallets_currency_valid 
      CHECK (currency IN ('USD', 'EUR', 'GBP'))
    `);

    await queryRunner.query(`
      ALTER TABLE wallets 
      ADD CONSTRAINT chk_wallets_status_valid 
      CHECK (status IN ('active', 'frozen', 'closed'))
    `);

    // Create indexes
    await queryRunner.createIndex(
      'wallets',
      new TableIndex({
        name: 'idx_wallets_user_id',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'wallets',
      new TableIndex({
        name: 'idx_wallets_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'wallets',
      new TableIndex({
        name: 'idx_wallets_user_id_currency',
        columnNames: ['user_id', 'currency'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('wallets', true);
  }
}

