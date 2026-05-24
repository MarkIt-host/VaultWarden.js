/**
 * Cipher manager for CRUD operations on ciphers
 * @module managers
 */

import { EntityCache } from '../cache/BaseCache.js';
import { CachedManager } from './BaseManager.js';
import {
  LoginCipher,
  CardCipher,
  SecureNoteCipher,
  IdentityCipher,
} from '../structures/index.js';
import {
  CipherType,
  type APICipher,
  type LoginUri,
} from '../types/index.js';
import { decryptCipher, encryptCipherForCreate } from '../utils/encryption.js';
import type { VaultwardenClient } from '../client/VaultwardenClient.js';
import { Collection } from '../utils/Collection.js';
import { NotFoundError } from '../errors/index.js';

/** Cipher union type */
export type Cipher = LoginCipher | CardCipher | SecureNoteCipher | IdentityCipher;

/** Cipher resolvable type */
export type CipherResolvable = string | Cipher;

/**
 * Manager for cipher operations
 */
export class CipherManager extends CachedManager<string, Cipher> {
  /** Cache of all ciphers */
  public readonly cache: EntityCache<Cipher> = new EntityCache();

  constructor(client: VaultwardenClient) {
    super(client);
  }

  /**
   * Get resource name for errors
   */
  protected get resourceName(): string {
    return 'Cipher';
  }

  /**
   * Resolve a cipher from various input types
   */
  resolve(resolvable: CipherResolvable): Cipher | null {
    if (typeof resolvable === 'string') {
      return this.cache.get(resolvable) ?? null;
    }
    return resolvable;
  }

  /**
   * Resolve a cipher ID from various input types
   */
  resolveId(resolvable: CipherResolvable): string | null {
    if (typeof resolvable === 'string') return resolvable;
    return resolvable.id;
  }

  /**
   * Add a cipher to the cache
   */
  private _add(data: APICipher): Cipher {
    const key = this.client.rest.key;
    if (!key) throw new Error('No encryption key available');

    const decrypted = decryptCipher(data, key);

    let cipher: Cipher;
    switch (decrypted.type) {
      case CipherType.Login:
        cipher = new LoginCipher(this.client, decrypted);
        break;
      case CipherType.Card:
        cipher = new CardCipher(this.client, decrypted);
        break;
      case CipherType.SecureNote:
        cipher = new SecureNoteCipher(this.client, decrypted);
        break;
      case CipherType.Identity:
        cipher = new IdentityCipher(this.client, decrypted);
        break;
      default:
        throw new Error(`Unknown cipher type: ${decrypted.type}`);
    }

    this.cache.set(cipher.id, cipher);
    return cipher;
  }

  /**
   * Sync ciphers from server
   */
  async sync(): Promise<this> {
    this.ensureReady();

    const response = await this.client.rest.get('/api/sync') as { ciphers: APICipher[] };

    this.cache.clear();
    for (const cipher of response.ciphers ?? []) {
      this._add(cipher);
    }

    this.client.emit('sync');
    return this;
  }

  /**
   * Fetch a cipher by ID
   */
  override async fetch(id: string): Promise<Cipher | null> {
    const cached = this.cache.get(id);
    if (cached) return cached;

    // Sync to get all (API doesn't support fetching single cipher)
    await this.sync();
    return this.cache.get(id) ?? null;
  }

  /**
   * Fetch a cipher or throw
   */
  async fetchOrThrow(id: string): Promise<Cipher> {
    const cipher = await this.fetch(id);
    if (!cipher) {
      throw NotFoundError.cipher(id);
    }
    return cipher;
  }

  // ============================================================================
  // Create Methods
  // ============================================================================

  /**
   * Create a login cipher
   */
  async createLogin(data: {
    name: string;
    username?: string | null;
    password?: string | null;
    uri?: string | null;
    uris?: LoginUri[] | null;
    totp?: string | null;
    notes?: string | null;
    folderId?: string | null;
    favorite?: boolean;
    organizationId?: string | null;
    collectionIds?: string[] | null;
  }): Promise<LoginCipher> {
    this.ensureReady();

    const cipherData: Partial<APICipher> = {
      type: CipherType.Login,
      name: data.name,
      notes: data.notes ?? null,
      folderId: data.folderId ?? null,
      favorite: data.favorite ?? false,
      organizationId: data.organizationId ?? null,
      collectionIds: data.collectionIds ?? null,
      login: {
        username: data.username ?? null,
        password: data.password ?? null,
        uri: data.uri ?? null,
        uris: data.uris?.map((u) => ({ uri: u.uri, match: u.match })) ?? null,
        totp: data.totp ?? null,
        passwordRevisionDate: null,
        fido2Credentials: null,
        autofillOnPageLoad: null,
      },
    };

    const encrypted = encryptCipherForCreate(
      cipherData,
      this.client.rest.key!,
      this.client.rest.macKeyBuffer ?? undefined
    );

    const response = await this.client.rest.post('/api/ciphers', encrypted) as APICipher;
    const cipher = this._add(response);

    this.client.emit('cipherCreate', cipher);
    return cipher as LoginCipher;
  }

