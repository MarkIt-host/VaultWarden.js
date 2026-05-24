/**
 * Base structure classes for Vaultwarden entities
 * @module structures
 */

import type { VaultwardenClient } from '../client/VaultwardenClient.js';
import { Collection } from '../utils/Collection.js';

/**
 * Base class for all structures
 * Provides common functionality for all entities
 */
export abstract class BaseStructure {
  /** Reference to the client */
  public readonly client: VaultwardenClient;

  constructor(client: VaultwardenClient) {
    this.client = client;
  }

  /**
   * Convert to JSON representation
   * Subclasses should override this
   */
  abstract toJSON(): Record<string, unknown>;

  /**
   * String representation
   */
  abstract toString(): string;

  /**
   * Value of primitive coercion
   */
  abstract valueOf(): unknown;
}

/**
 * Base class for entities with IDs
 */
export abstract class BaseIdentifiable extends BaseStructure {
  /** Unique identifier */
  public abstract readonly id: string;

  /**
   * Check equality with another structure
   */
  equals(other: unknown): boolean {
    if (other === this) return true;
    if (!(other instanceof BaseIdentifiable)) return false;
    return other.id === this.id;
  }

  /**
   * Get the hash code for this structure
   */
  hashCode(): number {
    let hash = 0;
    for (let i = 0; i < this.id.length; i++) {
      const char = this.id.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }
}

/**
 * Base class for entities that can be updated
 */
export abstract class BaseUpdatable<T extends BaseIdentifiable> extends BaseIdentifiable {
  /** Timestamp of last update */
  public abstract readonly updatedAt: Date;

  /**
   * Update this entity with new data
   * @param data Partial data to update
   */
  abstract update(data: Partial<unknown>): Promise<T>;

  /**
   * Delete this entity
   */
  abstract delete(): Promise<void>;

  /**
   * Check if this entity has been modified since a given date
   * @param date Date to compare against
   */
  isModifiedSince(date: Date): boolean {
    return this.updatedAt > date;
  }
}

/**
 * Base cipher structure with common cipher properties
 */
export abstract class BaseCipher extends BaseUpdatable<BaseCipher> {
  /** Cipher ID */
  public readonly id: string;

  /** Folder ID this cipher belongs to */
  public folderId: string | null;

  /** Organization ID this cipher belongs to */
  public organizationId: string | null;

  /** Name of the cipher */
  public name: string;

  /** Notes for the cipher */
  public notes: string | null;

  /** Whether this cipher is a favorite */
  public favorite: boolean;

  /** Collection IDs this cipher belongs to */
  public collectionIds: string[] | null;

  /** When this cipher was deleted (soft delete) */
  public deletedAt: Date | null;

  /** When this cipher was last revised */
  public readonly revisionDate: Date;

  /** When this cipher was created */
  public readonly createdAt: Date;

  constructor(
    client: VaultwardenClient,
    data: {
      id: string;
      folderId: string | null;
      organizationId: string | null;
      name: string;
      notes: string | null;
      favorite: boolean;
      collectionIds: string[] | null;
      deletedDate: string | null;
      revisionDate: string;
      creationDate: string;
    }
  ) {
    super(client);
    this.id = data.id;
    this.folderId = data.folderId;
    this.organizationId = data.organizationId;
    this.name = data.name || 'Untitled';
    this.notes = data.notes;
    this.favorite = data.favorite ?? false;
    this.collectionIds = data.collectionIds;
    this.deletedAt = data.deletedDate ? new Date(data.deletedDate) : null;
    this.revisionDate = new Date(data.revisionDate);
    this.createdAt = new Date(data.creationDate);
  }

  /**
   * Get the folder this cipher belongs to
   */
  get folder() {
    return this.folderId
      ? this.client.folders.cache.get(this.folderId) ?? null
      : null;
  }

  /**
   * Get the organization this cipher belongs to
   */
  get organization() {
    return this.organizationId
      ? this.client.organizations.cache.get(this.organizationId) ?? null
      : null;
  }

  /**
   * Check if this cipher is in the trash
   */
  get isDeleted(): boolean {
    return this.deletedAt !== null;
  }

  /**
   * Set favorite status
   * @param favorite Whether this should be a favorite
   */
  async setFavorite(favorite: boolean): Promise<void> {
    await this.client.rest.post(`/api/ciphers/${this.id}/favorite`, {
      favorite,
    });
    this.favorite = favorite;
  }

  /**
   * Move this cipher to a folder
   * @param folderId Folder ID or null for no folder
   */
  async moveToFolder(folderId: string | null): Promise<void> {
    await this.client.rest.put(`/api/ciphers/${this.id}`, {
      folderId,
    });
    this.folderId = folderId;
  }

  /**
   * Restore this cipher from trash
   */
  async restore(): Promise<void> {
    if (!this.isDeleted) return;
    await this.client.rest.put(`/api/ciphers/${this.id}/restore`, {});
    this.deletedAt = null;
  }

  /**
   * Permanently delete this cipher
   */
  async delete(): Promise<void> {
    await this.client.rest.delete(`/api/ciphers/${this.id}`);
    this.client.ciphers.cache.delete(this.id);
    this.client.emit('cipherDelete', this.id);
  }

  /**
   * Soft delete this cipher (move to trash)
   */
  async softDelete(): Promise<void> {
    await this.client.rest.put(`/api/ciphers/${this.id}/delete`, {});
    this.deletedAt = new Date();
  }

  /**
   * Get collections this cipher belongs to
   */
  get collections(): Collection<string, import('./CollectionStructure.js').CollectionStructure> {
    const collections = new Collection<string, import('./CollectionStructure.js').CollectionStructure>();
    if (this.collectionIds) {
      for (const id of this.collectionIds) {
        const collection = this.client.collections.cache.get(id);
        if (collection) collections.set(id, collection);
      }
    }
    return collections;
  }

  /**
   * Get last update timestamp
   */
  get updatedAt(): Date {
    return this.revisionDate;
  }

  /**
   * Convert to JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
      notes: this.notes,
      favorite: this.favorite,
      folderId: this.folderId,
      organizationId: this.organizationId,
      collectionIds: this.collectionIds,
      deletedAt: this.deletedAt?.toISOString() ?? null,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.revisionDate.toISOString(),
    };
  }

  /**
   * String representation
   */
  toString(): string {
    return this.name;
  }

  /**
   * Primitive value
   */
  valueOf(): string {
    return this.id;
  }
}
