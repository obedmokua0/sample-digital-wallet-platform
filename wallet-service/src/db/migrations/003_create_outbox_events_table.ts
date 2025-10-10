/**
 * Migration: Create outbox_events table
 * Creates the outbox_events table for transactional outbox pattern
 */

import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateOutboxEventsTable1696867400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'outbox_events',
        columns: [
          {
            name: 'id',
            type: 'bigserial',
            isPrimary: true,
          },
          {
            name: 'event_type',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'aggregate_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'payload',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'published',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'published_at',
            type: 'timestamptz',
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

    // Create indexes
    await queryRunner.createIndex(
      'outbox_events',
      new TableIndex({
        name: 'idx_outbox_unpublished',
        columnNames: ['published', 'created_at'],
        where: 'published = false',
      }),
    );

    await queryRunner.createIndex(
      'outbox_events',
      new TableIndex({
        name: 'idx_outbox_aggregate',
        columnNames: ['aggregate_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('outbox_events', true);
  }
}

