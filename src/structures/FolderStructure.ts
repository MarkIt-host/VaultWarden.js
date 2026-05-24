/**
 * Folder structure for organizing ciphers
 * @module structures
 */

import type { VaultwardenClient } from '../client/VaultwardenClient.js';
import { BaseIdentifiable } from './BaseStructure.js';
import { Collection } from '../utils/Collection.js';
import { CipherType } from '../types/index.js';
import type { APIFolder } from '../types/index.js';
import type { BaseCipher } from './BaseStructure.js';

/**
 * Folder for organizing ciphers
 */
export class FolderStructure extends BaseIdentifiable {
  /** Folder ID */
  public readonly id: string;

  /** Folder name */
  public name: string;

  constructor(client: VaultwardenClient, data: APIFolder) {
    super(client);
    this.id = data.id;
    this.name = data.name || 'Untitled';
  }

  /**
   * Get ciphers in this folder
   */
  get ciphers(): Collection<string, BaseCipher> {
    return this.client.ciphers.cache.filter(
      (c) => c.folderId === this.id && !c.isDeleted
    );
  }

  /**
   * Get login ciphers in this folder
   */
  get logins(): Collection<string, import('./LoginCipher.js').LoginCipher> {
    return this.client.ciphers.cache.filter(
      (c) => c.folderId === this.id && c.type === CipherType.Login
    ) as Collection<string, import('./LoginCipher.js').LoginCipher>;
  }

  /**
   * Get card ciphers in this folder
   */
  get cards(): Collection<string, import('./CardCipher.js').CardCipher> {
    return this.client.ciphers.cache.filter(
      (c) => c.folderId === this.id && c.type === CipherType.Card
    ) as Collection<string, import('./CardCipher.js').CardCipher>;
  }

  /**
   * Get secure note ciphers in this folder
   */
  get notes(): Collection<string, import('./SecureNoteCipher.js').SecureNoteCipher> {
    return this.client.ciphers.cache.filter(
      (c) => c.folderId === this.id && c.type === CipherType.SecureNote
    ) as Collection<string, import('./SecureNoteCipher.js').SecureNoteCipher>;
  }

  /**
   * Get identity ciphers in this folder
   */
  get identities(): Collection<string, import('./IdentityCipher.js').IdentityCipher> {
    return this.client.ciphers.cache.filter(
      (c) => c.folderId === this.id && c.type === CipherType.Identity
    ) as Collection<string, import('./IdentityCipher.js').IdentityCipher>;
  }

  /**
   * Get number of ciphers in this folder
   */
  get size(): number {
    return this.ciphers.size;
  }

  /**
   * Check if folder is empty
   */
  get isEmpty(): boolean {
    return this.size === 0;
  }

  /**
   * Get favorite ciphers in this folder
   */
  get favorites(): Collection<string, BaseCipher> {
    return this.ciphers.filter((c) => c.favorite);
  }

  /**
   * Rename this folder
   * @param newName New name for the folder
   */
  async rename(newName: string): Promise<FolderStructure> {
    return this.client.folders.update(this.id, newName);
  }

  /**
   * Delete this folder
   * Ciphers will be moved to no folder
   */
  async delete(): Promise<void> {
    await this.client.folders.delete(this.id);
  }

  /**
   * Update this folder
   * @param data Update data
   */
  async update(data: { name?: string }): Promise<FolderStructure> {
    if (data.name !== undefined) {
      return this.rename(data.name);
    }
    return this;
  }

  /**
   * Search ciphers in this folder
   * @param query Search query
   */
  search(query: string): Collection<string, BaseCipher> {
    const lowerQuery = query.toLowerCase();
    return this.ciphers.filter(
      (c) =>
        c.name.toLowerCase().includes(lowerQuery) ||
        (c.notes?.toLowerCase().includes(lowerQuery) ?? false)
    );
  }

  /**
   * Convert to JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      name: this.name,
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
