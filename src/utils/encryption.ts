/**
 * Encryption/decryption utilities for Vaultwarden/Bitwarden data
 * @module utils
 */

import crypto from 'crypto';
import { CryptoError } from '../errors/index.js';
import type {
  APICipher,
  APIIdentityData,
  APIField,
  APIUri,
} from '../types/index.js';

/**
 * Encrypt data using AES-256-CBC
 * @param plaintext Data to encrypt
 * @param key 32-byte encryption key
 * @param iv 16-byte initialization vector
 * @returns Encrypted data
 */
export function encryptAesCbc(plaintext: string, key: Buffer, iv: Buffer): Buffer {
  try {
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return encrypted;
  } catch (error) {
    throw CryptoError.encryption();
  }
}

/**
 * Decrypt data using AES-256-CBC
 * @param encryptedData Data to decrypt
 * @param key 32-byte encryption key
 * @param iv 16-byte initialization vector
 * @returns Decrypted string
 */
export function decryptAesCbc(encryptedData: Buffer, key: Buffer, iv: Buffer): string {
  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    throw CryptoError.decryption();
  }
}

/**
 * Encrypt a string with the Bitwarden format
 * Format: "2.{iv}|{ciphertext}|{mac}"
 * @param plaintext String to encrypt
 * @param encKey Encryption key
 * @param macKey Optional MAC key for integrity
 * @returns Encrypted string or null if input is null
 */
export function encryptString(
  plaintext: string | null,
  encKey: Buffer,
  macKey?: Buffer
): string | null {
  if (plaintext == null) return null;

  try {
    const iv = crypto.randomBytes(16);
    const encrypted = encryptAesCbc(plaintext, encKey, iv);

    if (macKey) {
      const mac = crypto.createHmac('sha256', macKey).update(iv).update(encrypted).digest();
      return `2.${iv.toString('base64')}|${encrypted.toString('base64')}|${mac.toString('base64')}`;
    }

    return `2.${iv.toString('base64')}|${encrypted.toString('base64')}`;
  } catch (error) {
    throw CryptoError.encryption();
  }
}

/**
 * Decrypt the profile key (64 bytes: 32 bytes enc + 32 bytes MAC)
 * @param encryptedKey Encrypted profile key from server
 * @param key Decryption key
 * @returns Decrypted key buffer or null on failure
 */
export function decryptProfileKey(encryptedKey: string, key: Buffer): Buffer | null {
  try {
    // Parse the encrypted key
    if (!encryptedKey.includes('.')) {
      return null;
    }

    const parts = encryptedKey.slice(2).split('|');
    if (parts.length < 2 || !parts[0] || !parts[1]) {
      return null;
    }

    const iv = Buffer.from(parts[0], 'base64');
    const encrypted = Buffer.from(parts[1], 'base64');

    if (iv.length !== 16 || encrypted.length === 0) {
      return null;
    }

    // Decrypt with auto-padding off for profile key
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    decipher.setAutoPadding(false);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    // Remove PKCS7 padding
    let paddingLength = decrypted[decrypted.length - 1] ?? 0;
    if (paddingLength <= 0 || paddingLength > 16) {
      paddingLength = 16;
    }

    return decrypted.subarray(0, decrypted.length - paddingLength);
  } catch {
    return null;
  }
}

/**
 * Decrypt a string with the Bitwarden format
 * @param encryptedString Encrypted string
 * @param key Decryption key
 * @returns Decrypted string or null on failure
 */
export function decryptString(encryptedString: string | null, key: Buffer): string | null {
  if (encryptedString == null) return null;

  try {
    // Bitwarden format: "2.{iv}|{ciphertext}|{mac}" or legacy format
    if (encryptedString.includes('.')) {
      const parts = encryptedString.slice(2).split('|');
      if (parts.length >= 2 && parts[0] && parts[1]) {
        const iv = Buffer.from(parts[0], 'base64');
        const encrypted = Buffer.from(parts[1], 'base64');

        if (iv.length === 16) {
          try {
            return decryptAesCbc(encrypted, key, iv);
          } catch {
            // Fall through to legacy handling
          }
        }
      }
    }

    // Legacy format: just base64(IV + ciphertext)
    const combined = Buffer.from(encryptedString, 'base64');
    if (combined.length < 16) return null;

    const iv = combined.subarray(0, 16);
    const encrypted = combined.subarray(16);
    return decryptAesCbc(encrypted, key, iv);
  } catch {
    return null;
  }
}

/**
 * Decrypt a cipher object from API response
 * @param cipher Cipher data from API
 * @param key Decryption key
 * @returns Decrypted cipher data
 */
