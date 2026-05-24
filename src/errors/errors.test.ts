import { describe, it, expect } from 'vitest';
import {
  VaultwardenError,
  AuthenticationError,
  APIError,
  ValidationError,
  PermissionError,
  NotFoundError,
  RateLimitError,
  TimeoutError,
  CryptoError,
  StateError,
} from './index.js';

describe('Errors', () => {
  describe('VaultwardenError', () => {
    it('should create base error', () => {
      const error = new VaultwardenError('Something went wrong', 'TEST_ERROR');
      expect(error.message).toBe('Something went wrong');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.name).toBe('VaultwardenError');
    });

    it('should include status code', () => {
      const error = new VaultwardenError('Not found', 'NOT_FOUND', 404);
      expect(error.statusCode).toBe(404);
    });

    it('should convert to JSON', () => {
      const error = new VaultwardenError('Test', 'TEST');
      const json = error.toJSON();
      expect(json.message).toBe('Test');
      expect(json.code).toBe('TEST');
      expect(json.name).toBe('VaultwardenError');
    });
  });

  describe('AuthenticationError', () => {
    it('should create default error', () => {
      const error = new AuthenticationError();
      expect(error.message).toBe('Authentication failed');
      expect(error.statusCode).toBe(401);
    });

    it('should create invalid credentials error', () => {
      const error = AuthenticationError.invalidCredentials();
      expect(error.message).toBe('Invalid username or password');
      expect(error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should create 2FA required error', () => {
      const error = AuthenticationError.twoFactorRequired('email');
      expect(error.message).toBe('Two-factor authentication required');
      expect(error.code).toBe('2FA_REQUIRED');
      expect(error.context?.method).toBe('email');
    });

    it('should create session expired error', () => {
      const error = AuthenticationError.sessionExpired();
      expect(error.message).toBe('Session has expired, please log in again');
      expect(error.code).toBe('SESSION_EXPIRED');
    });
  });

  describe('APIError', () => {
    it('should create from response', () => {
      const response = new Response('', { status: 404, statusText: 'Not Found' });
      const error = APIError.fromResponse(response, '/api/test', 'GET');
      expect(error.message).toBe('Not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('HTTP_404');
    });

    it('should detect rate limit', () => {
      const error = new APIError('Rate limited', 429);
      expect(error.isRateLimit).toBe(true);
      expect(error.shouldRetry).toBe(true);
    });

    it('should detect server error', () => {
      const error = new APIError('Server error', 500);
      expect(error.isServerError).toBe(true);
      expect(error.shouldRetry).toBe(true);
    });

    it('should detect client error', () => {
      const error = new APIError('Bad request', 400);
      expect(error.isClientError).toBe(true);
      expect(error.shouldRetry).toBe(false);
    });
  });

  describe('ValidationError', () => {
    it('should create field error', () => {
      const error = new ValidationError('Name is required', 'name', ['required']);
      expect(error.field).toBe('name');
      expect(error.constraints).toEqual(['required']);
    });

    it('should create required field error', () => {
      const error = ValidationError.requiredField('email');
      expect(error.message).toBe("Field 'email' is required");
      expect(error.field).toBe('email');
    });

    it('should create invalid value error', () => {
      const error = ValidationError.invalidValue('age', 'number');
      expect(error.message).toBe("Field 'age' must be number");
    });
  });

  describe('PermissionError', () => {
    it('should create default error', () => {
      const error = new PermissionError();
      expect(error.message).toBe('Permission denied');
      expect(error.statusCode).toBe(403);
    });

    it('should create insufficient permission error', () => {
      const error = PermissionError.insufficientPermission('admin:write', 'ciphers');
      expect(error.requiredPermission).toBe('admin:write');
      expect(error.resource).toBe('ciphers');
    });
  });

  describe('NotFoundError', () => {
    it('should create cipher not found error', () => {
      const error = NotFoundError.cipher('abc-123');
      expect(error.message).toBe("Cipher 'abc-123' not found");
      expect(error.resourceType).toBe('Cipher');
      expect(error.resourceId).toBe('abc-123');
    });

    it('should create folder not found error', () => {
      const error = NotFoundError.folder('folder-1');
      expect(error.resourceType).toBe('Folder');
    });
  });

  describe('RateLimitError', () => {
    it('should create error with retry after', () => {
      const error = new RateLimitError(60, 100);
      expect(error.retryAfter).toBe(60);
      expect(error.limit).toBe(100);
      expect(error.statusCode).toBe(429);
    });

    it('should indicate should retry', () => {
      const error = new RateLimitError();
      expect(error.shouldRetry).toBe(true);
    });
  });

  describe('TimeoutError', () => {
    it('should create timeout error', () => {
      const error = new TimeoutError('/api/sync', 30000);
      expect(error.message).toContain('/api/sync');
      expect(error.timeoutMs).toBe(30000);
    });
  });

  describe('CryptoError', () => {
    it('should create key derivation error', () => {
      const error = CryptoError.keyDerivation();
      expect(error.operation).toBe('keyDerivation');
      expect(error.message).toBe('Failed to derive encryption key');
    });

    it('should create decryption error', () => {
      const error = CryptoError.decryption();
      expect(error.operation).toBe('decryption');
      expect(error.message).toBe('Failed to decrypt data');
    });
  });

  describe('StateError', () => {
    it('should create not authenticated error', () => {
      const error = StateError.notAuthenticated();
      expect(error.message).toBe('Not authenticated. Call login() first.');
      expect(error.code).toBe('NOT_AUTHENTICATED');
    });

    it('should create not ready error', () => {
      const error = StateError.notReady();
      expect(error.message).toBe('Client not ready. Ensure login() completed successfully.');
    });
  });
});
