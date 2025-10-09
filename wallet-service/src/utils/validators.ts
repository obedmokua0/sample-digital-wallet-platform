/**
 * Validation utilities for wallet operations
 * All validators throw ValidationError on failure
 */

import { ValidationError } from './errors';

/**
 * Supported currencies (ISO 4217 codes)
 */
export type Currency = 'USD' | 'EUR' | 'GBP';

export const SUPPORTED_CURRENCIES: readonly Currency[] = ['USD', 'EUR', 'GBP'] as const;

/**
 * Validates that a string is a valid UUID v4
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @throws {ValidationError} If value is not a valid UUID
 */
export function validateUUID(value: string, fieldName: string = 'id'): void {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!uuidRegex.test(value)) {
    throw new ValidationError(`Invalid ${fieldName}: must be a valid UUID`, {
      [fieldName]: value,
    });
  }
}

/**
 * Validates that a value is a positive number with max 4 decimal places
 * @param value - The string value to validate (e.g., "100.50")
 * @param fieldName - Name of the field for error messages
 * @returns {number} The validated number
 * @throws {ValidationError} If value is not a valid positive amount
 */
export function validateAmount(value: string, fieldName: string = 'amount'): number {
  // Check format: digits with optional decimal and up to 4 decimal places
  const amountRegex = /^\d+(\.\d{1,4})?$/;
  
  if (!amountRegex.test(value)) {
    throw new ValidationError(
      `Invalid ${fieldName}: must be a positive number with up to 4 decimal places`,
      { [fieldName]: value },
    );
  }

  const numValue = parseFloat(value);
  
  if (isNaN(numValue) || numValue <= 0) {
    throw new ValidationError(`Invalid ${fieldName}: must be greater than zero`, {
      [fieldName]: value,
    });
  }

  return numValue;
}

/**
 * Validates that a currency code is supported
 * @param value - The currency code to validate (e.g., "USD")
 * @param fieldName - Name of the field for error messages
 * @returns {Currency} The validated currency
 * @throws {ValidationError} If currency is not supported
 */
export function validateCurrency(value: string, fieldName: string = 'currency'): Currency {
  const upperValue = value.toUpperCase();
  
  if (!SUPPORTED_CURRENCIES.includes(upperValue as Currency)) {
    throw new ValidationError(
      `Invalid ${fieldName}: must be one of ${SUPPORTED_CURRENCIES.join(', ')}`,
      { [fieldName]: value, supported: SUPPORTED_CURRENCIES },
    );
  }

  return upperValue as Currency;
}

/**
 * Validates that amount doesn't exceed maximum transaction limit
 * @param amount - The amount to validate
 * @param currency - The currency of the amount
 * @param maxLimits - Map of currency to maximum limit
 * @throws {ValidationError} If amount exceeds limit
 */
export function validateMaxTransactionAmount(
  amount: number,
  currency: Currency,
  maxLimits: Record<Currency, number>,
): void {
  const limit = maxLimits[currency];
  
  if (amount > limit) {
    throw new ValidationError('Transaction amount exceeds maximum limit', {
      amount: amount.toString(),
      limit: limit.toString(),
      currency,
    });
  }
}

/**
 * Validates that resulting balance doesn't exceed maximum wallet balance
 * @param newBalance - The resulting balance after operation
 * @param currency - The currency of the wallet
 * @param maxLimits - Map of currency to maximum balance
 * @throws {ValidationError} If balance would exceed limit
 */
export function validateMaxWalletBalance(
  newBalance: number,
  currency: Currency,
  maxLimits: Record<Currency, number>,
): void {
  const limit = maxLimits[currency];
  
  if (newBalance > limit) {
    throw new ValidationError('Wallet balance would exceed maximum limit', {
      newBalance: newBalance.toString(),
      limit: limit.toString(),
      currency,
    });
  }
}

/**
 * Validates pagination parameters
 * @param page - Page number (1-indexed)
 * @param pageSize - Items per page
 * @returns {{page: number, pageSize: number}} Validated pagination params
 * @throws {ValidationError} If parameters are invalid
 */
export function validatePagination(
  page: number | string,
  pageSize: number | string,
): { page: number; pageSize: number } {
  const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
  const pageSizeNum = typeof pageSize === 'string' ? parseInt(pageSize, 10) : pageSize;

  if (isNaN(pageNum) || pageNum < 1) {
    throw new ValidationError('Invalid page: must be a positive integer', {
      page: page.toString(),
    });
  }

  if (isNaN(pageSizeNum) || pageSizeNum < 1 || pageSizeNum > 100) {
    throw new ValidationError('Invalid pageSize: must be between 1 and 100', {
      pageSize: pageSize.toString(),
    });
  }

  return { page: pageNum, pageSize: pageSizeNum };
}

/**
 * Validates that a wallet is in active status
 * @param status - The wallet status
 * @throws {ValidationError} If wallet is not active
 */
export function validateWalletActive(status: string): void {
  if (status !== 'active') {
    throw new ValidationError('Wallet is not active', { status });
  }
}

/**
 * Validates required fields are present
 * @param data - Object containing fields
 * @param requiredFields - Array of required field names
 * @throws {ValidationError} If any required field is missing
 */
export function validateRequiredFields(
  data: Record<string, unknown>,
  requiredFields: string[],
): void {
  const missing = requiredFields.filter((field) => data[field] === undefined || data[field] === null);
  
  if (missing.length > 0) {
    throw new ValidationError('Missing required fields', {
      missing,
    });
  }
}