export function decryptCipher(cipher: APICipher, key: Buffer): APICipher {
  const decrypted: APICipher = { ...cipher };

  // Decrypt basic fields
  decrypted.name = decryptString(cipher.name, key) ?? cipher.name;
  decrypted.notes = decryptString(cipher.notes, key);

  // Decrypt login data
  if (cipher.login) {
    decrypted.login = { ...cipher.login };
    decrypted.login.username = decryptString(cipher.login.username, key);
    decrypted.login.password = decryptString(cipher.login.password, key);
    decrypted.login.uri = decryptString(cipher.login.uri, key);
    decrypted.login.totp = decryptString(cipher.login.totp, key);

    if (cipher.login.uris) {
      decrypted.login.uris = cipher.login.uris.map((u: APIUri) => ({
        ...u,
        uri: decryptString(u.uri, key) ?? u.uri,
      }));
    }
  }

  // Decrypt card data
  if (cipher.card) {
    decrypted.card = { ...cipher.card };
    decrypted.card.cardholderName = decryptString(cipher.card.cardholderName, key);
    decrypted.card.brand = decryptString(cipher.card.brand, key);
    decrypted.card.number = decryptString(cipher.card.number, key);
    decrypted.card.expMonth = decryptString(cipher.card.expMonth, key);
    decrypted.card.expYear = decryptString(cipher.card.expYear, key);
    decrypted.card.code = decryptString(cipher.card.code, key);
  }

  // Decrypt identity data
  if (cipher.identity) {
    decrypted.identity = { ...cipher.identity };
    const fields: (keyof APIIdentityData)[] = [
      'title', 'firstName', 'middleName', 'lastName',
      'address1', 'address2', 'address3', 'city',
      'state', 'postalCode', 'country', 'company',
      'email', 'phone', 'ssn', 'username',
      'passportNumber', 'licenseNumber',
    ];
    for (const field of fields) {
      decrypted.identity[field] = decryptString(cipher.identity[field], key);
    }
  }

  // Decrypt custom fields
  if (cipher.fields) {
    decrypted.fields = cipher.fields.map((f: APIField) => ({
      ...f,
      name: decryptString(f.name, key),
      value: decryptString(f.value, key),
    }));
  }

  return decrypted;
}

/**
 * Encrypt a cipher object for API submission
 * @param cipherData Cipher data to encrypt
 * @param encKey Encryption key
 * @param macKey Optional MAC key
 * @returns Encrypted cipher data ready for API
 */
export function encryptCipherForCreate(
  cipherData: Partial<APICipher>,
  encKey: Buffer,
  macKey?: Buffer
): Partial<APICipher> {
  const encrypted: Partial<APICipher> = { ...cipherData };

  // Encrypt basic fields
  encrypted.name = encryptString(cipherData.name ?? '', encKey, macKey)!;
  encrypted.notes = encryptString(cipherData.notes ?? null, encKey, macKey);

  // Encrypt login data
  if (cipherData.login) {
    encrypted.login = {
      ...cipherData.login,
      username: encryptString(cipherData.login.username, encKey, macKey),
      password: encryptString(cipherData.login.password, encKey, macKey),
      uri: encryptString(cipherData.login.uri, encKey, macKey),
      totp: encryptString(cipherData.login.totp, encKey, macKey),
      passwordRevisionDate: cipherData.login.passwordRevisionDate,
      fido2Credentials: cipherData.login.fido2Credentials,
    };

    if (cipherData.login.uris) {
      encrypted.login.uris = cipherData.login.uris.map((u: APIUri) => ({
        ...u,
        uri: encryptString(u.uri, encKey, macKey) ?? u.uri,
      }));
    }
  }

  // Encrypt card data
  if (cipherData.card) {
    encrypted.card = {
      cardholderName: encryptString(cipherData.card.cardholderName, encKey, macKey),
      brand: encryptString(cipherData.card.brand, encKey, macKey),
      number: encryptString(cipherData.card.number, encKey, macKey),
      expMonth: encryptString(cipherData.card.expMonth, encKey, macKey),
      expYear: encryptString(cipherData.card.expYear, encKey, macKey),
      code: encryptString(cipherData.card.code, encKey, macKey),
    };
  }

  // Encrypt identity data
  if (cipherData.identity) {
    const idData = cipherData.identity;
    encrypted.identity = {
      title: encryptString(idData.title ?? null, encKey, macKey),
      firstName: encryptString(idData.firstName ?? null, encKey, macKey),
      middleName: encryptString(idData.middleName ?? null, encKey, macKey),
      lastName: encryptString(idData.lastName ?? null, encKey, macKey),
      address1: encryptString(idData.address1 ?? null, encKey, macKey),
      address2: encryptString(idData.address2 ?? null, encKey, macKey),
      address3: encryptString(idData.address3 ?? null, encKey, macKey),
      city: encryptString(idData.city ?? null, encKey, macKey),
      state: encryptString(idData.state ?? null, encKey, macKey),
      postalCode: encryptString(idData.postalCode ?? null, encKey, macKey),
      country: encryptString(idData.country ?? null, encKey, macKey),
      company: encryptString(idData.company ?? null, encKey, macKey),
      email: encryptString(idData.email ?? null, encKey, macKey),
      phone: encryptString(idData.phone ?? null, encKey, macKey),
      ssn: encryptString(idData.ssn ?? null, encKey, macKey),
      username: encryptString(idData.username ?? null, encKey, macKey),
      passportNumber: encryptString(idData.passportNumber ?? null, encKey, macKey),
      licenseNumber: encryptString(idData.licenseNumber ?? null, encKey, macKey),
    };
  }

  // Encrypt custom fields
  if (cipherData.fields) {
    encrypted.fields = cipherData.fields.map((f: APIField) => ({
      ...f,
      name: encryptString(f.name, encKey, macKey),
      value: encryptString(f.value, encKey, macKey),
    }));
  }

  return encrypted;
}

/**
 * Compute HMAC-SHA256 for data integrity
 * @param data Data to authenticate
 * @param key MAC key
 * @returns HMAC digest
 */
export function computeMac(data: Buffer, key: Buffer): Buffer {
  return crypto.createHmac('sha256', key).update(data).digest();
}

/**
 * Verify HMAC-SHA256 for data integrity
 * @param data Data to verify
 * @param mac Expected MAC
 * @param key MAC key
 * @returns True if MAC is valid
 */
export function verifyMac(data: Buffer, mac: Buffer, key: Buffer): boolean {
  const computed = computeMac(data, key);
  return crypto.timingSafeEqual(computed, mac);
}
