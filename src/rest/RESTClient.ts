/**
 * REST client for handling HTTP communication with Vaultwarden API
 * @module rest
 */

import type { VaultwardenClient } from '../client/VaultwardenClient.js';
import type {
  VaultClientOptions,
  AuthTokenResponse,
  PreloginResponse,
  APISyncResponse,
  LoginCredentials,
} from '../types/index.js';
import {
  APIError,
  AuthenticationError,
  TimeoutError,
  RateLimitError,
  StateError,
} from '../errors/index.js';

/** Request method type */
type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/** Request options */
interface RequestOptions {
  method?: HTTPMethod;
  body?: unknown;
  headers?: Record<string, string>;
  skipAuth?: boolean;
  retryCount?: number;
}


/**
 * REST client for handling all HTTP communication
 */
export class RESTClient {
  /** Reference to the main client */
  public readonly client: VaultwardenClient;

  /** Base URL of the server */
  public readonly baseUrl: string;

  /** Device type identifier */
  public readonly deviceType: number;

  /** Device name */
  public readonly deviceName: string;

  /** Request timeout in ms */
  public readonly timeout: number;

  /** Max retry attempts */
  public readonly maxRetries: number;

  /** Debug mode */
  public readonly debug: boolean;

  /** Current access token */
  private accessToken: string | null = null;

  /** Current refresh token */
  private refreshToken: string | null = null;

  /** Token expiration timestamp */
  private tokenExpiresAt: number = 0;

  /** Master key derived from password */
  private masterKey: Buffer | null = null;

  /** Symmetric encryption key */
  private symmetricKey: Buffer | null = null;

  /** MAC key for integrity verification */
  private macKey: Buffer | null = null;

  /** Whether currently refreshing token */
  private isRefreshing = false;

  /** Queue for requests waiting for token refresh */
  private refreshQueue: Array<{
    resolve: (value: boolean) => void;
    reject: (error: Error) => void;
  }> = [];

  // Note: Request queue for rate limiting can be implemented here if needed

  /** Whether rate limit is active */
  private rateLimited = false;

  /** Time when rate limit resets */
  private rateLimitResetAt = 0;

  constructor(client: VaultwardenClient, options: VaultClientOptions) {
    this.client = client;
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.deviceType = options.deviceType ?? 8;
    this.deviceName = options.deviceName ?? 'vaultwarden-client';
    this.timeout = options.timeout ?? 30000;
    this.maxRetries = options.retries ?? 3;
    this.debug = options.debug ?? false;
  }

  // ============================================================================
  // Authentication State
  // ============================================================================

  /**
   * Check if currently authenticated
   */
  get isAuthenticated(): boolean {
    return this.accessToken !== null && Date.now() < this.tokenExpiresAt;
  }

  /**
   * Check if keys are available for encryption/decryption
   */
  get isReady(): boolean {
    return this.isAuthenticated && this.symmetricKey !== null;
  }

  /**
   * Get the symmetric encryption key
   */
  get key(): Buffer | null {
    return this.symmetricKey;
  }

  /**
   * Get the master key
   */
  get masterKeyBuffer(): Buffer | null {
    return this.masterKey;
  }

  /**
   * Get the MAC key
   */
  get macKeyBuffer(): Buffer | null {
    return this.macKey;
  }

  // ============================================================================
  // Authentication
  // ============================================================================

