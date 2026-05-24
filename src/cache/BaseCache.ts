/**
 * Base cache implementation for storing entities
 * @module cache
 */

import { Collection } from '../utils/Collection.js';

/** Cache change event type */
export interface CacheChangeEvent<K, V> {
  type: 'add' | 'update' | 'delete' | 'clear';
  key?: K;
  value?: V;
  previousValue?: V | undefined;
}

/** Cache options */
export interface CacheOptions<K, V> {
  /** Maximum cache size (0 = unlimited) */
  maxSize?: number;
  /** TTL in milliseconds (0 = no expiration) */
  ttl?: number;
  /** Callback when cache changes */
  onChange?: (event: CacheChangeEvent<K, V>) => void;
}

/** Cache entry with metadata */
interface CacheEntry<V> {
  value: V;
  addedAt: number;
  accessedAt: number;
  accessCount: number;
}

/**
 * Base cache class with TTL and size management
 */
export class BaseCache<K, V> extends Collection<K, V> {
  /** Cache options */
  protected readonly options: Required<Pick<CacheOptions<K, V>, 'maxSize' | 'ttl'>> &
    Pick<CacheOptions<K, V>, 'onChange'> & { onChange?: (event: CacheChangeEvent<K, V>) => void };

  /** Entry metadata for TTL tracking */
  private metadata = new Map<K, CacheEntry<V>>();

  /** Cleanup interval ID */
  private cleanupInterval?: ReturnType<typeof setInterval>;

  constructor(options: CacheOptions<K, V> = {}) {
    super();
    const opts: { maxSize: number; ttl: number; onChange?: (event: CacheChangeEvent<K, V>) => void } = {
      maxSize: options.maxSize ?? 0,
      ttl: options.ttl ?? 0,
    };
    if (options.onChange !== undefined) {
      opts.onChange = options.onChange;
    }
    this.options = opts;

    // Start cleanup interval if TTL is set
    if (this.options.ttl > 0) {
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, Math.min(this.options.ttl / 2, 60000));
    }
  }

  /**
   * Set a value in the cache
   */
  override set(key: K, value: V): this {
    const previousValue = this.get(key);
    const isUpdate = previousValue !== undefined;

    // Handle max size
    if (this.options.maxSize > 0 && this.size >= this.options.maxSize && !this.has(key)) {
      this.evictLRU();
    }

    // Store value and metadata
    super.set(key, value);
    this.metadata.set(key, {
      value,
      addedAt: Date.now(),
      accessedAt: Date.now(),
      accessCount: 1,
    });

    // Emit change event
    this.options.onChange?.({
      type: isUpdate ? 'update' : 'add',
      key,
      value,
      previousValue,
    });

    return this;
  }

  /**
   * Get a value from the cache
   */
  override get(key: K): V | undefined {
    // Check TTL
    if (this.isExpired(key)) {
      this.internalDelete(key);
      return undefined;
    }

    const value = super.get(key);
    if (value !== undefined) {
      // Update access metadata
      const meta = this.metadata.get(key);
      if (meta) {
        meta.accessedAt = Date.now();
        meta.accessCount++;
      }
    }

    return value;
  }

  /**
   * Check if key exists and is not expired
   */
  override has(key: K): boolean {
    if (this.isExpired(key)) {
      this.internalDelete(key);
      return false;
    }
    return super.has(key);
  }

  /**
   * Delete a value from the cache
   */
  override delete(key: K): boolean {
    const hadKey = this.has(key);
    const previousValue = this.get(key);

    if (hadKey) {
      this.internalDelete(key);
      this.options.onChange?.({
        type: 'delete',
        key,
        previousValue,
      });
    }

    return hadKey;
  }

  /**
   * Clear the entire cache
   */
  override clear(): void {
    super.clear();
    this.metadata.clear();
    this.options.onChange?.({ type: 'clear' });
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    ttl: number;
    hitRate: number;
    avgAccessCount: number;
  } {
    let totalAccessCount = 0;
    for (const meta of this.metadata.values()) {
      totalAccessCount += meta.accessCount;
    }

    return {
      size: this.size,
      maxSize: this.options.maxSize,
      ttl: this.options.ttl,
      hitRate: this.size > 0 ? totalAccessCount / this.size : 0,
      avgAccessCount: this.size > 0 ? totalAccessCount / this.size : 0,
    };
  }

  /**
   * Get keys sorted by last access time (LRU order)
   */
  getLRUKeys(): K[] {
    const entries = Array.from(this.metadata.entries());
    entries.sort((a, b) => a[1].accessedAt - b[1].accessedAt);
    return entries.map(([key]) => key);
  }

  /**
   * Get keys sorted by access count (LFU order)
   */
  getLFUKeys(): K[] {
    const entries = Array.from(this.metadata.entries());
    entries.sort((a, b) => a[1].accessCount - b[1].accessCount);
    return entries.map(([key]) => key);
  }

  /**
   * Destroy the cache and cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }

  /**
   * Check if a key has expired
   */
  private isExpired(key: K): boolean {
    if (this.options.ttl <= 0) return false;

    const meta = this.metadata.get(key);
    if (!meta) return true;

    return Date.now() - meta.addedAt > this.options.ttl;
  }

  /**
   * Internal delete without emitting events
   */
  private internalDelete(key: K): void {
    super.delete(key);
    this.metadata.delete(key);
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    const lruKey = this.getLRUKeys()[0];
    if (lruKey !== undefined) {
      this.delete(lruKey);
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const expired: K[] = [];

    for (const [key, meta] of this.metadata) {
      if (now - meta.addedAt > this.options.ttl) {
        expired.push(key);
      }
    }

    for (const key of expired) {
      this.delete(key);
    }
  }
}

/**
 * Typed cache for specific entity types
 */
export class EntityCache<T extends { id: string }> extends BaseCache<string, T> {
  /**
   * Find entities by predicate
   */
  find(predicate: (value: T, key: string, collection: this) => boolean): T | undefined {
    for (const [key, value] of this) {
      if (predicate(value, key, this)) return value;
    }
    return undefined;
  }

  /**
   * Filter entities by predicate
   */
  filter(predicate: (value: T, key: string, collection: this) => boolean): Collection<string, T> {
    const results = new Collection<string, T>();
    for (const [id, entity] of this) {
      if (predicate(entity, id, this)) results.set(id, entity);
    }
    return results;
  }

  /**
   * Update an entity in place
   */
  update(id: string, updates: Partial<Omit<T, 'id'>>): T | undefined {
    const existing = this.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates };
    this.set(id, updated as T);
    return updated as T;
  }

  /**
   * Get first entity
   */
  first(): T | undefined {
    return this.values().next().value;
  }

  /**
   * Get random entity
   */
  random(): T | undefined {
    const values = Array.from(this.values());
    return values[Math.floor(Math.random() * values.length)];
  }
}
