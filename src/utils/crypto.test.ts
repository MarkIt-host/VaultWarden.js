import { describe, it, expect } from 'vitest';
import {
  pbkdf2Base64,
  makeKeyFromPassword,
  makeMasterPasswordHash,
  generateRandomString,
  generateSecureRandomBytes,
  generateUUID,
  hkdfExpand,
  stretchMasterKey,
  constantTimeEqual,
  stringToBuffer,
  base64ToBuffer,
  bufferToBase64,
  generateSecurePassword,
  generatePassphrase,
} from './crypto.js';

describe('Crypto utilities', () => {
  describe('pbkdf2Base64', () => {
    it('should derive key', () => {
      const key = pbkdf2Base64('password', 'salt', 1000, 32);
      expect(typeof key).toBe('string');
      expect(Buffer.from(key, 'base64').length).toBe(32);
    });

    it('should produce consistent results', () => {
      const key1 = pbkdf2Base64('password', 'salt', 1000, 32);
      const key2 = pbkdf2Base64('password', 'salt', 1000, 32);
      expect(key1).toBe(key2);
    });

    it('should produce different results with different inputs', () => {
      const key1 = pbkdf2Base64('password1', 'salt', 1000, 32);
      const key2 = pbkdf2Base64('password2', 'salt', 1000, 32);
      expect(key1).not.toBe(key2);
    });
  });

  describe('makeKeyFromPassword', () => {
    it('should derive master key', () => {
      const key = makeKeyFromPassword('password', 'user@example.com', 100000);
      expect(typeof key).toBe('string');
    });

    it('should normalize email', () => {
      const key1 = makeKeyFromPassword('password', 'User@Example.com', 100000);
      const key2 = makeKeyFromPassword('password', 'user@example.com', 100000);
      expect(key1).toBe(key2);
    });
  });

  describe('makeMasterPasswordHash', () => {
    it('should create password hash', () => {
      const masterKey = makeKeyFromPassword('password', 'user@example.com', 100000);
      const hash = makeMasterPasswordHash('password', masterKey);
      expect(typeof hash).toBe('string');
    });
  });

  describe('generateRandomString', () => {
    it('should generate string of correct length', () => {
      const str = generateRandomString(32);
      expect(str.length).toBe(32);
    });

    it('should generate different strings', () => {
      const str1 = generateRandomString(32);
      const str2 = generateRandomString(32);
      expect(str1).not.toBe(str2);
    });
  });

  describe('generateSecureRandomBytes', () => {
    it('should generate buffer of correct length', () => {
      const buf = generateSecureRandomBytes(32);
      expect(buf.length).toBe(32);
    });
  });

  describe('generateUUID', () => {
    it('should generate valid UUID', () => {
      const uuid = generateUUID();
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should generate unique UUIDs', () => {
      const uuids = new Set();
      for (let i = 0; i < 100; i++) {
        uuids.add(generateUUID());
      }
      expect(uuids.size).toBe(100);
    });
  });

  describe('hkdfExpand', () => {
    it('should expand key', () => {
      const masterKey = generateSecureRandomBytes(32);
      const expanded = hkdfExpand(masterKey, 'test', 64);
      expect(expanded.length).toBe(64);
    });
  });

  describe('stretchMasterKey', () => {
    it('should stretch key into encKey and macKey', () => {
      const masterKey = generateSecureRandomBytes(32);
      const { encKey, macKey } = stretchMasterKey(masterKey);
      expect(encKey.length).toBe(32);
      expect(macKey.length).toBe(32);
    });

    it('should produce consistent results', () => {
      const masterKey = generateSecureRandomBytes(32);
      const result1 = stretchMasterKey(masterKey);
      const result2 = stretchMasterKey(masterKey);
      expect(result1.encKey.toString('base64')).toBe(result2.encKey.toString('base64'));
      expect(result1.macKey.toString('base64')).toBe(result2.macKey.toString('base64'));
    });
  });

  describe('constantTimeEqual', () => {
    it('should return true for equal buffers', () => {
      const buf1 = Buffer.from('test');
      const buf2 = Buffer.from('test');
      expect(constantTimeEqual(buf1, buf2)).toBe(true);
    });

    it('should return false for different buffers', () => {
      const buf1 = Buffer.from('test1');
      const buf2 = Buffer.from('test2');
      expect(constantTimeEqual(buf1, buf2)).toBe(false);
    });

    it('should return false for different lengths', () => {
      const buf1 = Buffer.from('test');
      const buf2 = Buffer.from('testing');
      expect(constantTimeEqual(buf1, buf2)).toBe(false);
    });
  });

  describe('buffer conversion', () => {
    it('should convert string to buffer', () => {
      const buf = stringToBuffer('hello');
      expect(buf.toString()).toBe('hello');
    });

    it('should convert buffer to base64', () => {
      const buf = Buffer.from('hello');
      const base64 = bufferToBase64(buf);
      expect(typeof base64).toBe('string');
      expect(Buffer.from(base64, 'base64').toString()).toBe('hello');
    });

    it('should convert base64 to buffer', () => {
      const base64 = Buffer.from('hello').toString('base64');
      const buf = base64ToBuffer(base64);
      expect(buf.toString()).toBe('hello');
    });
  });

  describe('generateSecurePassword', () => {
    it('should generate password of correct length', () => {
      const password = generateSecurePassword(16);
      expect(password.length).toBe(16);
    });

    it('should generate different passwords', () => {
      const p1 = generateSecurePassword(16);
      const p2 = generateSecurePassword(16);
      expect(p1).not.toBe(p2);
    });

    it('should include uppercase when requested', () => {
      const password = generateSecurePassword(100, { uppercase: true, lowercase: false });
      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/[a-z]/.test(password)).toBe(false);
    });
  });

  describe('generatePassphrase', () => {
    it('should generate correct number of words', () => {
      const phrase = generatePassphrase(4, '-');
      expect(phrase.split('-').length).toBe(4);
    });

    it('should use custom separator', () => {
      const phrase = generatePassphrase(3, '_');
      expect(phrase).toContain('_');
      expect(phrase.split('_').length).toBe(3);
    });
  });
});
