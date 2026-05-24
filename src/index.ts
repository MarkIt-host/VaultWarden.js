/**
 * Vaultwarden Client SDK
 *
 * A modern, object-oriented TypeScript SDK for Vaultwarden/Bitwarden servers.
 * Inspired by discord.js with a focus on developer experience and type safety.
 *
 * @example
 * ```typescript
 * import { VaultwardenClient } from 'vaultwarden-client';
 *
 * const client = new VaultwardenClient({
 *   baseUrl: 'https://vault.example.com',
 * });
 *
 * await client.login({
 *   username: 'user@example.com',
 *   password: 'password',
 * });
 *
 * // Sync and access data
 * await client.sync();
 *
 * // Access cached data
 * for (const [, login] of client.logins) {
 *   console.log(login.name, login.username);
 * }
 *
 * // Create new items
 * const newLogin = await client.createLogin({
 *   name: 'GitHub',
 *   username: 'myuser',
 *   password: client.generatePassword({ length: 20 }),
 * });
 *
 * // Listen for events
 * client.on('cipherCreate', (cipher) => {
 *   console.log('Created:', cipher.name);
 * });
 * ```
 *
 * @packageDocumentation
 * @module vaultwarden-client
 */

// Client
export { VaultwardenClient } from './client/index.js';
export type { VaultClientOptions } from './types/index.js';

// Managers
export {
  CipherManager,
  FolderManager,
  OrganizationManager,
  CollectionManager,
  type Cipher,
  type CipherResolvable,
  type FolderResolvable,
  type OrganizationResolvable,
  type CollectionResolvable,
  type CollectionCreateData,
} from './managers/index.js';

// Structures
export {
  BaseStructure,
  BaseIdentifiable,
  BaseUpdatable,
  BaseCipher,
  LoginCipher,
  CardCipher,
  SecureNoteCipher,
  IdentityCipher,
  FolderStructure,
  CollectionStructure,
  OrganizationStructure,
  type Cipher as CipherStructure,
} from './structures/index.js';

// Types
export {
  CipherType,
  FieldType,
  UriMatchType,
  TwoFactorMethod,
  OrganizationUserType,
  OrganizationUserStatus,
  type APICipher,
  type APILoginData,
  type APICardData,
  type APIIdentityData,
  type APISecureNoteData,
  type APIFolder,
  type APICollection,
  type APIOrganization,
  type APIField,
  type APIUri,
  type LoginUri,
  type CipherField,
  type PasswordHistory,
  type Attachment,
  type AuthTokenResponse,
  type PreloginResponse,
  type LoginCredentials,
  type PasswordGenerationOptions,
  type PassphraseGenerationOptions,
  type ClientEvents,
  type ClientEventName,
} from './types/index.js';

// Errors
export {
  VaultwardenError,
  AuthenticationError,
  APIError,
  ValidationError,
  PermissionError,
  NotFoundError,
  RateLimitError,
  TimeoutError,
  CryptoError,
  StateError,
} from './errors/index.js';

// Utils
export {
  Collection,
  LimitedCollection,
  EventEmitter,
  type EventListener,
  generatePassword,
  generatePassphrase,
} from './utils/index.js';

// Cache
export {
  BaseCache,
  EntityCache,
  type CacheOptions,
  type CacheChangeEvent,
} from './cache/index.js';

// REST
export { RESTClient } from './rest/RESTClient.js';

// Version info
export const version = '3.0.0';
