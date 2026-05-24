/**
 * Core type definitions for Vaultwarden Client
 * @module types
 */

/** Cipher type enum matching Vaultwarden/Bitwarden API */
export enum CipherType {
  Login = 1,
  SecureNote = 2,
  Card = 3,
  Identity = 4,
}

/** Field type for cipher custom fields */
export enum FieldType {
  Text = 0,
  Hidden = 1,
  Boolean = 2,
  Linked = 3,
}

/** URI match type for login URIs */
export enum UriMatchType {
  Domain = 0,
  Host = 1,
  StartsWith = 2,
  Exact = 3,
  RegularExpression = 4,
  Never = 5,
}

/** Two-factor authentication method */
export enum TwoFactorMethod {
  Authenticator = 0,
  Email = 1,
  Duo = 2,
  YubiKey = 3,
  U2F = 4,
  Remember = 5,
  OrganizationDuo = 6,
  WebAuthn = 7,
}

/** Organization user type */
export enum OrganizationUserType {
  Owner = 0,
  Admin = 1,
  User = 2,
  Manager = 3,
  Custom = 4,
}

/** Organization user status */
export enum OrganizationUserStatus {
  Invited = 0,
  Accepted = 1,
  Confirmed = 2,
}

// ============================================================================
// API Response Types
// ============================================================================

/** Generic API field structure */
export interface APIField {
  name: string | null;
  value: string | null;
  type: FieldType;
  linkedId: number | null;
}

/** API URI structure for logins */
export interface APIUri {
  uri: string;
  match: UriMatchType | null;
}

/** API login data structure */
export interface APILoginData {
  username: string | null;
  password: string | null;
  passwordRevisionDate: string | null;
  uri: string | null;
  uris: APIUri[] | null;
  totp: string | null;
  autofillOnPageLoad: boolean | null;
  fido2Credentials: unknown[] | null;
}

/** API card data structure */
export interface APICardData {
  cardholderName: string | null;
  brand: string | null;
  number: string | null;
  expMonth: string | null;
  expYear: string | null;
  code: string | null;
}

/** API identity data structure */
export interface APIIdentityData {
  title: string | null;
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
  address1: string | null;
  address2: string | null;
  address3: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  ssn: string | null;
  username: string | null;
  passportNumber: string | null;
  licenseNumber: string | null;
}

/** API secure note data structure */
export interface APISecureNoteData {
  type: number;
}

/** Main API cipher structure */
export interface APICipher {
  id: string;
  type: CipherType;
  name: string;
  notes: string | null;
  login?: APILoginData;
  card?: APICardData;
  identity?: APIIdentityData;
  secureNote?: APISecureNoteData;
  favorite: boolean;
  organizationId: string | null;
  folderId: string | null;
  collectionIds: string[] | null;
  key: string | null;
  fields: APIField[] | null;
  reprompt: number;
  edit: boolean;
  viewPassword: boolean;
  organizationUseTotp: boolean;
  deletedDate: string | null;
  revisionDate: string;
  creationDate: string;
  passwordHistory: APIPasswordHistory[] | null;
  attachments: APIAttachment[] | null;
}

/** Password history entry */
export interface APIPasswordHistory {
  lastUsedDate: string;
  password: string;
}

/** API attachment structure */
export interface APIAttachment {
  id: string;
  url: string | null;
  size: number;
  sizeName: string;
  fileName: string;
}

/** API folder structure */
export interface APIFolder {
  id: string;
  name: string;
}

/** API collection structure */
export interface APICollection {
  id: string;
  organizationId: string;
  name: string;
  externalId: string | null;
  readOnly: boolean;
}

/** API organization structure */
export interface APIOrganization {
  id: string;
  name: string;
  usePolicies: boolean;
  useSso: boolean;
  useKeyConnector: boolean;
  useScim: boolean;
  useCustomPermissions: boolean;
  useResetPassword: boolean;
  seats: number;
  maxCollections: number;
  maxStorageGb: number | null;
  status: OrganizationUserStatus;
  type: OrganizationUserType;
  enabled: boolean;
  hasPublicAndPrivateKeys: boolean;
}

