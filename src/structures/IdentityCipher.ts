/**
 * Identity cipher structure
 * @module structures
 */

import type { VaultwardenClient } from '../client/VaultwardenClient.js';
import { BaseCipher } from './BaseStructure.js';
import { CipherType } from '../types/index.js';
import type { APICipher, APIIdentityData } from '../types/index.js';

/**
 * Identity cipher for storing personal identity information
 */
export class IdentityCipher extends BaseCipher {
  /** Cipher type identifier */
  public readonly type = CipherType.Identity;

  /** Title (Mr., Mrs., etc.) */
  public title: string | null;

  /** First name */
  public firstName: string | null;

  /** Middle name */
  public middleName: string | null;

  /** Last name */
  public lastName: string | null;

  /** Address line 1 */
  public address1: string | null;

  /** Address line 2 */
  public address2: string | null;

  /** Address line 3 */
  public address3: string | null;

  /** City */
  public city: string | null;

  /** State/Province */
  public state: string | null;

  /** Postal/ZIP code */
  public postalCode: string | null;

  /** Country */
  public country: string | null;

  /** Company name */
  public company: string | null;

  /** Email address */
  public email: string | null;

  /** Phone number */
  public phone: string | null;

  /** Social Security Number */
  public ssn: string | null;

  /** Username */
  public username: string | null;

  /** Passport number */
  public passportNumber: string | null;

  /** License number */
  public licenseNumber: string | null;

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

    const identity = data.identity ?? ({} as APIIdentityData);
    this.title = identity.title ?? null;
    this.firstName = identity.firstName ?? null;
    this.middleName = identity.middleName ?? null;
    this.lastName = identity.lastName ?? null;
    this.address1 = identity.address1 ?? null;
    this.address2 = identity.address2 ?? null;
    this.address3 = identity.address3 ?? null;
    this.city = identity.city ?? null;
    this.state = identity.state ?? null;
    this.postalCode = identity.postalCode ?? null;
    this.country = identity.country ?? null;
    this.company = identity.company ?? null;
    this.email = identity.email ?? null;
    this.phone = identity.phone ?? null;
    this.ssn = identity.ssn ?? null;
    this.username = identity.username ?? null;
    this.passportNumber = identity.passportNumber ?? null;
    this.licenseNumber = identity.licenseNumber ?? null;
  }

  /**
   * Get full name
   */
  get fullName(): string {
    const parts = [this.title, this.firstName, this.middleName, this.lastName]
      .filter(Boolean)
      .join(' ');
    return parts || 'Unknown';
  }

  /**
   * Get display name (first + last)
   */
  get displayName(): string {
    if (this.firstName && this.lastName) {
      return `${this.firstName} ${this.lastName}`;
    }
    return this.fullName;
  }

  /**
   * Get initials
   */
  get initials(): string {
    const parts = [this.firstName?.[0], this.lastName?.[0]].filter(Boolean);
    return parts.join('').toUpperCase();
  }

  /**
   * Get formatted address
   */
  get address(): string | null {
    const parts = [this.address1, this.address2, this.address3]
      .filter(Boolean)
      .join(', ');
    const cityStateZip = [this.city, this.state, this.postalCode]
      .filter(Boolean)
      .join(', ');
    const fullAddress = [parts, cityStateZip, this.country]
      .filter(Boolean)
      .join('\n');
    return fullAddress || null;
  }

  /**
   * Get formatted address as single line
   */
  get addressLine(): string | null {
    const parts = [
      this.address1,
      this.city,
      this.state,
      this.postalCode,
      this.country,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  }

  /**
   * Get masked SSN (***-**-XXXX)
   */
  get maskedSSN(): string | null {
    if (!this.ssn) return null;
    const last4 = this.ssn.slice(-4);
    return `***-**-${last4}`;
  }

  /**
   * Get formatted phone number
   */
  get formattedPhone(): string | null {
    if (!this.phone) return null;
    const digits = this.phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return this.phone;
  }

  /**
   * Update this identity
   * @param data Update data
   */
  async update(data: {
    name?: string;
    title?: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    address1?: string;
    address2?: string;
    address3?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    company?: string;
    email?: string;
    phone?: string;
    ssn?: string;
    username?: string;
    passportNumber?: string;
    licenseNumber?: string;
    notes?: string;
    folderId?: string | null;
  }): Promise<IdentityCipher> {
    const updated = await this.client.ciphers.updateIdentity(this.id, {
      name: data.name ?? this.name,
      title: data.title ?? this.title,
      firstName: data.firstName ?? this.firstName,
      middleName: data.middleName ?? this.middleName,
      lastName: data.lastName ?? this.lastName,
      address1: data.address1 ?? this.address1,
      address2: data.address2 ?? this.address2,
      address3: data.address3 ?? this.address3,
      city: data.city ?? this.city,
      state: data.state ?? this.state,
      postalCode: data.postalCode ?? this.postalCode,
      country: data.country ?? this.country,
      company: data.company ?? this.company,
      email: data.email ?? this.email,
      phone: data.phone ?? this.phone,
      ssn: data.ssn ?? this.ssn,
      username: data.username ?? this.username,
      passportNumber: data.passportNumber ?? this.passportNumber,
      licenseNumber: data.licenseNumber ?? this.licenseNumber,
      notes: data.notes ?? this.notes,
      folderId: data.folderId !== undefined ? data.folderId : this.folderId,
    });
    return updated;
  }

  /**
   * Convert to JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      type: this.type,
      fullName: this.fullName,
      displayName: this.displayName,
      initials: this.initials,
      address: this.address,
      email: this.email,
      phone: this.formattedPhone,
    };
  }
}
