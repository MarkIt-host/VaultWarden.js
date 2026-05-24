/**
 * Card cipher structure for storing credit/debit card information
 * @module structures
 */

import type { VaultwardenClient } from '../client/VaultwardenClient.js';
import { BaseCipher } from './BaseStructure.js';
import { CipherType } from '../types/index.js';
import type { APICipher, APICardData } from '../types/index.js';

/**
 * Card cipher for storing payment card information
 */
export class CardCipher extends BaseCipher {
  /** Cipher type identifier */
  public readonly type = CipherType.Card;

  /** Name on the card */
  public cardholderName: string | null;

  /** Card brand (Visa, Mastercard, etc.) */
  public brand: string | null;

  /** Card number */
  public number: string | null;

  /** Expiration month (1-12) */
  public expMonth: string | null;

  /** Expiration year (4 digits) */
  public expYear: string | null;

  /** Security code (CVV/CVC) */
  public code: string | null;

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

    const card = data.card ?? ({} as APICardData);
    this.cardholderName = card.cardholderName ?? null;
    this.brand = card.brand ?? null;
    this.number = card.number ?? null;
    this.expMonth = card.expMonth ?? null;
    this.expYear = card.expYear ?? null;
    this.code = card.code ?? null;
  }

  /**
   * Get masked card number (shows last 4 digits)
   */
  get maskedNumber(): string | null {
    if (!this.number) return null;
    if (this.number.length <= 4) return '••••';
    const last4 = this.number.slice(-4);
    const masked = '•'.repeat(this.number.length - 4);
    // Format with spaces every 4 characters
    const parts: string[] = [];
    for (let i = 0; i < masked.length; i += 4) {
      parts.push(masked.slice(i, i + 4));
    }
    parts.push(last4);
    return parts.join(' ');
  }

  /**
   * Get last 4 digits of card
   */
  get lastFourDigits(): string | null {
    return this.number?.slice(-4) ?? null;
  }

  /**
   * Get formatted expiration date (MM/YYYY)
   */
  get expiration(): string | null {
    if (!this.expMonth || !this.expYear) return null;
    const month = this.expMonth.padStart(2, '0');
    return `${month}/${this.expYear}`;
  }

  /**
   * Check if card is expired
   */
  get isExpired(): boolean {
    if (!this.expMonth || !this.expYear) return false;
    const now = new Date();
    const expYear = parseInt(this.expYear, 10);
    const expMonth = parseInt(this.expMonth, 10);
    // Month is 1-indexed, Date month is 0-indexed
    const expDate = new Date(expYear, expMonth);
    return now >= expDate;
  }

  /**
   * Check if card expires soon (within 30 days)
   */
  get expiresSoon(): boolean {
    if (this.isExpired) return false;
    if (!this.expMonth || !this.expYear) return false;
    const expYear = parseInt(this.expYear, 10);
    const expMonth = parseInt(this.expMonth, 10);
    const expDate = new Date(expYear, expMonth);
    const daysUntilExpiry = (expDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry <= 30;
  }

  /**
   * Detect card brand from number
   */
  get detectedBrand(): string | null {
    if (!this.number) return null;
    const num = this.number.replace(/\s/g, '');

    // Visa
    if (/^4/.test(num)) return 'visa';
    // Mastercard
    if (/^5[1-5]/.test(num) || /^2[2-7]/.test(num)) return 'mastercard';
    // Amex
    if (/^3[47]/.test(num)) return 'amex';
    // Discover
    if (/^6(?:011|5)/.test(num)) return 'discover';
    // JCB
    if (/^35/.test(num)) return 'jcb';
    // Diners Club
    if (/^3(?:0[0-5]|[68])/.test(num)) return 'diners';

    return null;
  }

  /**
   * Update this card cipher
   * @param data Update data
   */
  async update(data: {
    name?: string;
    cardholderName?: string;
    brand?: string;
    number?: string;
    expMonth?: string;
    expYear?: string;
    code?: string;
    notes?: string;
    folderId?: string | null;
  }): Promise<CardCipher> {
    const updated = await this.client.ciphers.updateCard(this.id, {
      name: data.name ?? this.name,
      cardholderName: data.cardholderName ?? this.cardholderName,
      brand: data.brand ?? this.brand,
      number: data.number ?? this.number,
      expMonth: data.expMonth ?? this.expMonth,
      expYear: data.expYear ?? this.expYear,
      code: data.code ?? this.code,
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
      cardholderName: this.cardholderName,
      brand: this.brand,
      maskedNumber: this.maskedNumber,
      lastFourDigits: this.lastFourDigits,
      expiration: this.expiration,
      isExpired: this.isExpired,
      expiresSoon: this.expiresSoon,
    };
  }
}