/** API profile structure */
export interface APIProfile {
  id: string;
  name: string | null;
  email: string;
  emailVerified: boolean;
  masterPasswordHint: string | null;
  culture: string;
  twoFactorEnabled: boolean;
  twoFactorWarning: boolean;
  key: string;
  privateKey: string | null;
  securityStamp: string | null;
  organizations: APIOrganization[];
  providers: unknown[];
  providerOrganizations: unknown[];
  forcePasswordReset: boolean;
  usesKeyConnector: boolean;
}

/** API domain structure */
export interface APIDomain {
  type: number;
  domain: string;
  autofillOnPageLoad: boolean;
  matchingDomains: unknown[] | null;
}

/** API sync response */
export interface APISyncResponse {
  profile: APIProfile;
  folders: APIFolder[];
  collections: APICollection[];
  ciphers: APICipher[];
  domains: APIDomain[];
  ssoExternalId: string | null;
  userExternalId: string | null;
  hasPublicAndPrivateKeys: boolean;
  organizationId: string | null;
}

// ============================================================================
// Authentication Types
// ============================================================================

/** Prelogin response containing KDF parameters */
export interface PreloginResponse {
  kdf: number;
  kdfIterations: number;
  kdfMemory: number | null;
  kdfParallelism: number | null;
}

/** Authentication token response */
export interface AuthTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  refresh_token?: string;
  scope?: string;
}

/** Login credentials */
export interface LoginCredentials {
  username: string;
  password: string;
  /** Optional 2FA code if 2FA is enabled */
  twoFactorCode?: string;
  /** Optional 2FA method/provider */
  twoFactorProvider?: TwoFactorMethod;
}

/** Client authentication state */
export interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: number;
  masterKey: Buffer | null;
  symmetricKey: Buffer | null;
  macKey: Buffer | null;
}

// ============================================================================
// Client Options Types
// ============================================================================

/** Client initialization options */
export interface VaultClientOptions {
  /** Base URL of the Vaultwarden/Bitwarden server */
  baseUrl: string;
  /** Device type identifier (default: 8 for Android, used for API compatibility) */
  deviceType?: number;
  /** Device name shown in device list */
  deviceName?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Number of retry attempts for failed requests (default: 3) */
  retries?: number;
  /** Enable debug logging */
  debug?: boolean;
}

/** Password generation options */
export interface PasswordGenerationOptions {
  length?: number;
  uppercase?: boolean;
  lowercase?: boolean;
  numbers?: boolean;
  special?: boolean;
  minNumbers?: number;
  minSpecial?: number;
  ambiguous?: boolean;
}

/** Passphrase generation options */
export interface PassphraseGenerationOptions {
  numWords?: number;
  wordSeparator?: string;
  capitalize?: boolean;
  includeNumber?: boolean;
}

// ============================================================================
// Event Types
// ============================================================================

/** Client event map for type-safe event handling */
export interface ClientEvents {
  [event: string | symbol]: unknown[];
  ready: [];
  login: [token: AuthTokenResponse];
  logout: [];
  error: [error: Error];
  sync: [];
  cipherCreate: [cipher: unknown];
  cipherUpdate: [cipher: unknown];
  cipherDelete: [id: string];
  folderCreate: [folder: unknown];
  folderUpdate: [folder: unknown];
  folderDelete: [id: string];
}

/** Event names */
export type ClientEventName = keyof ClientEvents;

// ============================================================================
// Structure Data Types (decrypted/formatted)
// ============================================================================

/** Login URI structure for internal use */
export interface LoginUri {
  uri: string;
  match: UriMatchType | null;
}

/** Cipher field structure for internal use */
export interface CipherField {
  name: string;
  value: string;
  type: FieldType;
  linkedId: number | null;
}

/** Password history entry for internal use */
export interface PasswordHistory {
  lastUsedDate: Date;
  password: string;
}

/** Attachment structure for internal use */
export interface Attachment {
  id: string;
  url: string | null;
  size: number;
  sizeName: string;
  fileName: string;
}

// ============================================================================
// Utility Types
// ============================================================================

/** Nullable type helper */
export type Nullable<T> = T | null;

/** Partially required type - makes specific keys required */
export type PartiallyRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/** JSON-serializable value */
export type JSONValue = string | number | boolean | null | { [key: string]: JSONValue } | JSONValue[];

/** Resolvable types for managers */
export type Resolvable<T, K extends keyof T> = T | T[K];

/** Constructor type */
export type Constructor<T = {}> = new (...args: unknown[]) => T;
