/**
 * Unit Tests for Validation Utilities
 * Tests all validation functions in isolation
 */

import {
  validateUUID,
  validateAmount,
  validateCurrency,
  validateMaxTransactionAmount,
  validateMaxWalletBalance,
  validatePagination,
  validateWalletActive,
  validateRequiredFields,
  Currency,
  SUPPORTED_CURRENCIES,
} from '../../src/utils/validators';
import { ValidationError } from '../../src/utils/errors';

describe('Validators', () => {
  describe('validateUUID', () => {
    it('should accept valid UUID v4', () => {
      const validUUIDs = [
        'a1b2c3d4-e5f6-4890-abcd-ef1234567890',
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-41d1-80b4-00c04fd430c8',
      ];

      validUUIDs.forEach((uuid) => {
        expect(() => validateUUID(uuid)).not.toThrow();
      });
    });

    it('should reject invalid UUIDs', () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '12345678-1234-1234-1234-123456789012', // Not v4
        'a1b2c3d4-e5f6-5890-abcd-ef1234567890', // Wrong version digit
        'invalid',
        '',
        'a1b2c3d4e5f648900abcdef1234567890', // Missing dashes
      ];

      invalidUUIDs.forEach((uuid) => {
        expect(() => validateUUID(uuid, 'testId')).toThrow(ValidationError);
        expect(() => validateUUID(uuid, 'testId')).toThrow('Invalid testId');
      });
    });

    it('should use custom field name in error message', () => {
      expect(() => validateUUID('invalid', 'walletId')).toThrow('Invalid walletId');
    });
  });

  describe('validateAmount', () => {
    it('should accept valid positive amounts', () => {
      const validAmounts = [
        { input: '100', expected: 100 },
        { input: '100.50', expected: 100.5 },
        { input: '0.01', expected: 0.01 },
        { input: '999999.9999', expected: 999999.9999 },
        { input: '1', expected: 1 },
      ];

      validAmounts.forEach(({ input, expected }) => {
        const result = validateAmount(input);
        expect(result).toBe(expected);
      });
    });

    it('should reject negative amounts', () => {
      expect(() => validateAmount('-100')).toThrow(ValidationError);
      expect(() => validateAmount('-0.01')).toThrow('must be a positive number');
    });

    it('should reject zero amount', () => {
      expect(() => validateAmount('0')).toThrow(ValidationError);
      expect(() => validateAmount('0.00')).toThrow('must be greater than zero');
    });

    it('should reject amounts with more than 4 decimal places', () => {
      const invalidAmounts = ['100.12345', '0.123456', '99.99999'];

      invalidAmounts.forEach((amount) => {
        expect(() => validateAmount(amount)).toThrow(ValidationError);
        expect(() => validateAmount(amount)).toThrow('up to 4 decimal places');
      });
    });

    it('should reject non-numeric values', () => {
      const invalidValues = ['abc', '100.50.50', '100,50', 'NaN', 'Infinity', ''];

      invalidValues.forEach((value) => {
        expect(() => validateAmount(value)).toThrow(ValidationError);
      });
    });

    it('should use custom field name in error message', () => {
      expect(() => validateAmount('invalid', 'deposit')).toThrow('Invalid deposit');
    });
  });

  describe('validateCurrency', () => {
    it('should accept supported currencies', () => {
      SUPPORTED_CURRENCIES.forEach((currency) => {
        const result = validateCurrency(currency);
        expect(result).toBe(currency);
      });
    });

    it('should accept lowercase currencies and convert to uppercase', () => {
      expect(validateCurrency('usd')).toBe('USD');
      expect(validateCurrency('eur')).toBe('EUR');
      expect(validateCurrency('gbp')).toBe('GBP');
    });

    it('should reject unsupported currencies', () => {
      const unsupportedCurrencies = ['JPY', 'CNY', 'INR', 'BTC', 'XYZ', ''];

      unsupportedCurrencies.forEach((currency) => {
        expect(() => validateCurrency(currency)).toThrow(ValidationError);
        expect(() => validateCurrency(currency)).toThrow('must be one of');
      });
    });

    it('should include supported currencies in error message', () => {
      try {
        validateCurrency('JPY');
        fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.message).toContain('USD, EUR, GBP');
      }
    });

    it('should use custom field name in error message', () => {
      expect(() => validateCurrency('JPY', 'walletCurrency')).toThrow(
        'Invalid walletCurrency',
      );
    });
  });

  describe('validateMaxTransactionAmount', () => {
    const maxLimits: Record<Currency, number> = {
      USD: 10000,
      EUR: 9000,
      GBP: 8000,
    };

    it('should accept amounts below limit', () => {
      expect(() => validateMaxTransactionAmount(5000, 'USD', maxLimits)).not.toThrow();
      expect(() => validateMaxTransactionAmount(8999, 'EUR', maxLimits)).not.toThrow();
      expect(() => validateMaxTransactionAmount(7999.99, 'GBP', maxLimits)).not.toThrow();
    });

    it('should accept amounts equal to limit', () => {
      expect(() => validateMaxTransactionAmount(10000, 'USD', maxLimits)).not.toThrow();
      expect(() => validateMaxTransactionAmount(9000, 'EUR', maxLimits)).not.toThrow();
      expect(() => validateMaxTransactionAmount(8000, 'GBP', maxLimits)).not.toThrow();
    });

    it('should reject amounts exceeding limit', () => {
      expect(() => validateMaxTransactionAmount(10001, 'USD', maxLimits)).toThrow(
        ValidationError,
      );
      expect(() => validateMaxTransactionAmount(10001, 'USD', maxLimits)).toThrow(
        'exceeds maximum limit',
      );
    });

    it('should include amount and limit in error details', () => {
      try {
        validateMaxTransactionAmount(15000, 'USD', maxLimits);
        fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.details).toEqual({
          amount: '15000',
          limit: '10000',
          currency: 'USD',
        });
      }
    });
  });

  describe('validateMaxWalletBalance', () => {
    const maxLimits: Record<Currency, number> = {
      USD: 100000,
      EUR: 90000,
      GBP: 80000,
    };

    it('should accept balances below limit', () => {
      expect(() => validateMaxWalletBalance(50000, 'USD', maxLimits)).not.toThrow();
      expect(() => validateMaxWalletBalance(89999, 'EUR', maxLimits)).not.toThrow();
      expect(() => validateMaxWalletBalance(79999.99, 'GBP', maxLimits)).not.toThrow();
    });

    it('should accept balances equal to limit', () => {
      expect(() => validateMaxWalletBalance(100000, 'USD', maxLimits)).not.toThrow();
      expect(() => validateMaxWalletBalance(90000, 'EUR', maxLimits)).not.toThrow();
      expect(() => validateMaxWalletBalance(80000, 'GBP', maxLimits)).not.toThrow();
    });

    it('should reject balances exceeding limit', () => {
      expect(() => validateMaxWalletBalance(100001, 'USD', maxLimits)).toThrow(
        ValidationError,
      );
      expect(() => validateMaxWalletBalance(100001, 'USD', maxLimits)).toThrow(
        'would exceed maximum limit',
      );
    });

    it('should include balance and limit in error details', () => {
      try {
        validateMaxWalletBalance(150000, 'USD', maxLimits);
        fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.details).toEqual({
          newBalance: '150000',
          limit: '100000',
          currency: 'USD',
        });
      }
    });
  });

  describe('validatePagination', () => {
    it('should accept valid pagination parameters', () => {
      const result1 = validatePagination(1, 10);
      expect(result1).toEqual({ page: 1, pageSize: 10 });

      const result2 = validatePagination(5, 50);
      expect(result2).toEqual({ page: 5, pageSize: 50 });

      const result3 = validatePagination(100, 100);
      expect(result3).toEqual({ page: 100, pageSize: 100 });
    });

    it('should accept string parameters and convert to numbers', () => {
      const result = validatePagination('3', '25');
      expect(result).toEqual({ page: 3, pageSize: 25 });
    });

    it('should reject page less than 1', () => {
      expect(() => validatePagination(0, 10)).toThrow(ValidationError);
      expect(() => validatePagination(-1, 10)).toThrow('must be a positive integer');
    });

    it('should reject pageSize less than 1', () => {
      expect(() => validatePagination(1, 0)).toThrow(ValidationError);
      expect(() => validatePagination(1, -1)).toThrow('must be between 1 and 100');
    });

    it('should reject pageSize greater than 100', () => {
      expect(() => validatePagination(1, 101)).toThrow(ValidationError);
      expect(() => validatePagination(1, 1000)).toThrow('must be between 1 and 100');
    });

    it('should reject non-numeric values', () => {
      expect(() => validatePagination('abc', 10)).toThrow(ValidationError);
      expect(() => validatePagination(1, 'xyz')).toThrow(ValidationError);
    });
  });

  describe('validateWalletActive', () => {
    it('should accept active status', () => {
      expect(() => validateWalletActive('active')).not.toThrow();
    });

    it('should reject non-active status', () => {
      const inactiveStatuses = ['frozen', 'closed', 'pending', 'suspended', ''];

      inactiveStatuses.forEach((status) => {
        expect(() => validateWalletActive(status)).toThrow(ValidationError);
        expect(() => validateWalletActive(status)).toThrow('Wallet is not active');
      });
    });

    it('should include status in error details', () => {
      try {
        validateWalletActive('frozen');
        fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.details).toEqual({ status: 'frozen' });
      }
    });
  });

  describe('validateRequiredFields', () => {
    it('should pass when all required fields are present', () => {
      const data = {
        name: 'John',
        email: 'john@example.com',
        age: 30,
      };

      expect(() => validateRequiredFields(data, ['name', 'email', 'age'])).not.toThrow();
    });

    it('should pass when extra fields are present', () => {
      const data = {
        name: 'John',
        email: 'john@example.com',
        age: 30,
        optional: 'value',
      };

      expect(() => validateRequiredFields(data, ['name', 'email'])).not.toThrow();
    });

    it('should reject when required field is missing', () => {
      const data = {
        name: 'John',
        age: 30,
      };

      expect(() => validateRequiredFields(data, ['name', 'email', 'age'])).toThrow(
        ValidationError,
      );
      expect(() => validateRequiredFields(data, ['name', 'email', 'age'])).toThrow(
        'Missing required fields',
      );
    });

    it('should reject when required field is null', () => {
      const data = {
        name: 'John',
        email: null,
        age: 30,
      };

      expect(() => validateRequiredFields(data, ['name', 'email', 'age'])).toThrow(
        ValidationError,
      );
    });

    it('should reject when required field is undefined', () => {
      const data = {
        name: 'John',
        email: undefined,
        age: 30,
      };

      expect(() => validateRequiredFields(data, ['name', 'email', 'age'])).toThrow(
        ValidationError,
      );
    });

    it('should include missing fields in error details', () => {
      const data = {
        name: 'John',
      };

      try {
        validateRequiredFields(data, ['name', 'email', 'age']);
        fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.details).toEqual({ missing: ['email', 'age'] });
      }
    });

    it('should accept zero and false as valid values', () => {
      const data = {
        count: 0,
        enabled: false,
      };

      expect(() => validateRequiredFields(data, ['count', 'enabled'])).not.toThrow();
    });
  });
});

