/**
 * Custom error classes for Vaultwarden Client
 * @module errors
 */

/**
 * Base error class for all Vaultwarden client errors
 * @extends Error
 */
export class VaultwardenError extends Error {
  /** Error code for programmatic handling */
  public readonly code: string;
  /** HTTP status code if applicable */
  public readonly statusCode?: number;
  /** Additional error context */
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode?: number,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'VaultwardenError';
    this.code = code;
    this.statusCode = statusCode!;
    this.context = context!;

    // Fix prototype chain for instanceof checks
    Object.setPrototypeOf(this, VaultwardenError.prototype);

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON representation
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
      stack: this.stack,
    };
  }
}

/**
 * Error thrown when authentication fails
 * @extends VaultwardenError
 */
export class AuthenticationError extends VaultwardenError {
  constructor(
    message = 'Authentication failed',
    code = 'AUTH_FAILED',
    context?: Record<string, unknown>
  ) {
    super(message, code, 401, context);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }

  /**
   * Create error for invalid credentials
   */
  static invalidCredentials(): AuthenticationError {
    return new AuthenticationError(
      'Invalid username or password',
      'INVALID_CREDENTIALS'
    );
  }

  /**
   * Create error for missing 2FA
   */
  static twoFactorRequired(method?: string): AuthenticationError {
    return new AuthenticationError(
      'Two-factor authentication required',
      '2FA_REQUIRED',
      { method }
    );
  }

  /**
   * Create error for invalid 2FA code
   */
  static invalidTwoFactorCode(): AuthenticationError {
    return new AuthenticationError(
      'Invalid two-factor authentication code',
      'INVALID_2FA_CODE'
    );
  }

  /**
   * Create error for expired session
   */
  static sessionExpired(): AuthenticationError {
    return new AuthenticationError(
      'Session has expired, please log in again',
      'SESSION_EXPIRED'
    );
  }
}

/**
 * Error thrown when an API request fails
 * @extends VaultwardenError
 */
export class APIError extends VaultwardenError {
  /** Response body if available */
  public readonly responseBody?: string;
  /** Request endpoint */
  public readonly endpoint?: string;
  /** Request method */
  public readonly method?: string;

  constructor(
    message: string,
    statusCode: number,
    code = 'API_ERROR',
    context?: Record<string, unknown>
  ) {
    super(message, code, statusCode, context);
    this.name = 'APIError';
    this.responseBody = (context?.responseBody as string | undefined)!;
    this.endpoint = (context?.endpoint as string | undefined)!;
    this.method = (context?.method as string | undefined)!;
    Object.setPrototypeOf(this, APIError.prototype);
  }

  /**
   * Create error from HTTP response
   */
  static fromResponse(
    response: Response,
    endpoint: string,
    method: string,
    body?: string
  ): APIError {
    const messages: Record<number, string> = {
      400: 'Bad request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not found',
      405: 'Method not allowed',
      409: 'Conflict',
      429: 'Rate limited',
      500: 'Internal server error',
      502: 'Bad gateway',
      503: 'Service unavailable',
    };

    const message = messages[response.status] ?? `HTTP ${response.status} error`;
    const code = `HTTP_${response.status}`;

    return new APIError(message, response.status, code, {
      endpoint,
      method,
      responseBody: body,
      statusText: response.statusText,
    });
  }

  /**
   * Check if error is a rate limit error
   */
  get isRateLimit(): boolean {
    return this.statusCode === 429;
  }

  /**
   * Check if error is a server error (5xx)
   */
  get isServerError(): boolean {
    return this.statusCode !== undefined && this.statusCode >= 500;
  }

  /**
   * Check if error is a client error (4xx)
   */
  get isClientError(): boolean {
    return this.statusCode !== undefined && this.statusCode >= 400 && this.statusCode < 500;
  }