  /**
   * Create a card cipher
   */
  async createCard(data: {
    name: string;
    cardholderName?: string | null;
    brand?: string | null;
    number?: string | null;
    expMonth?: string | null;
    expYear?: string | null;
    code?: string | null;
    notes?: string | null;
    folderId?: string | null;
    favorite?: boolean;
    organizationId?: string | null;
    collectionIds?: string[] | null;
  }): Promise<CardCipher> {
    this.ensureReady();

    const cipherData: Partial<APICipher> = {
      type: CipherType.Card,
      name: data.name,
      notes: data.notes ?? null,
      folderId: data.folderId ?? null,
      favorite: data.favorite ?? false,
      organizationId: data.organizationId ?? null,
      collectionIds: data.collectionIds ?? null,
      card: {
        cardholderName: data.cardholderName ?? null,
        brand: data.brand ?? null,
        number: data.number ?? null,
        expMonth: data.expMonth ?? null,
        expYear: data.expYear ?? null,
        code: data.code ?? null,
      },
    };

    const encrypted = encryptCipherForCreate(
      cipherData,
      this.client.rest.key!,
      this.client.rest.macKeyBuffer ?? undefined
    );

    const response = await this.client.rest.post('/api/ciphers', encrypted) as APICipher;
    const cipher = this._add(response);

    this.client.emit('cipherCreate', cipher);
    return cipher as CardCipher;
  }

  /**
   * Create a secure note cipher
   */
  async createSecureNote(data: {
    name: string;
    content: string;
    folderId?: string | null;
    favorite?: boolean;
    organizationId?: string | null;
    collectionIds?: string[] | null;
  }): Promise<SecureNoteCipher> {
    this.ensureReady();

    const cipherData: Partial<APICipher> = {
      type: CipherType.SecureNote,
      name: data.name,
      notes: data.content,
      folderId: data.folderId ?? null,
      favorite: data.favorite ?? false,
      organizationId: data.organizationId ?? null,
      collectionIds: data.collectionIds ?? null,
      secureNote: { type: 0 },
    };

    const encrypted = encryptCipherForCreate(
      cipherData,
      this.client.rest.key!,
      this.client.rest.macKeyBuffer ?? undefined
    );

    const response = await this.client.rest.post('/api/ciphers', encrypted) as APICipher;
    const cipher = this._add(response);

    this.client.emit('cipherCreate', cipher);
    return cipher as SecureNoteCipher;
  }

  /**
   * Create an identity cipher
   */
  async createIdentity(data: {
    name: string;
    title?: string | null;
    firstName?: string | null;
    middleName?: string | null;
    lastName?: string | null;
    address1?: string | null;
    address2?: string | null;
    address3?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    company?: string | null;
    email?: string | null;
    phone?: string | null;
    ssn?: string | null;
    username?: string | null;
    passportNumber?: string | null;
    licenseNumber?: string | null;
    notes?: string | null;
    folderId?: string | null;
    favorite?: boolean;
    organizationId?: string | null;
    collectionIds?: string[] | null;
  }): Promise<IdentityCipher> {
    this.ensureReady();

    const cipherData: Partial<APICipher> = {
      type: CipherType.Identity,
      name: data.name,
      notes: data.notes ?? null,
      folderId: data.folderId ?? null,
      favorite: data.favorite ?? false,
      organizationId: data.organizationId ?? null,
      collectionIds: data.collectionIds ?? null,
      identity: {
        title: data.title ?? null,
        firstName: data.firstName ?? null,
        middleName: data.middleName ?? null,
        lastName: data.lastName ?? null,
        address1: data.address1 ?? null,
        address2: data.address2 ?? null,
        address3: data.address3 ?? null,
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
      },
    };

    const encrypted = encryptCipherForCreate(
      cipherData,
      this.client.rest.key!,
      this.client.rest.macKeyBuffer ?? undefined
    );

    const response = await this.client.rest.post('/api/ciphers', encrypted) as APICipher;
    const cipher = this._add(response);

    this.client.emit('cipherCreate', cipher);
    return cipher as IdentityCipher;
  }

