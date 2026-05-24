/**
 * Structure exports
 * @module structures
 */

// Base classes
export {
  BaseStructure,
  BaseIdentifiable,
  BaseUpdatable,
  BaseCipher,
} from './BaseStructure.js';

// Cipher types
export { LoginCipher } from './LoginCipher.js';
export { CardCipher } from './CardCipher.js';
export { SecureNoteCipher } from './SecureNoteCipher.js';
export { IdentityCipher } from './IdentityCipher.js';

// Organization structures
export { FolderStructure } from './FolderStructure.js';
export { CollectionStructure } from './CollectionStructure.js';
export { OrganizationStructure } from './OrganizationStructure.js';

// Type exports for convenience
export type { BaseCipher as Cipher } from './BaseStructure.js';
