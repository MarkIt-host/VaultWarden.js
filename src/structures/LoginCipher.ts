/**
 * Login cipher structure
 * @module structures
 */

import type { VaultwardenClient } from '../client/VaultwardenClient.js';
import { BaseCipher } from './BaseStructure.js';
import { CipherType } from '../types/index.js';
import type {
  APICipher,
  APILoginData,
  LoginUri,
} from '../types/index.js';

/**
 * Login cipher for storing username/password credentials
 */
export class LoginCipher extends BaseCipher {
  /** Cipher type identifier */
  public readonly type = CipherType.Login;

  /** Username for login */
  public username: string | null;

  /** Password for login */
  public password: string | null;

  /** Primary URI for this login */
  public uri: string | null;

  /** Array of URIs with match types */
  public uris: LoginUri[] | null;

  /** TOTP secret for 2FA */
  public totp: string | null;

  /** When password was last changed */
  public passwordRevisionDate: Date | null;

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

    const login = data.login ?? ({} as APILoginData);
    this.username = login.username ?? null;
    this.password = login.password ?? null;
    this.uri = login.uri ?? null;
    this.uris = login.uris?.map((u) => ({
      uri: u.uri,
      match: u.match,
    })) ?? null;
    this.totp = login.totp ?? null;
    this.passwordRevisionDate = login.passwordRevisionDate
      ? new Date(login.passwordRevisionDate)
      : null;
  }

  /**
   * Get masked password (shows dots)
   */
  get maskedPassword(): string {
    if (!this.password) return '';
    return '•'.repeat(Math.min(this.password.length, 20));
  }

  /**
   * Get domain from URI
   */
  get domain(): string | null {
    if (!this.uri) return null;
    try {
      const url = new URL(this.uri);
      return url.hostname;
    } catch {
      return this.uri;
    }
  }

  /**
   * Get protocol from URI (http/https)
   */
  get protocol(): string | null {
    if (!this.uri) return null;
    try {
      const url = new URL(this.uri);
      return url.protocol.slice(0, -1); // Remove trailing colon
    } catch {
      return null;
    }
  }

  /**
   * Check if password is old (90+ days)
   */
  get isPasswordOld(): boolean {
    if (!this.passwordRevisionDate) return true;
    const daysSinceChange = (Date.now() - this.passwordRevisionDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceChange > 90;
  }

  /**
   * Check if this login has 2FA configured
   */
  get hasTwoFactor(): boolean {
    return this.totp !== null;
  }

  /**
   * Update this login cipher
   * @param data Update data
   */
  async update(data: {
    name?: string;
    username?: string;
    password?: string;
    uri?: string;
    uris?: LoginUri[];
    totp?: string;
    notes?: string;
    folderId?: string | null;
    favorite?: boolean;
  }): Promise<LoginCipher> {
    const updated = await this.client.ciphers.updateLogin(this.id, {
      name: data.name ?? this.name,
      username: data.username ?? this.username,
      password: data.password ?? this.password,
      uri: data.uri ?? this.uri,
      uris: data.uris ?? this.uris,
      totp: data.totp ?? this.totp,
      notes: data.notes ?? this.notes,
      folderId: data.folderId !== undefined ? data.folderId : this.folderId,
      favorite: data.favorite ?? this.favorite,
    });
    return updated;
  }

  /**
   * Generate a new password and update
   * @param length Password length
   * @returns New password
   */
  async regeneratePassword(length = 20): Promise<string> {
    const newPassword = this.client.generatePassword({ length });
    await this.update({ password: newPassword });
    return newPassword;
  }

  /**
   * Add a URI to this login
   * @param uri URI to add
   * @param match Match type
   */
  async addUri(uri: string, match: number | null = null): Promise<void> {
    const uris = this.uris ?? [];
    uris.push({ uri, match });
    await this.update({ uris });
  }

  /**
   * Remove a URI from this login
   * @param uri URI to remove
   */
  async removeUri(uri: string): Promise<void> {
    if (!this.uris) return;
    const uris = this.uris.filter((u) => u.uri !== uri);
    await this.update({ uris });
  }

  /**
   * Check if URI matches this login
   * @param uri URI to check
   */
  matchesUri(uri: string): boolean {
    if (!this.uri && !this.uris) return false;

    // Check primary URI
    if (this.uri) {
      if (this.uri === uri) return true;
      try {
        const loginDomain = this.domain;
        const checkDomain = new URL(uri).hostname;
        if (loginDomain === checkDomain) return true;
      } catch {
        // Invalid URL, skip
      }
    }

    // Check additional URIs
    if (this.uris) {
      return this.uris.some((u) => {
        if (u.uri === uri) return true;
        try {
          const loginDomain = new URL(u.uri).hostname;
          const checkDomain = new URL(uri).hostname;
          return loginDomain === checkDomain;
        } catch {
          return false;
        }
      });
    }

    return false;
  }

  /**
   * Convert to JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      type: this.type,
      username: this.username,
      password: this.maskedPassword,
      uri: this.uri,
      domain: this.domain,
      uris: this.uris,
      hasTwoFactor: this.hasTwoFactor,
      isPasswordOld: this.isPasswordOld,
    };
  }
}