  // ============================================================================
  // Update Methods
  // ============================================================================

  /**
   * Update a login cipher
   * @internal
   */
  async updateLogin(
    id: string,
    data: {
      name: string;
      username?: string | null;
      password?: string | null;
      uri?: string | null;
      uris?: LoginUri[] | null;
      totp?: string | null;
      notes?: string | null;
      folderId?: string | null;
      favorite?: boolean;
    }
  ): Promise<LoginCipher> {
    this.ensureReady();

    const cipherData: Partial<APICipher> = {
      type: CipherType.Login,
      name: data.name,
      notes: data.notes ?? null,
      folderId: data.folderId ?? null,
      favorite: data.favorite ?? false,
      login: {
        username: data.username ?? null,
        password: data.password ?? null,
        uri: data.uri ?? null,
        uris: data.uris?.map((u) => ({ uri: u.uri, match: u.match })) ?? null,
        totp: data.totp ?? null,
        passwordRevisionDate: null,
        fido2Credentials: null,
        autofillOnPageLoad: null,
      },
    };

    const encrypted = encryptCipherForCreate(
      cipherData,
      this.client.rest.key!,
      this.client.rest.macKeyBuffer ?? undefined
    );

    const response = await this.client.rest.put(`/api/ciphers/${id}`, encrypted) as APICipher;
    const cipher = this._add(response);

    this.client.emit('cipherUpdate', cipher);
    return cipher as LoginCipher;
  }

  /**
   * Update a card cipher
   * @internal
   */
  async updateCard(
    id: string,
    data: {
      name: string;
      cardholderName?: string | null;
      brand?: string | null;
      number?: string | null;
      expMonth?: string | null;
      expYear?: string | null;
      code?: string | null;
      notes?: string | null;
      folderId?: string | null;
    }
  ): Promise<CardCipher> {
    this.ensureReady();

    const cipherData: Partial<APICipher> = {
      type: CipherType.Card,
      name: data.name,
      notes: data.notes ?? null,
      folderId: data.folderId ?? null,
      favorite: false,
      card: {
        cardholderName: data.cardholderName ?? null,
        brand: data.brand ?? null,
        number: data.number ?? null,
        expMonth: data.expMonth ?? null,
        expYear: data.expYear ?? null,
        code: data.code ?? null,
      },
    };

    const encrypted = encryptCipherForCreate(
      cipherData,
      this.client.rest.key!,
      this.client.rest.macKeyBuffer ?? undefined
    );

    const response = await this.client.rest.put(`/api/ciphers/${id}`, encrypted) as APICipher;
    const cipher = this._add(response);

    this.client.emit('cipherUpdate', cipher);
    return cipher as CardCipher;
  }

  /**
   * Update a secure note cipher
   * @internal
   */
  async updateSecureNote(
    id: string,
    data: {
      name: string;
      content: string;
      folderId?: string | null;
    }
  ): Promise<SecureNoteCipher> {
    this.ensureReady();

    const cipherData: Partial<APICipher> = {
      type: CipherType.SecureNote,
      name: data.name,
      notes: data.content,
      folderId: data.folderId ?? null,
      favorite: false,
      secureNote: { type: 0 },
    };

    const encrypted = encryptCipherForCreate(
      cipherData,
      this.client.rest.key!,
      this.client.rest.macKeyBuffer ?? undefined
    );

    const response = await this.client.rest.put(`/api/ciphers/${id}`, encrypted) as APICipher;
    const cipher = this._add(response);

    this.client.emit('cipherUpdate', cipher);
    return cipher as SecureNoteCipher;
  }

