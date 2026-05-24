/**
 * Collection manager for organization collections
 * @module managers
 */

import { EntityCache } from '../cache/BaseCache.js';
import { CRUDManager } from './BaseManager.js';
import { CollectionStructure } from '../structures/CollectionStructure.js';
import { encryptString } from '../utils/encryption.js';
import type { VaultwardenClient } from '../client/VaultwardenClient.js';
import type { APICollection } from '../types/index.js';
import { NotFoundError } from '../errors/index.js';

/** Collection resolvable type */
export type CollectionResolvable = string | CollectionStructure;

/** Collection creation data */
export interface CollectionCreateData {
  name: string;
  organizationId: string;
  externalId?: string | null;
}

/**
 * Manager for collection operations
 */
export class CollectionManager extends CRUDManager<string, CollectionStructure> {
  /** Cache of all collections */
  public readonly cache: EntityCache<CollectionStructure> = new EntityCache();

  constructor(client: VaultwardenClient) {
    super(client);
  }

  /**
   * Get resource name for errors
   */
  protected get resourceName(): string {
    return 'Collection';
  }

  /**
   * Resolve a collection from various input types
   */
  resolve(resolvable: CollectionResolvable): CollectionStructure | null {
    if (typeof resolvable === 'string') {
      return this.cache.get(resolvable) ?? null;
    }
    return resolvable;
  }

  /**
   * Resolve a collection ID from various input types
   */
  resolveId(resolvable: CollectionResolvable): string | null {
    if (typeof resolvable === 'string') return resolvable;
    return resolvable.id;
  }

  /**
   * Add a collection to cache
   */
  private _add(data: APICollection): CollectionStructure {
    const collection = new CollectionStructure(this.client, data);
    this.cache.set(collection.id, collection);
    return collection;
  }

  /**
   * Sync collections from server
   */
  async sync(): Promise<this> {
    this.ensureReady();

    const response = await this.client.rest.get('/api/sync') as { collections: APICollection[] };

    this.cache.clear();
    for (const collection of response.collections ?? []) {
      this._add(collection);
    }

    return this;
  }

  /**
   * Fetch a collection by ID
   */
  override async fetch(id: string): Promise<CollectionStructure | null> {
    const cached = this.cache.get(id);
    if (cached) return cached;

    await this.sync();
    return this.cache.get(id) ?? null;
  }

  /**
   * Create a new collection
   */
  async create(data: CollectionCreateData): Promise<CollectionStructure> {
    this.ensureReady();

    const key = this.client.rest.key;
    if (!key) throw new Error('No encryption key available');

    const encryptedName = encryptString(
      data.name,
      key,
      this.client.rest.macKeyBuffer ?? undefined
    );

    const response = await this.client.rest.post(
      `/api/organizations/${data.organizationId}/collections`,
      {
        name: encryptedName,
        externalId: data.externalId ?? null,
      }
    ) as APICollection;

    const collection = this._add(response);
    return collection;
  }

  /**
   * Update a collection
   */
  async update(
    id: string,
    data: { name?: string; externalId?: string | null }
  ): Promise<CollectionStructure> {
    this.ensureReady();

    const existing = this.cache.get(id);
    if (!existing) {
      throw NotFoundError.collection(id);
    }

    const payload: Record<string, unknown> = {
      externalId: data.externalId ?? existing.externalId,
    };

    if (data.name !== undefined) {
      payload.name = encryptString(
        data.name,
        this.client.rest.key!,
        this.client.rest.macKeyBuffer ?? undefined
      );
    }

    const response = await this.client.rest.put(
      `/api/organizations/${existing.organizationId}/collections/${id}`,
      payload
    ) as APICollection;

    const collection = this._add(response);
    return collection;
  }

  /**
   * Delete a collection
   */
  async delete(id: string): Promise<void> {
    const collection = this.cache.get(id);
    if (!collection) {
      throw NotFoundError.collection(id);
    }

    await this.client.rest.delete(
      `/api/organizations/${collection.organizationId}/collections/${id}`
    );

    this.cache.delete(id);
  }

  /**
   * Get collections for a specific organization
   */
  forOrganization(
    orgId: string
  ): import('../utils/Collection.js').Collection<string, CollectionStructure> {
    return this.cache.filter((c) => c.organizationId === orgId);
  }

  /**
   * Find collections by name
   */
  findByName(name: string): CollectionStructure | undefined {
    const lowerName = name.toLowerCase();
    return this.cache.find((c) => c.name.toLowerCase() === lowerName);
  }

  /**
   * Get writable collections (not read-only)
   */
  get writable(): import('../utils/Collection.js').Collection<string, CollectionStructure> {
    return this.cache.filter((c) => !c.readOnly);
  }

  /**
   * Get read-only collections
   */
  get readOnly(): import('../utils/Collection.js').Collection<string, CollectionStructure> {
    return this.cache.filter((c) => c.readOnly);
  }

  /**
   * Get total ciphers across all collections
   */
  get totalCiphers(): number {
    return this.cache.reduce((sum, c) => sum + c.size, 0);
  }
}