  /**
   * Authenticate with username and password
   */
  async login(credentials: LoginCredentials): Promise<AuthTokenResponse> {
    try {
      // Get KDF parameters
      const prelogin = await this.fetchPrelogin(credentials.username);

      // Import crypto utilities dynamically to avoid circular deps
      const { makeKeyFromPassword, makeMasterPasswordHash, stretchMasterKey } = await import(
        '../utils/crypto.js'
      );

      // Derive master key
      const masterKey = makeKeyFromPassword(
        credentials.password,
        credentials.username,
        prelogin.kdfIterations
      );
      this.masterKey = Buffer.from(masterKey, 'base64');

      // Stretch master key for encryption
      const { encKey } = stretchMasterKey(this.masterKey);

      // Hash password for authentication
      const hashedPassword = makeMasterPasswordHash(credentials.password, masterKey);

      // Build device identifier
      const { generateRandomString } = await import('../utils/crypto.js');
      const deviceIdentifier = generateRandomString(20);
      const clientId = `${this.deviceType}.${deviceIdentifier}`;

      // Build token request
      const params = new URLSearchParams();
      params.append('grant_type', 'password');
      params.append('username', credentials.username);
      params.append('password', hashedPassword);
      params.append('scope', 'api offline_access');
      params.append('client_id', clientId);
      params.append('deviceIdentifier', deviceIdentifier);
      params.append('deviceType', this.deviceType.toString());
      params.append('deviceName', this.deviceName);

      // Add 2FA if provided
      if (credentials.twoFactorCode) {
        params.append('twoFactorToken', credentials.twoFactorCode);
        params.append(
          'twoFactorProvider',
          (credentials.twoFactorProvider ?? 0).toString()
        );
      }

      // Request token
      const response = await this.rawRequest(
        'POST',
        '/identity/connect/token',
        {
          body: params.toString(),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          skipAuth: true,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 400) {
          // Check if 2FA is required
          try {
            const errorData = JSON.parse(errorText) as { error_description?: string };
            if (errorData.error_description?.includes('Two-factor')) {
              throw AuthenticationError.twoFactorRequired();
            }
          } catch (e) {
            if (e instanceof AuthenticationError) throw e;
          }
        }
        throw AuthenticationError.invalidCredentials();
      }

      const tokenData = await response.json() as AuthTokenResponse;
      await this.setTokens(tokenData);

      // Fetch sync to get encrypted symmetric key
      const syncData = await this.get('/api/sync') as APISyncResponse;
      const encryptedKey = syncData.profile.key;

      // Decrypt symmetric key
      const { decryptProfileKey } = await import('../utils/encryption.js');
      const decryptedKey = decryptProfileKey(encryptedKey, encKey);

      if (!decryptedKey || decryptedKey.length !== 64) {
        throw new Error('Failed to decrypt symmetric key');
      }

      // Split into encryption key and MAC key
      this.symmetricKey = decryptedKey.subarray(0, 32);
      this.macKey = decryptedKey.subarray(32, 64);

      this.log('debug', 'Login successful, keys established');

      return tokenData;
    } catch (error) {
      this.clearAuth();
      throw error;
    }
  }

  /**
   * Logout and clear authentication state
   */
  logout(): void {
    this.clearAuth();
    this.client.emit('logout');
  }

  /**
   * Clear all authentication state
   */
  private clearAuth(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiresAt = 0;
    this.masterKey = null;
    this.symmetricKey = null;
    this.macKey = null;
  }

  /**
   * Set tokens from authentication response
   */
  private async setTokens(tokenData: AuthTokenResponse): Promise<void> {
    this.accessToken = tokenData.access_token;
    this.refreshToken = tokenData.refresh_token ?? null;
    this.tokenExpiresAt = Date.now() + tokenData.expires_in * 1000;
    this.client.emit('login', tokenData);
  }

  /**
   * Fetch prelogin data for KDF parameters
   */
  private async fetchPrelogin(email: string): Promise<PreloginResponse> {
    const response = await this.rawRequest(
      'POST',
      '/identity/accounts/prelogin',
      {
        body: JSON.stringify({ email }),
        headers: { 'Content-Type': 'application/json' },
        skipAuth: true,
      }
    );

    if (!response.ok) {
      throw new Error('Failed to get prelogin info');
    }

    return response.json() as Promise<PreloginResponse>;
  }

