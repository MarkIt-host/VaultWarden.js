# Vaultwarden Client Architecture

This document describes the architecture and design patterns used in the Vaultwarden Client SDK.

## Table of Contents

- [Overview](#overview)
- [Design Principles](#design-principles)
- [Module Structure](#module-structure)
- [Entity Hierarchy](#entity-hierarchy)
- [Manager Pattern](#manager-pattern)
- [Cache System](#cache-system)
- [Error Handling](#error-handling)
- [REST Layer](#rest-layer)
- [Event System](#event-system)
- [Type Safety](#type-safety)

## Overview

The Vaultwarden Client is designed as a modern, object-oriented SDK following patterns popularized by [discord.js](https://discord.js.org/). It provides a rich, intuitive API for interacting with Vaultwarden/Bitwarden servers.

### Key Architectural Decisions

1. **OOP-First Design**: Entities are represented as classes with properties and methods
2. **Manager Pattern**: Resource operations are grouped into manager classes
3. **Centralized Caching**: All entities are cached and accessible through managers
4. **Type Safety**: Strict TypeScript with no `any` types
5. **Event-Driven**: Built-in event system for reacting to changes
6. **Separation of Concerns**: Clear boundaries between REST, caching, and business logic

## Design Principles

### 1. Rich Object Model

Instead of returning raw API responses, all entities are full JavaScript classes:

```typescript
// Instead of raw JSON:
{ id: '...', name: 'GitHub', login: { username: '...' } }

// You get a rich object:
const login = new LoginCipher(client, data);
login.name;           // Property access
login.domain;         // Computed property
login.maskedPassword; // Helper method
await login.update(); // Instance method
```

### 2. Discord.js Style API

The SDK follows patterns familiar to discord.js users:

```typescript
// Collections with utility methods
const results = client.ciphers.cache.filter(c => c.favorite);
const found = client.ciphers.cache.find(c => c.name === 'GitHub');

// Event-driven
client.on('cipherCreate', (cipher) => console.log(cipher.name));

// Managers for operations
const cipher = await client.ciphers.fetch('id');
await client.ciphers.delete('id');
```

### 3. Type Safety

Full TypeScript support with strict null checks:

```typescript
// All types are inferred
const login: LoginCipher = await client.createLogin({...});

// Generic collections
const ciphers: Collection<string, Cipher> = client.ciphers.cache;

// Type-safe events
client.on('cipherCreate', (cipher: Cipher) => {...});
```

## Module Structure

```
src/
├── cache/           # Caching abstractions
│   ├── BaseCache.ts
│   └── index.ts
├── client/          # Main client
│   ├── VaultwardenClient.ts
│   └── index.ts
├── errors/          # Error classes
│   └── index.ts
├── managers/        # Resource managers
│   ├── BaseManager.ts
│   ├── CipherManager.ts
│   ├── CollectionManager.ts
│   ├── FolderManager.ts
│   ├── OrganizationManager.ts
│   └── index.ts
├── rest/            # REST client
│   └── RESTClient.ts
├── structures/      # Entity classes
│   ├── BaseStructure.ts
│   ├── CardCipher.ts
│   ├── CollectionStructure.ts
│   ├── FolderStructure.ts
│   ├── IdentityCipher.ts
│   ├── LoginCipher.ts
│   ├── OrganizationStructure.ts
│   ├── SecureNoteCipher.ts
│   └── index.ts
├── types/           # TypeScript types
│   └── index.ts
├── utils/           # Utilities
│   ├── Collection.ts
│   ├── crypto.ts
│   ├── encryption.ts
│   ├── EventEmitter.ts
│   └── index.ts
└── index.ts         # Main exports
```

## Entity Hierarchy

```
BaseStructure
├── BaseIdentifiable (adds id)
│   └── BaseUpdatable (adds update/delete)
│       └── BaseCipher (cipher common properties)
│           ├── LoginCipher
│           ├── CardCipher
│           ├── SecureNoteCipher
│           └── IdentityCipher
│       └── FolderStructure
│       └── CollectionStructure
│       └── OrganizationStructure
```

### Base Classes

- **BaseStructure**: Root class, provides `client` reference
- **BaseIdentifiable**: Adds `id` and equality methods
- **BaseUpdatable**: Adds `update()` and `delete()` methods
- **BaseCipher**: Common cipher properties (name, notes, favorite, etc.)

### Specific Entities

- **LoginCipher**: Username/password credentials with URI matching
- **CardCipher**: Payment cards with expiration checking
- **SecureNoteCipher**: Encrypted text with content helpers
- **IdentityCipher**: Personal information with formatted address
- **FolderStructure**: Organization container for ciphers
- **CollectionStructure**: Shared vault group
- **OrganizationStructure**: Shared vault organization

## Manager Pattern

Managers handle CRUD operations for their respective resource types:

### BaseManager

```typescript
abstract class BaseManager {
  protected readonly client: VaultwardenClient;
  protected log(level, message): void;
  protected ensureAuthenticated(): void;
  protected ensureReady(): void;
}
```

### CachedManager

Adds caching capabilities:

```typescript
abstract class CachedManager<K, V> extends BaseManager {
  abstract readonly cache: EntityCache<V>;
  abstract resolve(resolvable): V | null;
  abstract resolveId(resolvable): K | null;
  abstract sync(): Promise<this>;
  async fetch(id): Promise<V | null>;
}
```

### CRUDManager

Adds CRUD operations:

```typescript
abstract class CRUDManager<K, V> extends CachedManager<K, V> {
  abstract create(data): Promise<V>;
  abstract update(id, data): Promise<V>;
  abstract delete(id): Promise<void>;
}
```

### Manager Instances

- **CipherManager**: Ciphers with type-specific create/update methods
- **FolderManager**: Folders with encrypted name handling
- **OrganizationManager**: Organizations with role-based filtering
- **CollectionManager**: Collections within organizations

## Cache System

The `EntityCache` extends `Collection` with entity-specific features:

### Features

- **TTL Support**: Automatic expiration of stale entries
- **Size Limits**: LRU eviction when max size reached
- **Access Tracking**: Hit rates and access counts
- **Change Events**: Subscribe to cache changes

### Usage

```typescript
const cache = new EntityCache<Cipher>({
  ttl: 60000,        // 1 minute TTL
  maxSize: 1000,     // Max 1000 entries
  onChange: (event) => console.log(event.type),
});

cache.set('id', cipher);       // Add/update
cache.get('id');               // Get (updates access time)
cache.find(c => c.favorite);   // Find by predicate
cache.filter(c => c.type === 1); // Filter to new Collection
```

## Error Handling

Custom error hierarchy for proper error handling:

```
VaultwardenError (base)
├── AuthenticationError (401)
├── APIError (HTTP errors, has shouldRetry)
├── ValidationError (input validation)
├── PermissionError (403)
├── NotFoundError (404)
├── RateLimitError (429, has retryAfter)
├── TimeoutError (request timeout)
├── CryptoError (encryption/decryption)
└── StateError (client state issues)
```

### Error Properties

All errors include:
- `message`: Human-readable description
- `code`: Machine-readable error code
- `statusCode`: HTTP status code (if applicable)
- `context`: Additional error context

### Usage

```typescript
try {
  await client.login(credentials);
} catch (error) {
  if (error instanceof AuthenticationError) {
    if (error.code === 'INVALID_CREDENTIALS') {
      // Show invalid credentials message
    } else if (error.code === '2FA_REQUIRED') {
      // Prompt for 2FA code
    }
  }
}
```

## REST Layer

The `RESTClient` handles all HTTP communication:

### Features

- **Authentication**: Automatic token management and refresh
- **Retries**: Exponential backoff for retryable errors
- **Rate Limiting**: Automatic retry after rate limit
- **Timeouts**: Configurable request timeouts
- **Error Normalization**: Converts HTTP errors to typed exceptions

### Architecture

```typescript
class RESTClient {
  // State
  private accessToken: string | null;
  private symmetricKey: Buffer | null;
  
  // Public getters
  get isAuthenticated(): boolean;
  get isReady(): boolean;
  get key(): Buffer | null;
  
  // Auth methods
  async login(credentials): Promise<AuthTokenResponse>;
  logout(): void;
  
  // HTTP methods
  async get(endpoint): Promise<unknown>;
  async post(endpoint, body): Promise<unknown>;
  async put(endpoint, body): Promise<unknown>;
  async delete(endpoint): Promise<void>;
}
```

### Request Flow

1. Check authentication
2. Apply rate limit delay if needed
3. Execute request with timeout
4. Handle errors (retry if appropriate)
5. Parse and return JSON

## Event System

Type-safe EventEmitter for reacting to changes:

### Event Map

```typescript
interface ClientEvents {
  ready: [];
  login: [token: AuthTokenResponse];
  logout: [];
  sync: [];
  cipherCreate: [cipher: Cipher];
  cipherUpdate: [cipher: Cipher];
  cipherDelete: [id: string];
  folderCreate: [folder: FolderStructure];
  folderUpdate: [folder: FolderStructure];
  folderDelete: [id: string];
}
```

### Usage

```typescript
// Subscribe to events
client.on('cipherCreate', (cipher) => {
  console.log('Created:', cipher.name);
});

client.once('ready', () => {
  console.log('Ready!');
});

// Emit events (internal)
client.emit('cipherCreate', newCipher);

// Wait for event
await client.waitFor('ready', 10000);
```

## Type Safety

### Strict TypeScript

- `strict: true` enabled
- `noImplicitAny: true`
- `strictNullChecks: true`
- `exactOptionalPropertyTypes: true`
- `noUncheckedIndexedAccess: true`

### Generic Types

```typescript
// Collection is generic
const ciphers = new Collection<string, Cipher>();

// Managers are generic
class CachedManager<K, V extends { id: K }> extends BaseManager {
  cache: EntityCache<V>;
}

// Events are typed
type ClientEvents = {
  cipherCreate: [cipher: Cipher];
};
```

### Type Exports

All types are exported for consumer use:

```typescript
import {
  type VaultClientOptions,
  type LoginCredentials,
  type Cipher,
  type CipherResolvable,
  CipherType,
  OrganizationUserType,
} from 'vaultwarden.js';
```

## Performance Considerations

### Caching Strategy

- All fetched entities are cached
- Cache can be configured with TTL and size limits
- Manual cache clearing via `sync()`

### Encryption

- Profile key decrypted once during login
- Symmetric key cached for cipher operations
- Encryption/decryption happens transparently

### Memory Management

- `destroy()` method on caches to clean up intervals
- LimitedCollection for memory-constrained environments
- Automatic cleanup of expired entries

## Testing Strategy

### Unit Tests

- Test each module in isolation
- Mock external dependencies (REST client)
- Test error conditions

### Integration Tests

- Test manager interactions
- Test cache behavior
- Test event propagation

### Coverage

- Aim for >80% coverage
- Focus on critical paths (auth, encryption, CRUD)
