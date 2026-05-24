/**
 * Utility exports
 * @module utils
 */

export { Collection, LimitedCollection } from './Collection.js';
export { EventEmitter, type EventListener } from './EventEmitter.js';
export {
  pbkdf2Base64,
  makeKeyFromPassword,
  makeMasterPasswordHash,
  generateRandomString,
  generateSecureRandomBytes,
  generateUUID,
  hkdfExpand,
  stretchMasterKey,
  hashPassword,
  verifyPassword,
  generateSecurePassword,
  constantTimeEqual,
  stringToBuffer,
  base64ToBuffer,
  bufferToBase64,
} from './crypto.js';

export {
  encryptAesCbc,
  decryptAesCbc,
  encryptString,
  decryptString,
  decryptProfileKey,
  decryptCipher,
  encryptCipherForCreate,
  computeMac,
  verifyMac,
} from './encryption.js';

export {
  generatePassword,
  generatePassphrase,
} from './passwordGeneration.js';