  /**
   * Check if request should be retried
   */
  get shouldRetry(): boolean {
    if (this.statusCode === undefined) return true;
    // Retry on rate limit, server errors, and specific client errors
    return this.isRateLimit || this.isServerError || [408, 409, 422].includes(this.statusCode);
  }
}

/**
 * Error thrown for validation failures
 * @extends VaultwardenError
 */
export class ValidationError extends VaultwardenError {
  /** Field that failed validation */
  public readonly field?: string;
  /** Validation constraints that failed */
  public readonly constraints?: string[];

  constructor(
    message: string,
    field?: string,
    constraints?: string[]
  ) {
    super(message, 'VALIDATION_ERROR', undefined, { field, constraints });
    this.name = 'ValidationError';
    this.field = field!;
    this.constraints = constraints!;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  /**
   * Create error for missing required field
   */
  static requiredField(field: string): ValidationError {
    return new ValidationError(
      `Field '${field}' is required`,
      field,
      ['required']
    );
  }

  /**
   * Create error for invalid field value
   */
  static invalidValue(field: string, expectedType: string): ValidationError {
    return new ValidationError(
      `Field '${field}' must be ${expectedType}`,
      field,
      [`type:${expectedType}`]
    );
  }

  /**
   * Create error for empty value
   */
  static notEmpty(field: string): ValidationError {
    return new ValidationError(
      `Field '${field}' cannot be empty`,
      field,
      ['notEmpty']
    );
  }

  /**
   * Create error for invalid URL
   */
  static invalidUrl(field: string): ValidationError {
    return new ValidationError(
      `Field '${field}' must be a valid URL`,
      field,
      ['url']
    );
  }

  /**
   * Create error for invalid email
   */
  static invalidEmail(field: string): ValidationError {
    return new ValidationError(
      `Field '${field}' must be a valid email address`,
      field,
      ['email']
    );
  }
}

/**
 * Error thrown for permission-related failures
 * @extends VaultwardenError
 */
export class PermissionError extends VaultwardenError {
  /** Required permission */
  public readonly requiredPermission?: string;
  /** Resource being accessed */
  public readonly resource?: string;

  constructor(
    message = 'Permission denied',
    code = 'PERMISSION_DENIED',
    context?: Record<string, unknown>
  ) {
    super(message, code, 403, context);
    this.name = 'PermissionError';
    this.requiredPermission = (context?.requiredPermission as string | undefined)!;
    this.resource = (context?.resource as string | undefined)!;
    Object.setPrototypeOf(this, PermissionError.prototype);
  }

  /**
   * Create error for insufficient permissions
   */
  static insufficientPermission(
    requiredPermission: string,
    resource?: string
  ): PermissionError {
    return new PermissionError(
      `Insufficient permissions: ${requiredPermission} required`,
      'INSUFFICIENT_PERMISSION',
      { requiredPermission, resource }
    );
  }

  /**
   * Create error for organization access denied
   */
  static organizationAccessDenied(orgId: string): PermissionError {
    return new PermissionError(
      'Access denied to organization',
      'ORG_ACCESS_DENIED',
      { organizationId: orgId }
    );
  }

  /**
   * Create error for collection access denied
   */
  static collectionAccessDenied(collectionId: string): PermissionError {
    return new PermissionError(
      'Access denied to collection',
      'COLLECTION_ACCESS_DENIED',
      { collectionId }
    );
  }
}

/**
 * Error thrown when a resource is not found
 * @extends VaultwardenError
 */
export class NotFoundError extends VaultwardenError {
  /** Resource type */
  public readonly resourceType?: string;
  /** Resource identifier */
  public readonly resourceId?: string;

  constructor(
    resourceType?: string,
    resourceId?: string,
    message?: string
  ) {
    const msg = message ?? `${resourceType ?? 'Resource'}${resourceId ? ` '${resourceId}'` : ''} not found`;
    super(msg, 'NOT_FOUND', 404, { resourceType, resourceId });
    this.name = 'NotFoundError';
    this.resourceType = resourceType!;
    this.resourceId = resourceId!;
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }

