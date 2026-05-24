/**
 * Main client class for Vaultwarden SDK
 * @module client
 */

import { EventEmitter } from '../utils/EventEmitter.js';
import { RESTClient } from '../rest/RESTClient.js';
import {
  CipherManager,
  FolderManager,
  OrganizationManager,
  CollectionManager,
} from '../managers/index.js';
import type {
  VaultClientOptions,
  LoginCredentials,
  AuthTokenResponse,
  PasswordGenerationOptions,
  PassphraseGenerationOptions,
  ClientEvents,
} from '../types/index.js';
import type {
  LoginCipher,
  CardCipher,
  SecureNoteCipher,
  IdentityCipher,
  BaseCipher,
} from '../structures/index.js';
import { generateSecurePassword, generatePassphrase } from '../utils/crypto.js';

/**
 * Main client for interacting with Vaultwarden/Bitwarden servers
 *
 * @example
 * ```typescript
 * const client = new VaultwardenClient({
 *   baseUrl: 'https://vault.example.com',
 * });
 *
 * await client.login({
 *   username: 'user@example.com',
 *   password: 'password',
 * });
 *
 * const ciphers = await client.ciphers.sync();
 * ```
 */
export class VaultwardenClient extends EventEmitter<ClientEvents> {
  /** Client options */
  public readonly options: VaultClientOptions;

  /** REST client for API communication */
  public readonly rest: RESTClient;

  /** Cipher manager for password/item operations */
  public readonly ciphers: CipherManager;

  /** Folder manager for organizing ciphers */
  public readonly folders: FolderManager;

  /** Organization manager for shared vaults */
  public readonly organizations: OrganizationManager;

  /** Collection manager for organization collections */
  public readonly collections: CollectionManager;

  /** Timestamp when client became ready */
  public readyAt: Date | null = null;

  /**
   * Create a new VaultwardenClient
   * @param options Client configuration options
   */
  constructor(options: VaultClientOptions) {
    super();

    // Set defaults
    this.options = {
      deviceType: 8, // Android
      deviceName: 'vaultwarden-client',
      timeout: 30000,
      retries: 3,
      debug: false,
      ...options,
    };

    // Initialize REST client
    this.rest = new RESTClient(this, this.options);

    // Initialize managers
    this.ciphers = new CipherManager(this);
    this.folders = new FolderManager(this);
    this.organizations = new OrganizationManager(this);
    this.collections = new CollectionManager(this);
  }

  // ============================================================================
  // State Getters
  // ============================================================================

  /**
   * Check if the client is ready for operations
   */
  get isReady(): boolean {
    return this.rest.isReady;
  }

  /**
   * Check if the client is authenticated
   */
  get isAuthenticated(): boolean {
    return this.rest.isAuthenticated;
  }

  /**
   * Get uptime in milliseconds
   */
  get uptime(): number {
    return this.readyAt ? Date.now() - this.readyAt.getTime() : 0;
  }

  // ============================================================================
  // Authentication
  // ============================================================================

  /**
   * Log in with username and password
   * @param credentials Login credentials
   * @returns Authentication token response
   *
   * @example
   * ```typescript
   * const token = await client.login({
   *   username: 'user@example.com',
   *   password: 'password',
   * });
   *
   * // With 2FA
   * const token = await client.login({
   *   username: 'user@example.com',
   *   password: 'password',
   *   twoFactorCode: '123456',
   * });
   * ```
   */
  async login(credentials: LoginCredentials): Promise<AuthTokenResponse> {
    const token = await this.rest.login(credentials);
    this.readyAt = new Date();
    this.emit('ready');
    return token;
  }

  /**
   * Log out and clear all data
   */
  logout(): void {
    this.rest.logout();
    this.ciphers.cache.clear();
    this.folders.cache.clear();
    this.organizations.cache.clear();
    this.collections.cache.clear();
    this.readyAt = null;
  }

  /**
   * Sync all data from server
   * Fetches ciphers, folders, organizations, and collections
   */
  async sync(): Promise<void> {
    this.ensureReady();

    await Promise.all([
      this.ciphers.sync(),
      this.folders.sync(),
      this.organizations.sync(),
      this.collections.sync(),
    ]);

    this.emit('sync');
  }

  // ============================================================================
  // Convenience Methods
  // ============================================================================

  /**
   * Create a new login cipher
   * @param data Login data
   * @returns Created LoginCipher
   *
   * @example
   * ```typescript
   * const login = await client.createLogin({
   *   name: 'GitHub',
   *   username: 'myuser',
   *   password: client.generatePassword(),
   *   uri: 'https://github.com',
   * });
   * ```
   */
  async createLogin(data: {
    name: string;
    username?: string;
    password?: string;
    uri?: string;
    uris?: import('../types/index.js').LoginUri[];
    totp?: string;
    notes?: string;
    folder?: import('../structures/FolderStructure.js').FolderStructure | string | null;
    favorite?: boolean;
    organizationId?: string;
    collectionIds?: string[];
  }): Promise<LoginCipher> {
    const folderId = data.folder
      ? typeof data.folder === 'string'
        ? data.folder
        : data.folder.id
      : null;

    return this.ciphers.createLogin({
      name: data.name,
      username: data.username ?? null,
      password: data.password ?? null,
      uri: data.uri ?? null,
      uris: data.uris ?? null,
      totp: data.totp ?? null,
      notes: data.notes ?? null,
      folderId,
      favorite: data.favorite ?? false,
      organizationId: data.organizationId ?? null,
      collectionIds: data.collectionIds ?? null,
    });
  }

