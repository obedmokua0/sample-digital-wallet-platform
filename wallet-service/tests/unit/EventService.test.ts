/**
 * Unit Tests for EventService
 * Tests event publishing to outbox with mocked entity manager
 */

import { EventService } from '../../src/services/EventService';
import { OutboxEvent } from '../../src/models/OutboxEvent';
import {
  WalletCreatedEvent,
  FundsDepositedEvent,
  FundsWithdrawnEvent,
  FundsTransferDebitedEvent,
  FundsTransferCreditedEvent,
} from '../../src/events/schemas';
import { EntityManager } from 'typeorm';

describe('EventService', () => {
  let eventService: EventService;
  let mockEntityManager: jest.Mocked<EntityManager>;

  beforeEach(() => {
    // Create mock entity manager
    mockEntityManager = {
      create: jest.fn().mockImplementation((_entity, data) => data),
      save: jest.fn(),
    } as unknown as jest.Mocked<EntityManager>;

    eventService = new EventService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('publishToOutbox', () => {
    it('should publish wallet.created event with correct aggregate ID', async () => {
      const event: WalletCreatedEvent = {
        eventType: 'wallet.created',
        walletId: 'wallet-123',
        userId: 'user-123',
        currency: 'USD',
        initialBalance: '0.0000',
        timestamp: '2025-10-09T10:00:00Z',
        correlationId: 'corr-123',
      };

      const mockOutboxEvent: OutboxEvent = {
        id: '1',
        eventType: 'wallet.created',
        aggregateId: 'wallet-123',
        payload: event as unknown as Record<string, unknown>,
        published: false,
        publishedAt: null,
        createdAt: new Date(),
      };

      mockEntityManager.save.mockResolvedValue(mockOutboxEvent);

      const result = await eventService.publishToOutbox(mockEntityManager, event);

      expect(mockEntityManager.create).toHaveBeenCalledWith(OutboxEvent, {
        eventType: 'wallet.created',
        aggregateId: 'wallet-123',
        payload: event,
        published: false,
        publishedAt: null,
      });
      expect(mockEntityManager.save).toHaveBeenCalledWith(OutboxEvent, expect.objectContaining({
        eventType: 'wallet.created',
        aggregateId: 'wallet-123',
        published: false,
        publishedAt: null,
      }));
      expect(result).toEqual(mockOutboxEvent);
    });

    it('should publish funds.deposited event with transaction ID as aggregate', async () => {
      const event: FundsDepositedEvent = {
        eventType: 'funds.deposited',
        walletId: 'wallet-123',
        transactionId: 'txn-123',
        amount: '100.00',
        currency: 'USD',
        previousBalance: '0.00',
        newBalance: '100.00',
        timestamp: '2025-10-09T10:00:00Z',
        correlationId: 'corr-123',
      };

      const mockOutboxEvent: OutboxEvent = {
        id: '2',
        eventType: 'funds.deposited',
        aggregateId: 'txn-123',
        payload: event as unknown as Record<string, unknown>,
        published: false,
        publishedAt: null,
        createdAt: new Date(),
      };

      mockEntityManager.save.mockResolvedValue(mockOutboxEvent);

      const result = await eventService.publishToOutbox(mockEntityManager, event);

      expect(mockEntityManager.create).toHaveBeenCalledWith(OutboxEvent, {
        eventType: 'funds.deposited',
        aggregateId: 'txn-123',
        payload: event,
        published: false,
        publishedAt: null,
      });
      expect(result).toEqual(mockOutboxEvent);
    });

    it('should publish funds.withdrawn event with transaction ID as aggregate', async () => {
      const event: FundsWithdrawnEvent = {
        eventType: 'funds.withdrawn',
        walletId: 'wallet-123',
        transactionId: 'txn-456',
        amount: '50.00',
        currency: 'USD',
        previousBalance: '100.00',
        newBalance: '50.00',
        timestamp: '2025-10-09T10:00:00Z',
        correlationId: 'corr-456',
      };

      const mockOutboxEvent: OutboxEvent = {
        id: '3',
        eventType: 'funds.withdrawn',
        aggregateId: 'txn-456',
        payload: event as unknown as Record<string, unknown>,
        published: false,
        publishedAt: null,
        createdAt: new Date(),
      };

      mockEntityManager.save.mockResolvedValue(mockOutboxEvent);

      const result = await eventService.publishToOutbox(mockEntityManager, event);

      expect(mockEntityManager.create).toHaveBeenCalledWith(OutboxEvent, {
        eventType: 'funds.withdrawn',
        aggregateId: 'txn-456',
        payload: event,
        published: false,
        publishedAt: null,
      });
      expect(result).toEqual(mockOutboxEvent);
    });

    it('should publish funds.transfer.debited event with transfer ID as aggregate', async () => {
      const event: FundsTransferDebitedEvent = {
        eventType: 'funds.transfer.debited',
        sourceWalletId: 'wallet-source',
        destinationWalletId: 'wallet-dest',
        transferId: 'transfer-123',
        transactionId: 'txn-789',
        amount: '25.00',
        currency: 'USD',
        previousBalance: '100.00',
        newBalance: '75.00',
        timestamp: '2025-10-09T10:00:00Z',
        correlationId: 'corr-789',
      };

      const mockOutboxEvent: OutboxEvent = {
        id: '4',
        eventType: 'funds.transfer.debited',
        aggregateId: 'transfer-123',
        payload: event as unknown as Record<string, unknown>,
        published: false,
        publishedAt: null,
        createdAt: new Date(),
      };

      mockEntityManager.save.mockResolvedValue(mockOutboxEvent);

      const result = await eventService.publishToOutbox(mockEntityManager, event);

      expect(mockEntityManager.create).toHaveBeenCalledWith(OutboxEvent, {
        eventType: 'funds.transfer.debited',
        aggregateId: 'transfer-123',
        payload: event,
        published: false,
        publishedAt: null,
      });
      expect(result).toEqual(mockOutboxEvent);
    });

    it('should publish funds.transfer.credited event with transfer ID as aggregate', async () => {
      const event: FundsTransferCreditedEvent = {
        eventType: 'funds.transfer.credited',
        sourceWalletId: 'wallet-source',
        destinationWalletId: 'wallet-dest',
        transferId: 'transfer-123',
        transactionId: 'txn-790',
        amount: '25.00',
        currency: 'USD',
        previousBalance: '50.00',
        newBalance: '75.00',
        timestamp: '2025-10-09T10:00:00Z',
        correlationId: 'corr-790',
      };

      const mockOutboxEvent: OutboxEvent = {
        id: '5',
        eventType: 'funds.transfer.credited',
        aggregateId: 'transfer-123',
        payload: event as unknown as Record<string, unknown>,
        published: false,
        publishedAt: null,
        createdAt: new Date(),
      };

      mockEntityManager.save.mockResolvedValue(mockOutboxEvent);

      const result = await eventService.publishToOutbox(mockEntityManager, event);

      expect(mockEntityManager.create).toHaveBeenCalledWith(OutboxEvent, {
        eventType: 'funds.transfer.credited',
        aggregateId: 'transfer-123',
        payload: event,
        published: false,
        publishedAt: null,
      });
      expect(result).toEqual(mockOutboxEvent);
    });

    it('should handle unknown event type with fallback to walletId', async () => {
      const unknownEvent = {
        eventType: 'unknown.event' as any,
        walletId: 'wallet-fallback',
        someData: 'test',
      };

      const mockOutboxEvent: OutboxEvent = {
        id: '6',
        eventType: 'unknown.event',
        aggregateId: 'wallet-fallback',
        payload: unknownEvent as unknown as Record<string, unknown>,
        published: false,
        publishedAt: null,
        createdAt: new Date(),
      };

      mockEntityManager.save.mockResolvedValue(mockOutboxEvent);

      const result = await eventService.publishToOutbox(mockEntityManager, unknownEvent as any);

      expect(mockEntityManager.create).toHaveBeenCalledWith(OutboxEvent, {
        eventType: 'unknown.event',
        aggregateId: 'wallet-fallback',
        payload: unknownEvent,
        published: false,
        publishedAt: null,
      });
      expect(result).toEqual(mockOutboxEvent);
    });

    it('should use "unknown" as aggregate ID if no walletId in unknown event', async () => {
      const unknownEvent = {
        eventType: 'unknown.event' as any,
        someData: 'test',
      };

      const mockOutboxEvent: OutboxEvent = {
        id: '7',
        eventType: 'unknown.event',
        aggregateId: 'unknown',
        payload: unknownEvent as unknown as Record<string, unknown>,
        published: false,
        publishedAt: null,
        createdAt: new Date(),
      };

      mockEntityManager.save.mockResolvedValue(mockOutboxEvent);

      const result = await eventService.publishToOutbox(mockEntityManager, unknownEvent as any);

      expect(mockEntityManager.create).toHaveBeenCalledWith(OutboxEvent, {
        eventType: 'unknown.event',
        aggregateId: 'unknown',
        payload: unknownEvent,
        published: false,
        publishedAt: null,
      });
      expect(result).toEqual(mockOutboxEvent);
    });
  });
});