  /**
   * Create error for cipher not found
   */
  static cipher(id: string): NotFoundError {
    return new NotFoundError('Cipher', id);
  }

  /**
   * Create error for folder not found
   */
  static folder(id: string): NotFoundError {
    return new NotFoundError('Folder', id);
  }

  /**
   * Create error for organization not found
   */
  static organization(id: string): NotFoundError {
    return new NotFoundError('Organization', id);
  }

  /**
   * Create error for collection not found
   */
  static collection(id: string): NotFoundError {
    return new NotFoundError('Collection', id);
  }
}

/**
 * Error thrown for rate limiting
 * @extends VaultwardenError
 */
export class RateLimitError extends VaultwardenError {
  /** Time to wait before retry (seconds) */
  public readonly retryAfter?: number;
  /** Limit that was hit */
  public readonly limit?: number;

  constructor(
    retryAfter?: number,
    limit?: number,
    message?: string
  ) {
    const msg = message ?? `Rate limit exceeded. Retry after ${retryAfter ?? 'some'} seconds.`;
    super(msg, 'RATE_LIMITED', 429, { retryAfter, limit });
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter!;
    this.limit = limit!;
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }

  /**
   * Check if retry should be attempted
   */
  get shouldRetry(): boolean {
    return true;
  }
}

/**
 * Error thrown for timeout failures
 * @extends VaultwardenError
 */
export class TimeoutError extends VaultwardenError {
  /** Request endpoint that timed out */
  public readonly endpoint?: string;
  /** Timeout duration in milliseconds */
  public readonly timeoutMs?: number;

  constructor(
    endpoint?: string,
    timeoutMs?: number,
    message?: string
  ) {
    const msg = message ?? `Request${endpoint ? ` to ${endpoint}` : ''} timed out after ${timeoutMs ?? ''}ms`;
    super(msg, 'TIMEOUT', undefined, { endpoint, timeoutMs });
    this.name = 'TimeoutError';
    this.endpoint = endpoint!;
    this.timeoutMs = timeoutMs!;
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}

/**
 * Error thrown for crypto operation failures
 * @extends VaultwardenError
 */
export class CryptoError extends VaultwardenError {
  /** Operation that failed */
  public readonly operation?: string;

  constructor(
    message: string,
    operation?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'CRYPTO_ERROR', undefined, { ...context, operation });
    this.name = 'CryptoError';
    this.operation = operation!;
    Object.setPrototypeOf(this, CryptoError.prototype);
  }

  /**
   * Create error for key derivation failure
   */
  static keyDerivation(): CryptoError {
    return new CryptoError(
      'Failed to derive encryption key',
      'keyDerivation'
    );
  }

  /**
   * Create error for decryption failure
   */
  static decryption(): CryptoError {
    return new CryptoError(
      'Failed to decrypt data',
      'decryption'
    );
  }

  /**
   * Create error for encryption failure
   */
  static encryption(): CryptoError {
    return new CryptoError(
      'Failed to encrypt data',
      'encryption'
    );
  }
}

/**
 * Error thrown when state is invalid
 * @extends VaultwardenError
 */
export class StateError extends VaultwardenError {
  constructor(
    message: string,
    code = 'INVALID_STATE'
  ) {
    super(message, code);
    this.name = 'StateError';
    Object.setPrototypeOf(this, StateError.prototype);
  }

  /**
   * Create error for not authenticated
   */
  static notAuthenticated(): StateError {
    return new StateError(
      'Not authenticated. Call login() first.',
      'NOT_AUTHENTICATED'
    );
  }

  /**
   * Create error for already authenticated
   */
  static alreadyAuthenticated(): StateError {
    return new StateError(
      'Already authenticated. Logout first.',
      'ALREADY_AUTHENTICATED'
    );
  }

  /**
   * Create error for client not ready
   */
  static notReady(): StateError {
    return new StateError(
      'Client not ready. Ensure login() completed successfully.',
      'NOT_READY'
    );
  }
}
