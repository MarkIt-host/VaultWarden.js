/**
 * Base manager classes
 * @module managers
 */

import type { VaultwardenClient } from '../client/VaultwardenClient.js';
import type { EntityCache } from '../cache/BaseCache.js';
import { NotFoundError, ValidationError } from '../errors/index.js';

/**
 * Base class for all managers
 */
export abstract class BaseManager {
  /** Reference to the client */
  public readonly client: VaultwardenClient;

  constructor(client: VaultwardenClient) {
    this.client = client;
  }

  /**
   * Log a debug message
   */
  protected log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    if (!this.client.options.debug && level === 'debug') return;
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${this.constructor.name}] [${level.toUpperCase()}] ${message}`);
  }

  /**
   * Ensure the client is authenticated
   */
  protected ensureAuthenticated(): void {
    if (!this.client.rest.isAuthenticated) {
      throw new Error('Not authenticated');
    }
  }

  /**
   * Ensure the client is ready (authenticated + keys)
   */
  protected ensureReady(): void {
    if (!this.client.rest.isReady) {
      throw new Error('Client not ready');
    }
  }
}

/**
 * Base class for cached resource managers
 */
export abstract class CachedManager<K extends string, V extends { id: K }> extends BaseManager {
  /** Cache for this manager */
  public abstract readonly cache: EntityCache<V>;

  /**
   * Resolve an ID from various input types
   */
  abstract resolveId(resolvable: unknown): K | null;

  /**
   * Resolve an entity from various input types
   */
  abstract resolve(resolvable: unknown): V | null;

  /**
   * Fetch all resources and update cache
   */
  abstract sync(): Promise<this>;

  /**
   * Fetch a specific resource by ID
   */
  async fetch(id: K): Promise<V | null> {
    const cached = this.cache.get(id as string);
    if (cached) return cached;

    await this.sync();
    return this.cache.get(id as string) ?? null;
  }

  /**
   * Get a cached value or throw NotFoundError
   */
  async fetchOrThrow(id: K): Promise<V> {
    const value = await this.fetch(id);
    if (!value) {
      throw new NotFoundError(this.resourceName, String(id));
    }
    return value;
  }

  /**
   * Get resource name for error messages
   */
  protected abstract get resourceName(): string;
}

/**
 * Base class for managers that handle CRUD operations
 */
export abstract class CRUDManager<K extends string, V extends { id: K; name: string }> extends CachedManager<K, V> {
  /**
   * Create a new resource
   */
  abstract create(data: unknown): Promise<V>;

  /**
   * Update an existing resource
   */
  abstract update(id: K, data: unknown): Promise<V>;

  /**
   * Delete a resource
   */
  abstract delete(id: K): Promise<void>;

  /**
   * Find by name (case-insensitive)
   */
  findByName(name: string): V | undefined {
    const lowerName = name.toLowerCase();
    return this.cache.find((v) => v.name.toLowerCase() === lowerName);
  }

  /**
   * Search by name (partial match)
   */
  searchByName(query: string): V[] {
    const lowerQuery = query.toLowerCase();
    return this.cache.filter((v) =>
      v.name.toLowerCase().includes(lowerQuery)
    ).toArray().map(([, v]) => v);
  }
}

/**
 * Resolvable type helper
 */
export type Resolvable<T, K extends keyof T> = T | T[K];

/**
 * Resolve ID from various input types
 */
export function resolveId<T extends { id: string }>(resolvable: Resolvable<T, 'id'>): string {
  if (typeof resolvable === 'string') return resolvable;
  if (resolvable && typeof resolvable === 'object' && 'id' in resolvable) {
    return resolvable.id;
  }
  throw new ValidationError('Invalid resolvable type');
}

/**
 * Resolve entity from various input types
 */
export function resolveEntity<T extends { id: string }>(
  resolvable: Resolvable<T, 'id'>,
  cache: Map<string, T>
): T | null {
  if (typeof resolvable === 'string') {
    return cache.get(resolvable) ?? null;
  }
  if (resolvable && typeof resolvable === 'object') {
    return resolvable as T;
  }
  return null;
}
