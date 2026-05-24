/**
 * Collection structure for organization collections
 * @module structures
 */

import type { VaultwardenClient } from '../client/VaultwardenClient.js';
import { BaseIdentifiable } from './BaseStructure.js';
import { Collection } from '../utils/Collection.js';
import type { APICollection } from '../types/index.js';
import type { BaseCipher } from './BaseStructure.js';

/**
 * Collection represents a group of ciphers within an organization
 */
export class CollectionStructure extends BaseIdentifiable {
  /** Collection ID */
  public readonly id: string;

  /** Organization ID this collection belongs to */
  public readonly organizationId: string;

  /** Collection name */
  public name: string;

  /** External ID (for syncing with external systems) */
  public externalId: string | null;

  /** Whether collection is read-only for current user */
  public readOnly: boolean;

  constructor(client: VaultwardenClient, data: APICollection) {
    super(client);
    this.id = data.id;
    this.organizationId = data.organizationId;
    this.name = data.name || 'Untitled';
    this.externalId = data.externalId ?? null;
    this.readOnly = data.readOnly ?? false;
  }

  /**
   * Get the organization this collection belongs to
   */
  get organization() {
    return this.client.organizations.cache.get(this.organizationId) ?? null;
  }

  /**
   * Get ciphers in this collection
   */
  get ciphers(): Collection<string, BaseCipher> {
    return this.client.ciphers.cache.filter(
      (c) => (c.collectionIds?.includes(this.id) ?? false) && !c.isDeleted
    );
  }

  /**
   * Get number of ciphers in this collection
   */
  get size(): number {
    return this.ciphers.size;
  }

  /**
   * Check if collection is empty
   */
  get isEmpty(): boolean {
    return this.size === 0;
  }

  /**
   * Update this collection
   * @param data Update data
   */
  async update(data: { name?: string; externalId?: string | null }): Promise<CollectionStructure> {
    return this.client.collections.update(this.id, data);
  }

  /**
   * Delete this collection
   */
  async delete(): Promise<void> {
    await this.client.collections.delete(this.id);
  }

  /**
   * Rename this collection
   * @param newName New name
   */
  async rename(newName: string): Promise<CollectionStructure> {
    return this.update({ name: newName });
  }

  /**
   * Check if current user can write to this collection
   */
  get canWrite(): boolean {
    return !this.readOnly;
  }

  /**
   * Add a cipher to this collection
   * @param cipherId Cipher ID to add
   */
  async addCipher(cipherId: string): Promise<void> {
    const cipher = this.client.ciphers.cache.get(cipherId);
    if (!cipher) return;

    const collectionIds = cipher.collectionIds ? [...cipher.collectionIds] : [];
    if (!collectionIds.includes(this.id)) {
      collectionIds.push(this.id);
      await cipher.update({ collectionIds } as Record<string, unknown>);
    }
  }

  /**
   * Remove a cipher from this collection
   * @param cipherId Cipher ID to remove
   */
  async removeCipher(cipherId: string): Promise<void> {
    const cipher = this.client.ciphers.cache.get(cipherId);
    if (!cipher || !cipher.collectionIds) return;

    const collectionIds = cipher.collectionIds.filter((id) => id !== this.id);
    await cipher.update({ collectionIds } as Record<string, unknown>);
  }

  /**
   * Convert to JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      organizationId: this.organizationId,
      name: this.name,
      externalId: this.externalId,
      readOnly: this.readOnly,
      size: this.size,
      isEmpty: this.isEmpty,
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
