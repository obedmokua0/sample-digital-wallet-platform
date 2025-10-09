/**
 * Event schema type definitions
 * Based on events.schema.json contract
 */

/**
 * Base event interface
 */
export interface BaseEvent {
  eventType: string;
  timestamp: string;
  correlationId: string;
}

/**
 * Wallet Created Event
 * Published when a new wallet is created
 */
export interface WalletCreatedEvent extends BaseEvent {
  eventType: 'wallet.created';
  walletId: string;
  userId: string;
  currency: string;
  initialBalance: string;
}

/**
 * Funds Deposited Event
 * Published when funds are deposited into a wallet
 */
export interface FundsDepositedEvent extends BaseEvent {
  eventType: 'funds.deposited';
  walletId: string;
  transactionId: string;
  amount: string;
  currency: string;
  previousBalance: string;
  newBalance: string;
  metadata?: Record<string, unknown>;
}

/**
 * Funds Withdrawn Event
 * Published when funds are withdrawn from a wallet
 */
export interface FundsWithdrawnEvent extends BaseEvent {
  eventType: 'funds.withdrawn';
  walletId: string;
  transactionId: string;
  amount: string;
  currency: string;
  previousBalance: string;
  newBalance: string;
  metadata?: Record<string, unknown>;
}

/**
 * Funds Transfer Debited Event
 * Published when funds are debited from source wallet in a transfer
 */
export interface FundsTransferDebitedEvent extends BaseEvent {
  eventType: 'funds.transfer.debited';
  sourceWalletId: string;
  destinationWalletId: string;
  transferId: string;
  transactionId: string;
  amount: string;
  currency: string;
  previousBalance: string;
  newBalance: string;
  metadata?: Record<string, unknown>;
}

/**
 * Funds Transfer Credited Event
 * Published when funds are credited to destination wallet in a transfer
 */
export interface FundsTransferCreditedEvent extends BaseEvent {
  eventType: 'funds.transfer.credited';
  sourceWalletId: string;
  destinationWalletId: string;
  transferId: string;
  transactionId: string;
  amount: string;
  currency: string;
  previousBalance: string;
  newBalance: string;
  metadata?: Record<string, unknown>;
}

/**
 * Union type of all events
 */
export type WalletEvent =
  | WalletCreatedEvent
  | FundsDepositedEvent
  | FundsWithdrawnEvent
  | FundsTransferDebitedEvent
  | FundsTransferCreditedEvent;