  /**
   * Update an identity cipher
   * @internal
   */
  async updateIdentity(
    id: string,
    data: {
      name: string;
      title?: string | null;
      firstName?: string | null;
      middleName?: string | null;
      lastName?: string | null;
      address1?: string | null;
      address2?: string | null;
      address3?: string | null;
      city?: string | null;
      state?: string | null;
      postalCode?: string | null;
      country?: string | null;
      company?: string | null;
      email?: string | null;
      phone?: string | null;
      ssn?: string | null;
      username?: string | null;
      passportNumber?: string | null;
      licenseNumber?: string | null;
      notes?: string | null;
      folderId?: string | null;
    }
  ): Promise<IdentityCipher> {
    this.ensureReady();

    const cipherData: Partial<APICipher> = {
      type: CipherType.Identity,
      name: data.name,
      notes: data.notes ?? null,
      folderId: data.folderId ?? null,
      favorite: false,
      identity: {
        title: data.title ?? null,
        firstName: data.firstName ?? null,
        middleName: data.middleName ?? null,
        lastName: data.lastName ?? null,
        address1: data.address1 ?? null,
        address2: data.address2 ?? null,
        address3: data.address3 ?? null,
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
      },
    };

    const encrypted = encryptCipherForCreate(
      cipherData,
      this.client.rest.key!,
      this.client.rest.macKeyBuffer ?? undefined
    );

    const response = await this.client.rest.put(`/api/ciphers/${id}`, encrypted) as APICipher;
    const cipher = this._add(response);

    this.client.emit('cipherUpdate', cipher);
    return cipher as IdentityCipher;
  }

  // ============================================================================
  // Delete Method
  // ============================================================================

  /**
   * Delete a cipher
   */
  async delete(resolvable: CipherResolvable): Promise<void> {
    const id = this.resolveId(resolvable);
    if (!id) throw new NotFoundError('Cipher');

    await this.client.rest.delete(`/api/ciphers/${id}`);
    this.cache.delete(id);
    this.client.emit('cipherDelete', id);
  }

  // ============================================================================
  // Filtered Accessors
  // ============================================================================

  /**
   * Get all login ciphers
   */
  get logins(): Collection<string, LoginCipher> {
    return this.cache.filter((c) => c.type === CipherType.Login) as Collection<string, LoginCipher>;
  }

  /**
   * Get all card ciphers
   */
  get cards(): Collection<string, CardCipher> {
    return this.cache.filter((c) => c.type === CipherType.Card) as Collection<string, CardCipher>;
  }

  /**
   * Get all secure note ciphers
   */
  get notes(): Collection<string, SecureNoteCipher> {
    return this.cache.filter(
      (c) => c.type === CipherType.SecureNote
    ) as Collection<string, SecureNoteCipher>;
  }

  /**
   * Get all identity ciphers
   */
  get identities(): Collection<string, IdentityCipher> {
    return this.cache.filter(
      (c) => c.type === CipherType.Identity
    ) as Collection<string, IdentityCipher>;
  }

  /**
   * Get all favorite ciphers
   */
  get favorites(): Collection<string, Cipher> {
    return this.cache.filter((c) => c.favorite);
  }

  /**
   * Get all deleted (trashed) ciphers
   */
  get trash(): Collection<string, Cipher> {
    return this.cache.filter((c) => c.isDeleted);
  }

  // ============================================================================
  // Search
  // ============================================================================

  /**
   * Search ciphers by query string
   * Searches in name, notes, username (for logins), and URIs (for logins)
   */
  search(query: string): Collection<string, Cipher> {
    const lowerQuery = query.toLowerCase();
    return this.cache.filter((cipher) => {
      // Search name
      if (cipher.name.toLowerCase().includes(lowerQuery)) return true;
      // Search notes
      if (cipher.notes?.toLowerCase().includes(lowerQuery)) return true;
      // Search login-specific fields
      if (cipher instanceof LoginCipher) {
        if (cipher.username?.toLowerCase().includes(lowerQuery)) return true;
        if (cipher.domain?.toLowerCase().includes(lowerQuery)) return true;
        if (cipher.uris?.some((u) => u.uri.toLowerCase().includes(lowerQuery)))
          return true;
      }
      return false;
    });
  }

  /**
   * Find ciphers by domain
   * @param domain Domain to search for
   */
  findByDomain(domain: string): Collection<string, LoginCipher> {
    return this.cache.filter((c) => {
      if (c.type !== CipherType.Login) return false;
      const login = c as LoginCipher;
      return login.domain === domain;
    }) as Collection<string, LoginCipher>;
  }

  /**
   * Find ciphers in a specific folder
   * @param folderId Folder ID
   */
  findByFolder(folderId: string): Collection<string, Cipher> {
    return this.cache.filter((c) => c.folderId === folderId);
  }

  /**
   * Find ciphers in a specific collection
   * @param collectionId Collection ID
   */
  findByCollection(collectionId: string): Collection<string, Cipher> {
    return this.cache.filter(
      (c) => c.collectionIds?.includes(collectionId) ?? false
    );
  }
}
