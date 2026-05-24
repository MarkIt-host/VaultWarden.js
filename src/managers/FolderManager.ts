/**
 * Folder manager for CRUD operations on folders
 * @module managers
 */

import { EntityCache } from '../cache/BaseCache.js';
import { CRUDManager } from './BaseManager.js';
import { FolderStructure } from '../structures/FolderStructure.js';
import { encryptString, decryptString } from '../utils/encryption.js';
import type { VaultwardenClient } from '../client/VaultwardenClient.js';
import type { APIFolder } from '../types/index.js';

/** Folder resolvable type */
export type FolderResolvable = string | FolderStructure;

/**
 * Manager for folder operations
 */
export class FolderManager extends CRUDManager<string, FolderStructure> {
  /** Cache of all folders */
  public readonly cache: EntityCache<FolderStructure> = new EntityCache();

  constructor(client: VaultwardenClient) {
    super(client);
  }

  /**
   * Get resource name for errors
   */
  protected get resourceName(): string {
    return 'Folder';
  }

  /**
   * Resolve a folder from various input types
   */
  resolve(resolvable: FolderResolvable): FolderStructure | null {
    if (typeof resolvable === 'string') {
      return this.cache.get(resolvable) ?? null;
    }
    return resolvable;
  }

  /**
   * Resolve a folder ID from various input types
   */
  resolveId(resolvable: FolderResolvable): string | null {
    if (typeof resolvable === 'string') return resolvable;
    return resolvable.id;
  }

  /**
   * Add a folder to cache
   */
  private _add(data: APIFolder): FolderStructure {
    const key = this.client.rest.key;
    const decryptedName = key ? decryptString(data.name, key) ?? data.name : data.name;

    const folder = new FolderStructure(this.client, {
      ...data,
      name: decryptedName,
    });
    this.cache.set(folder.id, folder);
    return folder;
  }

  /**
   * Sync folders from server
   */
  async sync(): Promise<this> {
    this.ensureReady();

    const response = await this.client.rest.get('/api/sync') as { folders: APIFolder[] };

    this.cache.clear();
    for (const folder of response.folders ?? []) {
      this._add(folder);
    }

    return this;
  }

  /**
   * Fetch a folder by ID
   */
  override async fetch(id: string): Promise<FolderStructure | null> {
    const cached = this.cache.get(id);
    if (cached) return cached;

    await this.sync();
    return this.cache.get(id) ?? null;
  }

  /**
   * Create a new folder
   */
  async create(name: string): Promise<FolderStructure> {
    this.ensureReady();

    const encryptedName = encryptString(
      name,
      this.client.rest.key!,
      this.client.rest.macKeyBuffer ?? undefined
    );

    const response = await this.client.rest.post('/api/folders', {
      name: encryptedName,
    }) as APIFolder;

    // Server returns encrypted name, decrypt it
    const decryptedName = decryptString(response.name, this.client.rest.key!) ?? response.name;
    const folder = this._add({ ...response, name: decryptedName });

    this.client.emit('folderCreate', folder);
    return folder;
  }

  /**
   * Update a folder name
   */
  async update(id: string, name: string): Promise<FolderStructure> {
    this.ensureReady();

    const encryptedName = encryptString(
      name,
      this.client.rest.key!,
      this.client.rest.macKeyBuffer ?? undefined
    );

    const response = await this.client.rest.put(`/api/folders/${id}`, {
      name: encryptedName,
    }) as APIFolder;

    const decryptedName = decryptString(response.name, this.client.rest.key!) ?? response.name;
    const folder = this._add({ ...response, name: decryptedName });

    this.client.emit('folderUpdate', folder);
    return folder;
  }

  /**
   * Delete a folder
   */
  async delete(id: string): Promise<void> {
    await this.client.rest.delete(`/api/folders/${id}`);
    this.cache.delete(id);
    this.client.emit('folderDelete', id);
  }

  /**
   * Get the default folder (no folder/null)
   */
  get defaultFolder(): { id: null; name: 'No Folder'; ciphers: import('../structures/FolderStructure.js').FolderStructure['ciphers'] } {
    return {
      id: null,
      name: 'No Folder',
      ciphers: this.client.ciphers.cache.filter((c) => c.folderId === null),
    };
  }

  /**
   * Get total number of ciphers across all folders
   */
  get totalCiphers(): number {
    return this.cache.reduce((sum, folder) => sum + folder.size, 0);
  }

  /**
   * Find folder by name (exact match, case-insensitive)
   */
  findByName(name: string): FolderStructure | undefined {
    const lowerName = name.toLowerCase();
    return this.cache.find((f) => f.name.toLowerCase() === lowerName);
  }

  /**
   * Get folders sorted by name
   */
  get sorted(): import('../utils/Collection.js').Collection<string, FolderStructure> {
    return this.cache.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get folders sorted by cipher count (descending)
   */
  get sortedBySize(): import('../utils/Collection.js').Collection<string, FolderStructure> {
    return this.cache.sort((a, b) => b.size - a.size);
  }
}
