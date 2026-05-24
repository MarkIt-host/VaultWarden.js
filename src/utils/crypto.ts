/**
 * Cryptographic utilities for Vaultwarden/Bitwarden
 * @module utils
 */

import crypto from 'crypto';
import { CryptoError } from '../errors/index.js';

/**
 * Derive a key using PBKDF2
 * @param password Password or key material
 * @param salt Salt for key derivation
 * @param iterations Number of iterations
 * @param keyLength Length of derived key in bytes
 * @returns Base64-encoded derived key
 */
export function pbkdf2Base64(
  password: string | Buffer,
  salt: string | Buffer,
  iterations: number,
  keyLength: number
): string {
  try {
    const result = crypto.pbkdf2Sync(password, salt, iterations, keyLength, 'sha256');
    return result.toString('base64');
  } catch (error) {
    throw CryptoError.keyDerivation();
  }
}

/**
 * Derive master key from password using PBKDF2
 * Uses normalized email as salt
 * @param password User's master password
 * @param email User's email (normalized)
 * @param kdfIterations Number of KDF iterations from server
 * @returns Base64-encoded master key
 */
export function makeKeyFromPassword(
  password: string,
  email: string,
  kdfIterations: number
): string {
  const normalizedEmail = email.toLowerCase().trim();
  return pbkdf2Base64(password, normalizedEmail, kdfIterations, 32);
}

/**
 * Create master password hash for authentication
 * Uses PBKDF2 with the master key
 * @param password User's master password
 * @param masterKey Derived master key
 * @returns Base64-encoded password hash
 */
export function makeMasterPasswordHash(password: string, masterKey: string): string {
  const keyBytes = Buffer.from(masterKey, 'base64');
  return pbkdf2Base64(keyBytes, password, 1, 32);
}

/**
 * Generate a cryptographically secure random string
 * @param length Length of string to generate
 * @param chars Character set to use (default: alphanumeric)
 * @returns Random string
 */
export function generateRandomString(
  length: number,
  chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
): string {
  const randomBytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i]! % chars.length];
  }
  return result;
}

/**
 * Generate cryptographically secure random bytes
 * @param length Number of bytes to generate
 * @returns Buffer of random bytes
 */
export function generateSecureRandomBytes(length: number): Buffer {
  return crypto.randomBytes(length);
}

/**
 * Generate a UUID v4
 * @returns UUID string
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * HKDF-Expand for Bitwarden key stretching
 * Expands the master key to derive encryption and MAC keys
 * @param masterKey 32-byte master key
 * @param info Context info string
 * @param length Desired output length
 * @returns Expanded key material
 */
export function hkdfExpand(masterKey: Buffer, info: string, length: number): Buffer {
  const hashLen = 32; // SHA256 output length
  const numBlocks = Math.ceil(length / hashLen);
  const okm = Buffer.allocUnsafe(numBlocks * hashLen);

  let prev = Buffer.alloc(0);
  for (let i = 1; i <= numBlocks; i++) {
    const hmac = crypto.createHmac('sha256', masterKey);
    hmac.update(prev);
    hmac.update(info);
    hmac.update(Buffer.from([i]));
    prev = hmac.digest();
    prev.copy(okm, (i - 1) * hashLen);
  }

  return okm.subarray(0, length);
}

/**
 * Stretch master key to get encryption key and MAC key
 * Returns 64 bytes: first 32 for encryption, second 32 for MAC
 * @param masterKey 32-byte master key
 * @returns Object with encKey and macKey
 */
export function stretchMasterKey(masterKey: Buffer): { encKey: Buffer; macKey: Buffer } {
  const stretched = hkdfExpand(masterKey, 'enc', 32);
  const macKey = hkdfExpand(masterKey, 'mac', 32);
  return { encKey: stretched, macKey };
}

/**
 * Hash a password using PBKDF2 with random salt
 * For local password storage (not server auth)
 * @param password Password to hash
 * @returns Object with hash and salt
 */
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = generateSecureRandomBytes(32).toString('base64');
  const hash = pbkdf2Base64(password, salt, 100000, 32);
  return { hash, salt };
}