  /**
   * Create a new card cipher
   * @param data Card data
   * @returns Created CardCipher
   */
  async createCard(data: {
    name: string;
    cardholderName?: string;
    brand?: string;
    number?: string;
    expMonth?: string;
    expYear?: string;
    code?: string;
    notes?: string;
    folder?: import('../structures/FolderStructure.js').FolderStructure | string | null;
  }): Promise<CardCipher> {
    const folderId = data.folder
      ? typeof data.folder === 'string'
        ? data.folder
        : data.folder.id
      : null;

    return this.ciphers.createCard({
      name: data.name,
      cardholderName: data.cardholderName ?? null,
      brand: data.brand ?? null,
      number: data.number ?? null,
      expMonth: data.expMonth ?? null,
      expYear: data.expYear ?? null,
      code: data.code ?? null,
      notes: data.notes ?? null,
      folderId,
    });
  }

  /**
   * Create a new secure note
   * @param data Note data
   * @returns Created SecureNoteCipher
   */
  async createSecureNote(data: {
    name: string;
    content: string;
    folder?: import('../structures/FolderStructure.js').FolderStructure | string | null;
  }): Promise<SecureNoteCipher> {
    const folderId = data.folder
      ? typeof data.folder === 'string'
        ? data.folder
        : data.folder.id
      : null;

    return this.ciphers.createSecureNote({
      name: data.name,
      content: data.content,
      folderId,
    });
  }

  /**
   * Create a new identity
   * @param data Identity data
   * @returns Created IdentityCipher
   */
  async createIdentity(data: {
    name: string;
    title?: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    company?: string;
    email?: string;
    phone?: string;
    ssn?: string;
    username?: string;
    passportNumber?: string;
    licenseNumber?: string;
    notes?: string;
    folder?: import('../structures/FolderStructure.js').FolderStructure | string | null;
  }): Promise<IdentityCipher> {
    const folderId = data.folder
      ? typeof data.folder === 'string'
        ? data.folder
        : data.folder.id
      : null;

    return this.ciphers.createIdentity({
      name: data.name,
      title: data.title ?? null,
      firstName: data.firstName ?? null,
      middleName: data.middleName ?? null,
      lastName: data.lastName ?? null,
      address1: data.address1 ?? null,
      address2: data.address2 ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
      postalCode: data.postalCode ?? null,
      country: data.country ?? null,
      company: data.company ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      ssn: data.ssn ?? null,
      username: data.username ?? null,
      passportNumber: data.passportNumber ?? null,
      licenseNumber: data.licenseNumber ?? null,
      notes: data.notes ?? null,
      folderId,
    });
  }

  /**
   * Create a new folder
   * @param name Folder name
   * @returns Created Folder
   */
  async createFolder(name: string): Promise<import('../structures/FolderStructure.js').FolderStructure> {
    return this.folders.create(name);
  }

  // ============================================================================
  // Password Generation
  // ============================================================================

  /**
   * Generate a secure password
   * @param options Password generation options
   * @returns Generated password
   *
   * @example
   * ```typescript
   * // Simple password
   * const password = client.generatePassword();
   *
   * // Strong password with specific options
   * const strongPassword = client.generatePassword({
   *   length: 32,
   *   uppercase: true,
   *   lowercase: true,
   *   numbers: true,
   *   special: true,
   * });
   * ```
   */
  generatePassword(options: PasswordGenerationOptions = {}): string {
    const {
      length = 16,
      uppercase = true,
      lowercase = true,
      numbers = true,
      special = true,
    } = options;

    return generateSecurePassword(length, { uppercase, lowercase, numbers, special });
  }

  /**
   * Generate a passphrase (multiple words)
   * @param options Passphrase generation options
   * @returns Generated passphrase
   *
   * @example
   * ```typescript
   * const passphrase = client.generatePassphrase({
   *   numWords: 5,
   *   wordSeparator: '-',
   * });
   * // Returns something like: "alpha-bravo-charlie-delta-echo"
   * ```
   */
  generatePassphrase(options: PassphraseGenerationOptions = {}): string {
    const {
      numWords = 4,
      wordSeparator = '-',
      capitalize = true,
      includeNumber = true,
    } = options;

    let passphrase = generatePassphrase(numWords, wordSeparator);

    if (capitalize) {
      passphrase = passphrase
        .split(wordSeparator)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(wordSeparator);
    }

    if (includeNumber) {
      const randomNum = Math.floor(Math.random() * 100);
      passphrase += `${wordSeparator}${randomNum}`;
    }

    return passphrase;
  }

  // ============================================================================
  // Cache Access
  // ============================================================================

  /**
   * Get all cached logins
   */
  get logins(): import('../utils/Collection.js').Collection<string, LoginCipher> {
    return this.ciphers.logins;
  }

  /**
   * Get all cached cards
   */
  get cards(): import('../utils/Collection.js').Collection<string, CardCipher> {
    return this.ciphers.cards;
  }

  /**
   * Get all cached notes
   */
  get notes(): import('../utils/Collection.js').Collection<string, SecureNoteCipher> {
    return this.ciphers.notes;
  }

  /**
   * Get all cached identities
   */
  get identities(): import('../utils/Collection.js').Collection<string, IdentityCipher> {
    return this.ciphers.identities;
  }

  /**
   * Get all cached favorites
   */
  get favorites(): import('../utils/Collection.js').Collection<string, BaseCipher> {
    return this.ciphers.favorites;
  }

  /**
   * Get all cached folders
   */
  get folders_cache(): import('../cache/BaseCache.js').EntityCache<
    import('../structures/FolderStructure.js').FolderStructure
  > {
    return this.folders.cache;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Ensure client is ready (authenticated + keys)
   */
  private ensureReady(): void {
    if (!this.isReady) {
      throw new Error('Client not ready. Ensure login() completed successfully.');
    }
  }
}