  /**
   * Refresh the access token
   */
  private async refreshAccessToken(): Promise<boolean> {
    if (this.isRefreshing) {
      // Wait for existing refresh
      return new Promise((resolve, reject) => {
        this.refreshQueue.push({ resolve, reject });
      });
    }

    if (!this.refreshToken) {
      return false;
    }

    this.isRefreshing = true;

    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', this.refreshToken);
      params.append('client_id', `${this.deviceType}.vaultwarden-client`);

      const response = await this.rawRequest(
        'POST',
        '/identity/connect/token',
        {
          body: params.toString(),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          skipAuth: true,
        }
      );

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const tokenData = await response.json() as AuthTokenResponse;
      await this.setTokens(tokenData);

      // Resolve waiting promises
      this.refreshQueue.forEach(({ resolve }) => resolve(true));
      this.refreshQueue = [];

      return true;
    } catch (error) {
      this.refreshQueue.forEach(({ reject }) => reject(error as Error));
      this.refreshQueue = [];
      this.clearAuth();
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  // ============================================================================
  // HTTP Methods
  // ============================================================================

  /**
   * Make a GET request
   */
  async get(endpoint: string, options?: Omit<RequestOptions, 'method' & 'body'>): Promise<unknown> {
    return this.request('GET', endpoint, options);
  }

  /**
   * Make a POST request
   */
  async post(endpoint: string, body: unknown, options?: Omit<RequestOptions, 'method'>): Promise<unknown> {
    return this.request('POST', endpoint, { ...options, body });
  }

  /**
   * Make a PUT request
   */
  async put(endpoint: string, body: unknown, options?: Omit<RequestOptions, 'method'>): Promise<unknown> {
    return this.request('PUT', endpoint, { ...options, body });
  }

  /**
   * Make a DELETE request
   */
  async delete(endpoint: string, options?: Omit<RequestOptions, 'method' & 'body'>): Promise<void> {
    await this.request('DELETE', endpoint, options);
  }

  /**
   * Make a PATCH request
   */
  async patch(endpoint: string, body: unknown, options?: Omit<RequestOptions, 'method'>): Promise<unknown> {
    return this.request('PATCH', endpoint, { ...options, body });
  }

  // ============================================================================
  // Core Request Handling
  // ============================================================================

  /**
   * Make a request with full control
   */
  private async request(
    method: HTTPMethod,
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<unknown> {
    const { body, headers = {}, skipAuth = false } = options;

    // Check authentication
    if (!skipAuth && !this.isAuthenticated) {
      // Try to refresh
      const refreshed = await this.refreshAccessToken();
      if (!refreshed) {
        throw StateError.notAuthenticated();
      }
    }

    // Wait if rate limited
    if (this.rateLimited && Date.now() < this.rateLimitResetAt) {
      const delay = this.rateLimitResetAt - Date.now();
      this.log('warn', `Rate limited, waiting ${delay}ms`);
      await this.sleep(delay);
    }

    // Prepare request
    const url = `${this.baseUrl}${endpoint}`;
    const requestHeaders: Record<string, string> = {
      ...headers,
    };

    if (!skipAuth && this.accessToken) {
      requestHeaders.Authorization = `Bearer ${this.accessToken}`;
    }

    if (body && typeof body === 'object' && !(body instanceof FormData)) {
      if (!requestHeaders['Content-Type']) {
        requestHeaders['Content-Type'] = 'application/json';
      }
    }

    // Execute with retries
    const retryCount = options.retryCount ?? 0;

    try {
      this.log('debug', `${method} ${endpoint}`);

      const requestBody = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null;
      const response = await this.executeRequest(url, {
        method,
        headers: requestHeaders,
        ...(requestBody !== null && { body: requestBody }),
      });

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') ?? '60', 10);
        throw new RateLimitError(retryAfter);
      }

      // Handle errors
      if (!response.ok) {
        const errorBody = await response.text().catch(() => undefined);
        throw APIError.fromResponse(response, endpoint, method, errorBody);
      }

      // Parse response
      if (method === 'DELETE' || response.status === 204) {
        return undefined;
      }

      return response.json();
    } catch (error) {
      // Retry on certain errors
      if (this.shouldRetry(error, retryCount)) {
        await this.sleep(this.getRetryDelay(retryCount));
        return this.request(method, endpoint, {
          ...options,
          retryCount: retryCount + 1,
        });
      }

      throw error;
    }
  }

  /**
   * Execute raw fetch request with timeout
   */
  private async executeRequest(
    url: string,
    init: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new TimeoutError(url, this.timeout);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Make a raw request without processing
   */
  private async rawRequest(
    method: HTTPMethod,
    endpoint: string,
    options: RequestOptions
  ): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      ...options.headers,
    };

    if (!options.skipAuth && this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const requestBody = options.body as string | null;
    return this.executeRequest(url, {
      method,
      headers,
      ...(requestBody !== null && { body: requestBody }),
    });
  }

  // ============================================================================
  // Retry Logic
  // ============================================================================

  /**
   * Check if request should be retried
   */
  private shouldRetry(error: unknown, retryCount: number): boolean {
    if (retryCount >= this.maxRetries) {
      return false;
    }

    if (error instanceof RateLimitError) {
      return true;
    }

    if (error instanceof APIError) {
      return error.shouldRetry;
    }

    if (error instanceof TimeoutError) {
      return true;
    }

    // Network errors
    if (error instanceof Error) {
      const retryableErrors = [
        'ECONNRESET',
        'ETIMEDOUT',
        'ECONNREFUSED',
        'ENOTFOUND',
        'EAI_AGAIN',
      ];
      return retryableErrors.some((code) => error.message.includes(code));
    }

    return false;
  }

  /**
   * Get delay before retry (exponential backoff)
   */
  private getRetryDelay(retryCount: number): number {
    // Exponential backoff: 1s, 2s, 4s, etc.
    return Math.min(1000 * 2 ** retryCount, 30000);
  }

  /**
   * Sleep for a given duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ============================================================================
  // Logging
  // ============================================================================

  /**
   * Log a message if debug mode is enabled
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    if (!this.debug && level === 'debug') return;
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  }
}