/**
 * Verify a password against a hash
 * @param password Password to verify
 * @param hash Expected hash
 * @param salt Salt used for hashing
 * @returns True if password matches
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const computedHash = pbkdf2Base64(password, salt, 100000, 32);
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(computedHash, 'base64'),
      Buffer.from(hash, 'base64')
    );
  } catch {
    return false;
  }
}

/**
 * Generate a secure password with specified options
 * @param length Password length
 * @param options Character set options
 * @returns Generated password
 */
export function generateSecurePassword(
  length = 16,
  options: {
    uppercase?: boolean;
    lowercase?: boolean;
    numbers?: boolean;
    special?: boolean;
  } = {}
): string {
  const {
    uppercase = true,
    lowercase = true,
    numbers = true,
    special = true,
  } = options;

  let chars = '';
  if (lowercase) chars += 'abcdefghijklmnopqrstuvwxyz';
  if (uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (numbers) chars += '0123456789';
  if (special) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

  if (chars === '') {
    chars = 'abcdefghijklmnopqrstuvwxyz';
  }

  // Ensure at least one character from each selected set
  let password = '';
  const randomBytes = generateSecureRandomBytes(length);

  for (let i = 0; i < length; i++) {
    password += chars[randomBytes[i]! % chars.length];
  }

  return password;
}

/**
 * Generate a passphrase with random words
 * @param numWords Number of words
 * @param separator Word separator
 * @returns Generated passphrase
 */
export function generatePassphrase(
  numWords = 4,
  separator = '-'
): string {
  // Common word list (simplified - production should use larger EFF word list)
  const wordList = [
    'apple', 'banana', 'cherry', 'date', 'elderberry', 'fig', 'grape', 'honeydew',
    'kiwi', 'lemon', 'mango', 'nectarine', 'orange', 'papaya', 'quince', 'raspberry',
    'strawberry', 'tangerine', 'ugli', 'vanilla', 'watermelon', 'xigua', 'yam', 'zucchini',
    'alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf', 'hotel',
    'india', 'juliet', 'kilo', 'lima', 'mike', 'november', 'oscar', 'papa',
    'quebec', 'romeo', 'sierra', 'tango', 'uniform', 'victor', 'whiskey', 'xray',
    'yankee', 'zulu', 'anchor', 'butterfly', 'crystal', 'diamond', 'emerald', 'falcon',
    'garden', 'harbor', 'island', 'jungle', 'knight', 'lighthouse', 'mountain', 'nebula',
    'ocean', 'pioneer', 'quantum', 'rainbow', 'sunset', 'thunder', 'universe', 'voyage',
    'winter', 'xenon', 'yellow', 'zenith', 'amber', 'bronze', 'copper', 'dawn',
    'evening', 'forest', 'golden', 'horizon', 'iron', 'jade', 'kingdom', 'legend',
    'midnight', 'north', 'obsidian', 'pearl', 'quest', 'river', 'silver', 'titanium',
    'urban', 'valley', 'west', 'xylophone', 'year', 'zephyr', 'azure', 'blizzard',
    'comet', 'drift', 'eclipse', 'flame', 'glacier', 'hollow', 'iceberg', 'jupiter',
    'kraken', 'lunar', 'meteor', 'neptune', 'orbit', 'plasma', 'quasar', 'rocket',
    'solar', 'tidal', 'uranus', 'venus', 'warp', 'xenon', 'yonder', 'zenith',
  ];

  const words: string[] = [];
  for (let i = 0; i < numWords; i++) {
    const randomIndex = crypto.randomInt(wordList.length);
    words.push(wordList[randomIndex]!);
  }

  return words.join(separator);
}

/**
 * Constant-time comparison of two buffers
 * @param a First buffer
 * @param b Second buffer
 * @returns True if buffers are equal
 */
export function constantTimeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Convert a string to a Buffer (for consistent encoding)
 * @param str String to convert
 * @returns UTF-8 encoded buffer
 */
export function stringToBuffer(str: string): Buffer {
  return Buffer.from(str, 'utf8');
}

/**
 * Convert a base64 string to a Buffer
 * @param base64 Base64 string
 * @returns Decoded buffer
 */
export function base64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64, 'base64');
}

/**
 * Convert a Buffer to a base64 string
 * @param buffer Buffer to convert
 * @returns Base64 string
 */
export function bufferToBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}
