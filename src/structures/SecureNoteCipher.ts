/**
 * Secure note cipher structure
 * @module structures
 */

import type { VaultwardenClient } from '../client/VaultwardenClient.js';
import { BaseCipher } from './BaseStructure.js';
import { CipherType } from '../types/index.js';
import type { APICipher } from '../types/index.js';

/**
 * Secure note cipher for storing encrypted text notes
 */
export class SecureNoteCipher extends BaseCipher {
  /** Cipher type identifier */
  public readonly type = CipherType.SecureNote;

  /** Note content (from notes field) */
  public content: string;

  constructor(client: VaultwardenClient, data: APICipher) {
    super(client, {
      id: data.id,
      folderId: data.folderId,
      organizationId: data.organizationId,
      name: data.name,
      notes: data.notes,
      favorite: data.favorite,
      collectionIds: data.collectionIds,
      deletedDate: data.deletedDate,
      revisionDate: data.revisionDate,
      creationDate: data.creationDate,
    });

    this.content = data.notes ?? '';
  }

  /**
   * Get preview of content (first 100 chars)
   */
  get preview(): string {
    if (this.content.length <= 100) return this.content;
    return this.content.slice(0, 100) + '...';
  }

  /**
   * Get number of lines in content
   */
  get lineCount(): number {
    return this.content.split('\n').length;
  }

  /**
   * Get character count
   */
  get charCount(): number {
    return this.content.length;
  }

  /**
   * Get word count
   */
  get wordCount(): number {
    return this.content.trim().split(/\s+/).filter((w) => w.length > 0).length;
  }

  /**
   * Check if content is empty
   */
  get isEmpty(): boolean {
    return this.content.trim().length === 0;
  }

  /**
   * Update this secure note
   * @param data Update data
   */
  async update(data: {
    name?: string;
    content?: string;
    folderId?: string | null;
  }): Promise<SecureNoteCipher> {
    const updated = await this.client.ciphers.updateSecureNote(this.id, {
      name: data.name ?? this.name,
      content: data.content ?? this.content,
      folderId: data.folderId !== undefined ? data.folderId : this.folderId,
    });
    return updated;
  }

  /**
   * Append text to the note
   * @param text Text to append
   */
  async append(text: string): Promise<void> {
    await this.update({ content: this.content + '\n' + text });
  }

  /**
   * Prepend text to the note
   * @param text Text to prepend
   */
  async prepend(text: string): Promise<void> {
    await this.update({ content: text + '\n' + this.content });
  }

  /**
   * Clear the note content
   */
  async clear(): Promise<void> {
    await this.update({ content: '' });
  }

  /**
   * Search within content
   * @param query Search query
   */
  includes(query: string): boolean {
    return this.content.toLowerCase().includes(query.toLowerCase());
  }

  /**
   * Convert to JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      type: this.type,
      preview: this.preview,
      lineCount: this.lineCount,
      wordCount: this.wordCount,
      charCount: this.charCount,
    };
  }
}
