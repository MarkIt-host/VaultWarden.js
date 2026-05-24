# Vaultwarden Client

A modern, type-safe, object-oriented TypeScript SDK for Vaultwarden/Bitwarden servers. Inspired by [discord.js](https://discord.js.org/) with a focus on developer experience and comprehensive type safety.

[![npm version](https://img.shields.io/npm/v/vaultwarden.js.svg)](https://www.npmjs.com/package/vaultwarden.js)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3%2B-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/npm/l/vaultwarden.js.svg)](LICENSE)

## Features

-  **Object-Oriented Architecture** - Manager/Structure pattern like discord.js
-  **Full Type Safety** - Strict TypeScript with `exactOptionalPropertyTypes`
-  **Event-Driven** - Typed EventEmitter for real-time updates
-  **Smart Caching** - LRU cache with TTL support for all entities
-  **Complete Encryption** - PBKDF2, AES-256-CBC, HKDF support
-  **Well Tested** - Comprehensive test suite with Vitest
-  **ESM + CJS** - Dual module support

## Installation

```bash
npm install vaultwarden.
```

## Quick Start

```typescript
import { VaultwardenClient } from 'vaultwarden.js';

const client = new VaultwardenClient({
  baseUrl: 'https://vault.example.com',
  deviceName: 'MyApp',
});

// Login
await client.login({
  username: 'user@example.com',
  password: 'masterpassword',
});

// Sync data from server
await client.sync();

// Access your vault
console.log(`You have ${client.ciphers.cache.size} items`);

// Find a specific login
const github = client.ciphers.cache.find(
  (c) => c.name === 'GitHub'
);

if (github) {
  console.log(`Username: ${github.username}`);
  console.log(`Password: ${github.password}`);
}
```

## Authentication

### Login with Password

```typescript
await client.login({
  username: 'user@example.com',
  password: 'masterpassword',
});
```

### Login with 2FA

```typescript
await client.login({
  username: 'user@example.com',
  password: 'masterpassword',
  twoFactorCode: '123456',
  twoFactorProvider: 0, // Authenticator app
});
```

### Available 2FA Methods

| Provider | Value | Description |
|----------|-------|-------------|
| `Authenticator` | `0` | TOTP (Google Authenticator, etc.) |
| `Email` | `1` | Email-based 2FA |
| `Duo` | `2` | Duo Security |
| `Yubikey` | `3` | YubiKey OTP |
| `FIDO2` | `4` | FIDO2 WebAuthn |

## Core Concepts

### Managers

Managers handle CRUD operations and maintain caches:

```typescript
// Ciphers (passwords, cards, notes, identities)
client.ciphers

// Folders
client.folders

// Organizations
client.organizations

// Collections
client.collections
```

### Structures

Structures represent individual vault items:

```typescript
// Cipher types
LoginCipher      // Website passwords
CardCipher       // Credit cards
SecureNoteCipher // Encrypted notes
IdentityCipher   // Personal information

// Other structures
FolderStructure
CollectionStructure
OrganizationStructure
```

### Collections

Enhanced Map with utility methods:

```typescript
// Get all login ciphers
const logins = client.ciphers.logins;

// Filter by predicate
const favorites = client.ciphers.cache.filter(
  (c) => c.favorite
);

// Find by predicate
const github = client.ciphers.cache.find(
  (c) => c.name === 'GitHub'
);

// Map to array
const names = client.ciphers.cache.map((c) => c.name);
```

## Working with Ciphers

### Create a Login

```typescript
const login = await client.ciphers.createLogin({
  name: 'GitHub',
  username: 'myuser',
  password: 'securepassword123',
  uri: 'https://github.com',
  notes: 'My GitHub account',
  favorite: true,
});

console.log(`Created: ${login.name} (${login.id})`);
```

### Create a Card

```typescript
const card = await client.ciphers.createCard({
  name: 'Personal Visa',
  cardholderName: 'John Doe',
  brand: 'Visa',
  number: '4111111111111111',
  expMonth: '12',
  expYear: '2027',
  code: '123',
});
```

### Create a Secure Note

```typescript
const note = await client.ciphers.createSecureNote({
  name: 'WiFi Password',
  content: 'Network: HomeWiFi_5G\nPassword: SuperSecret!',
});
```

### Create an Identity

```typescript
const identity = await client.ciphers.createIdentity({
  name: 'Personal Identity',
  title: 'Mr',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  address1: '123 Main St',
  city: 'New York',
  state: 'NY',
  postalCode: '10001',
  country: 'US',
});
```

### Update and Delete

```typescript
// Update
await login.update({ name: 'GitHub (Personal)' });
await login.setFavorite(false);
await login.moveToFolder(folderId);

// Soft delete (move to trash)
await login.softDelete();

// Restore from trash
await login.restore();

// Permanent delete
await login.delete();
```

## Working with Folders

```typescript
// Create a folder
const folder = await client.folders.create('Work Accounts');

// Update folder
await client.folders.update(folder.id, 'Work Accounts 2024');

// Delete folder
await client.folders.delete(folder.id);

// Get ciphers in folder
const workLogins = client.ciphers.cache.filter(
  (c) => c.folderId === folder.id
);
```

## Searching

```typescript
// Search by name/notes
const results = client.ciphers.search('github');

// Find by domain
const logins = client.ciphers.findByDomain('github.com');

// Find by folder
const folderCiphers = client.ciphers.findByFolder(folderId);

// Filtered accessors
const favorites = client.ciphers.favorites;
const trash = client.ciphers.trash;
```

## Password Generation
git remote add origin https://github.com/MarkIt-host/VaultWarden.js.git
```typescript
import { generatePassword, generatePassphrase } from 'vaultwarden.js';

// Generate strong password
const { password, entropy } = generatePassword({
  length: 20,
  uppercase: true,
  lowercase: true,
  numbers: true,
  special: true,
  minNumbers: 2,
  minSpecial: 1,
  ambiguous: false, // Exclude 0, O, 1, l
});

// Generate memorable passphrase
const { passphrase, wordCount } = generatePassphrase({
  numWords: 5,
  wordSeparator: '-',
  capitalize: true,
  includeNumber: true,
});
// Result: "Blue-Tiger-Happy-Cloud-42"
```

## Events

Listen for real-time updates:

```typescript
client.on('ready', () => {
  console.log('Client is ready!');
});

client.on('sync', () => {
  console.log('Data synced!');
});

client.on('cipherCreate', (cipher) => {
  console.log(`Created: ${cipher.name}`);
});

client.on('cipherUpdate', (cipher) => {
  console.log(`Updated: ${cipher.name}`);
});

client.on('cipherDelete', (id) => {
  console.log(`Deleted cipher: ${id}`);
});

client.on('error', (error) => {
  console.error('Client error:', error);
});
```

### Event Types

| Event | Payload | Description |
|-------|---------|-------------|
| `ready` | - | Client is authenticated and ready |
| `login` | `AuthTokenResponse` | Login successful |
| `logout` | - | Logged out |
| `sync` | - | Data synced from server |
| `cipherCreate` | `Cipher` | New cipher created |
| `cipherUpdate` | `Cipher` | Cipher updated |
| `cipherDelete` | `string` | Cipher deleted (ID) |
| `folderCreate` | `FolderStructure` | New folder created |
| `folderUpdate` | `FolderStructure` | Folder updated |
| `folderDelete` | `string` | Folder deleted (ID) |
| `error` | `Error` | Error occurred |

## Error Handling

```typescript
import {
  VaultwardenError,
  AuthenticationError,
  NotFoundError,
  RateLimitError,
} from 'vaultwarden.js';

try {
  await client.login({ username, password });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Invalid credentials');
  } else if (error instanceof RateLimitError) {
    console.error(`Rate limited. Retry after ${error.retryAfter}s`);
  } else if (error instanceof VaultwardenError) {
    console.error(`Error ${error.code}: ${error.message}`);
  }
}
```

### Error Types

| Error | Description |
|-------|-------------|
| `VaultwardenError` | Base error class |
| `AuthenticationError` | Invalid credentials or 2FA needed |
| `APIError` | API request failed |
| `NotFoundError` | Resource not found |
| `ValidationError` | Invalid input data |
| `PermissionError` | Insufficient permissions |
| `RateLimitError` | Rate limit hit |
| `TimeoutError` | Request timed out |
| `CryptoError` | Encryption/decryption failed |
| `StateError` | Invalid client state |

## Configuration Options

```typescript
const client = new VaultwardenClient({
  // Required
  baseUrl: 'https://vault.example.com',

  // Optional
  deviceName: 'MyApp',      // Default: 'vaultwarden.js'
  deviceType: 8,              // Default: 8 (Windows Desktop)
  timeout: 30000,             // Request timeout in ms
  maxRetries: 3,              // Max retry attempts
});
```

### Device Types

| Type | Value |
|------|-------|
| Android | 0 |
| iOS | 1 |
| Chrome Extension | 2 |
| Firefox Extension | 3 |
| Opera Extension | 4 |
| Edge Extension | 5 |
| Windows Desktop | 8 |
| macOS Desktop | 9 |
| Linux Desktop | 10 |
| Chrome | 11 |
| Safari | 12 |
| Firefox | 16 |

## Testing Script

A CLI script is included for testing:

```bash
# Login and show stats
npx tsx scripts/vault-tester.ts login \
  --url https://vault.example.com \
  --email user@example.com \
  --password pass

# Fill vault with test data
npx tsx scripts/vault-tester.ts fill \
  --url https://vault.example.com \
  --email user@example.com \
  --password pass \
  --count 50 \
  --folder "Test Items"

# List vault contents
npx tsx scripts/vault-tester.ts list \
  --url https://vault.example.com \
  --email user@example.com \
  --password pass

# Delete all items
npx tsx scripts/vault-tester.ts delete \
  --url https://vault.example.com \
  --email user@example.com \
  --password pass \
  --all
```

## API Reference

See [API.md](./docs/API.md) for complete API documentation.

## Examples

See [examples/](./examples/) directory for usage examples:

- [Basic Auth](./examples/basic-auth.ts)
- [Cipher CRUD](./examples/cipher-crud.ts)
- [Folder Management](./examples/folder-management.ts)
- [Organizations](./examples/organizations.ts)
- [Password Generator](./examples/password-generator.ts)

## Migration from 2.x

See [MIGRATION.md](./docs/MIGRATION.md) for migration guide.

## License

MIT © [Marki](https://marki.dev)
