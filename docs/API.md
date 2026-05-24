# API Reference

Complete API documentation for Vaultwarden Client.

## Table of Contents

- [VaultwardenClient](#vaultwardenclient)
- [CipherManager](#ciphermanager)
- [FolderManager](#foldermanager)
- [OrganizationManager](#organizationmanager)
- [CollectionManager](#collectionmanager)
- [Structures](#structures)
- [Collections](#collections)
- [Errors](#errors)
- [Utilities](#utilities)

---

## VaultwardenClient

The main entry point for the SDK.

### Constructor

```typescript
new VaultwardenClient(options: VaultClientOptions)
```

#### VaultClientOptions

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `baseUrl` | `string` | ✅ | - | Server URL (e.g., `https://vault.example.com`) |
| `deviceName` | `string` | ❌ | `'vaultwarden.js'` | Device identifier |
| `deviceType` | `number` | ❌ | `8` | Device type constant |
| `timeout` | `number` | ❌ | `30000` | Request timeout (ms) |
| `maxRetries` | `number` | ❌ | `3` | Max retry attempts |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `ciphers` | `CipherManager` | Cipher operations |
| `folders` | `FolderManager` | Folder operations |
| `organizations` | `OrganizationManager` | Organization operations |
| `collections` | `CollectionManager` | Collection operations |
| `isReady` | `boolean` | Whether client is authenticated |
| `uptime` | `number` | Time since ready (ms) |

### Methods

#### login(credentials): Promise&lt;AuthTokenResponse&gt;

Authenticate with the server.

```typescript
await client.login({
  username: 'user@example.com',
  password: 'masterpassword',
  twoFactorCode?: '123456',
  twoFactorProvider?: 0,
});
```

#### logout(): void

Clear authentication and caches.

```typescript
client.logout();
```

#### sync(): Promise&lt;void&gt;

Sync all data from server.

```typescript
await client.sync();
```

---

## CipherManager

Manages password ciphers (logins, cards, notes, identities).

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `cache` | `EntityCache<Cipher>` | Cache of all ciphers |
| `logins` | `Collection<string, LoginCipher>` | Login ciphers only |
| `cards` | `Collection<string, CardCipher>` | Card ciphers only |
| `notes` | `Collection<string, SecureNoteCipher>` | Note ciphers only |
| `identities` | `Collection<string, IdentityCipher>` | Identity ciphers only |
| `favorites` | `Collection<string, Cipher>` | Favorite ciphers |
| `trash` | `Collection<string, Cipher>` | Deleted ciphers |

### Methods

#### createLogin(data): Promise&lt;LoginCipher&gt;

Create a login cipher.

```typescript
const login = await client.ciphers.createLogin({
  name: 'GitHub',
  username: 'myuser',
  password: 'securepassword',
  uri?: 'https://github.com',
  uris?: [{ uri: 'https://github.com', match: 0 }],
  totp?: 'otpauth://...',
  notes?: 'My GitHub account',
  folderId?: 'folder-uuid',
  favorite?: true,
  organizationId?: 'org-uuid',
  collectionIds?: ['collection-uuid'],
});
```

#### createCard(data): Promise&lt;CardCipher&gt;

Create a card cipher.

```typescript
const card = await client.ciphers.createCard({
  name: 'Personal Visa',
  cardholderName?: 'John Doe',
  brand?: 'Visa',
  number?: '4111111111111111',
  expMonth?: '12',
  expYear?: '2027',
  code?: '123',
  notes?: 'Personal credit card',
  folderId?: 'folder-uuid',
  favorite?: false,
});
```

#### createSecureNote(data): Promise&lt;SecureNoteCipher&gt;

Create a secure note.

```typescript
const note = await client.ciphers.createSecureNote({
  name: 'WiFi Password',
  content: 'Network: HomeWiFi_5G\nPassword: ...',
  folderId?: 'folder-uuid',
  favorite?: false,
});
```

#### createIdentity(data): Promise&lt;IdentityCipher&gt;

Create an identity cipher.

```typescript
const identity = await client.ciphers.createIdentity({
  name: 'Personal Identity',
  title?: 'Mr',
  firstName?: 'John',
  middleName?: 'Robert',
  lastName?: 'Doe',
  address1?: '123 Main St',
  address2?: 'Apt 4B',
  address3?: 'Building C',
  city?: 'New York',
  state?: 'NY',
  postalCode?: '10001',
  country?: 'US',
  company?: 'ACME Corp',
  email?: 'john@example.com',
  phone?: '+1 (555) 123-4567',
  ssn?: '123-45-6789',
  username?: 'johndoe',
  passportNumber?: 'A12345678',
  licenseNumber?: 'D12345678',
  notes?: 'Personal information',
  folderId?: 'folder-uuid',
  favorite?: false,
});
```

#### delete(resolvable): Promise&lt;void&gt;

Delete a cipher.

```typescript
// By ID
await client.ciphers.delete('cipher-uuid');

// By cipher object
const cipher = client.ciphers.cache.get('uuid');
await client.ciphers.delete(cipher);
```

#### sync(): Promise&lt;this&gt;

Sync ciphers from server.

```typescript
await client.ciphers.sync();
```

#### fetch(id): Promise&lt;Cipher | null&gt;

Fetch a cipher by ID (syncs first).

```typescript
const cipher = await client.ciphers.fetch('uuid');
```

#### search(query): Collection&lt;string, Cipher&gt;

Search ciphers by name/notes.

```typescript
const results = client.ciphers.search('github');
```

#### findByDomain(domain): Collection&lt;string, LoginCipher&gt;

Find logins by domain.

```typescript
const logins = client.ciphers.findByDomain('github.com');
```

#### findByFolder(folderId): Collection&lt;string, Cipher&gt;

Find ciphers in a folder.

```typescript
const ciphers = client.ciphers.findByFolder('folder-uuid');
```

---

## FolderManager

Manages folders for organizing ciphers.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `cache` | `EntityCache<FolderStructure>` | Cache of all folders |
| `defaultFolder` | `object` | The "No Folder" pseudo-folder |
| `totalCiphers` | `number` | Total ciphers across all folders |
| `sorted` | `Collection<string, FolderStructure>` | Folders sorted by name |
| `sortedBySize` | `Collection<string, FolderStructure>` | Folders sorted by cipher count |

### Methods

#### create(name): Promise&lt;FolderStructure&gt;

Create a new folder.

```typescript
const folder = await client.folders.create('Work Accounts');
```

#### update(id, name): Promise&lt;FolderStructure&gt;

Rename a folder.

```typescript
await client.folders.update('folder-uuid', 'New Name');
```

#### delete(id): Promise&lt;void&gt;

Delete a folder.

```typescript
await client.folders.delete('folder-uuid');
```

#### sync(): Promise&lt;this&gt;

Sync folders from server.

```typescript
await client.folders.sync();
```

#### findByName(name): FolderStructure | undefined

Find folder by exact name (case-insensitive).

```typescript
const folder = client.folders.findByName('Work');
```

---

## OrganizationManager

Manages organizations (shared vaults).

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `cache` | `EntityCache<OrganizationStructure>` | Cache of organizations |

### Methods

#### sync(): Promise&lt;this&gt;

Sync organizations from server.

```typescript
await client.organizations.sync();
```

---

## CollectionManager

Manages collections within organizations.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `cache` | `EntityCache<CollectionStructure>` | Cache of all collections |
| `writable` | `Collection<string, CollectionStructure>` | Writable collections |
| `readOnly` | `Collection<string, CollectionStructure>` | Read-only collections |
| `totalCiphers` | `number` | Total ciphers across all collections |

### Methods

#### create(data): Promise&lt;CollectionStructure&gt;

Create a collection.

```typescript
const collection = await client.collections.create({
  name: 'Team Passwords',
  organizationId: 'org-uuid',
  externalId?: 'external-id',
});
```

#### update(id, data): Promise&lt;CollectionStructure&gt;

Update a collection.

```typescript
await client.collections.update('collection-uuid', {
  name: 'New Name',
  externalId: 'new-external-id',
});
```

#### delete(id): Promise&lt;void&gt;

Delete a collection.

```typescript
await client.collections.delete('collection-uuid');
```

#### sync(): Promise&lt;this&gt;

Sync collections from server.

```typescript
await client.collections.sync();
```

#### forOrganization(orgId): Collection&lt;string, CollectionStructure&gt;

Get collections for an organization.

```typescript
const collections = client.collections.forOrganization('org-uuid');
```

#### findByName(name): CollectionStructure | undefined

Find collection by name.

```typescript
const collection = client.collections.findByName('Team Passwords');
```

---

## Structures

### BaseCipher

Base class for all cipher types.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique identifier |
| `name` | `string` | Cipher name |
| `notes` | `string \| null` | Notes |
| `favorite` | `boolean` | Is favorite |
| `folderId` | `string \| null` | Folder ID |
| `organizationId` | `string \| null` | Organization ID |
| `collectionIds` | `string[] \| null` | Collection IDs |
| `isDeleted` | `boolean` | In trash |
| `createdAt` | `Date` | Creation date |
| `updatedAt` | `Date` | Last update |
| `revisionDate` | `Date` | Last revision |
| `folder` | `FolderStructure \| null` | Parent folder |
| `organization` | `OrganizationStructure \| null` | Organization |
| `collections` | `Collection<string, CollectionStructure>` | Collections |

#### Methods

##### update(data): Promise&lt;Cipher&gt;

Update cipher data.

```typescript
await cipher.update({ name: 'New Name' });
```

##### delete(): Promise&lt;void&gt;

Delete the cipher.

```typescript
await cipher.delete();
```

##### softDelete(): Promise&lt;void&gt;

Move to trash.

```typescript
await cipher.softDelete();
```

##### restore(): Promise&lt;void&gt;

Restore from trash.

```typescript
await cipher.restore();
```

##### setFavorite(favorite): Promise&lt;void&gt;

Set favorite status.

```typescript
await cipher.setFavorite(true);
```

##### moveToFolder(folderId): Promise&lt;void&gt;

Move to folder.

```typescript
await cipher.moveToFolder('folder-uuid');
```

### LoginCipher

Extends `BaseCipher`.

#### Additional Properties

| Property | Type | Description |
|----------|------|-------------|
| `type` | `CipherType.Login` | Type identifier |
| `username` | `string \| null` | Username |
| `password` | `string \| null` | Password |
| `domain` | `string \| null` | Primary domain |
| `uris` | `{ uri: string; match?: number }[]` | URIs with match types |
| `totp` | `string \| null` | TOTP secret |

### CardCipher

Extends `BaseCipher`.

#### Additional Properties

| Property | Type | Description |
|----------|------|-------------|
| `type` | `CipherType.Card` | Type identifier |
| `cardholderName` | `string \| null` | Cardholder name |
| `brand` | `string \| null` | Card brand (Visa, Mastercard, etc.) |
| `number` | `string \| null` | Card number |
| `expMonth` | `string \| null` | Expiration month (MM) |
| `expYear` | `string \| null` | Expiration year (YYYY) |
| `code` | `string \| null` | Security code (CVV) |

### SecureNoteCipher

Extends `BaseCipher`.

#### Additional Properties

| Property | Type | Description |
|----------|------|-------------|
| `type` | `CipherType.SecureNote` | Type identifier |
| `content` | `string` | Note content |

### IdentityCipher

Extends `BaseCipher`.

#### Additional Properties

| Property | Type | Description |
|----------|------|-------------|
| `type` | `CipherType.Identity` | Type identifier |
| `title` | `string \| null` | Title (Mr, Ms, Dr, etc.) |
| `firstName` | `string \| null` | First name |
| `middleName` | `string \| null` | Middle name |
| `lastName` | `string \| null` | Last name |
| `address1` | `string \| null` | Address line 1 |
| `address2` | `string \| null` | Address line 2 |
| `address3` | `string \| null` | Address line 3 |
| `city` | `string \| null` | City |
| `state` | `string \| null` | State/Province |
| `postalCode` | `string \| null` | Postal/ZIP code |
| `country` | `string \| null` | Country |
| `company` | `string \| null` | Company |
| `email` | `string \| null` | Email |
| `phone` | `string \| null` | Phone number |
| `ssn` | `string \| null` | Social Security Number |
| `username` | `string \| null` | Username |
| `passportNumber` | `string \| null` | Passport number |
| `licenseNumber` | `string \| null` | Driver's license |

### FolderStructure

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Folder ID |
| `name` | `string` | Folder name |
| `size` | `number` | Number of ciphers |
| `isEmpty` | `boolean` | Whether folder is empty |
| `ciphers` | `Collection<string, Cipher>` | Ciphers in folder |

#### Methods

##### update(data): Promise&lt;FolderStructure&gt;

Update folder.

```typescript
await folder.update({ name: 'New Name' });
```

##### delete(): Promise&lt;void&gt;

Delete folder.

```typescript
await folder.delete();
```

##### rename(name): Promise&lt;FolderStructure&gt;

Rename folder.

```typescript
await folder.rename('New Name');
```

##### addCipher(cipherId): Promise&lt;void&gt;

Add cipher to folder.

```typescript
await folder.addCipher('cipher-uuid');
```

##### removeCipher(cipherId): Promise&lt;void&gt;

Remove cipher from folder.

```typescript
await folder.removeCipher('cipher-uuid');
```

---

## Collections

### Collection&lt;K, V&gt;

Enhanced Map with utility methods.

#### Methods

##### first(): V | undefined

Get first value.

##### last(): V | undefined

Get last value.

##### random(): V | undefined

Get random value.

##### randomMany(count): V[]

Get multiple random values.

##### filter(predicate): Collection&lt;K, V&gt;

Filter by predicate.

```typescript
const favorites = client.ciphers.cache.filter(c => c.favorite);
```

##### find(predicate): V | undefined

Find first matching value.

```typescript
const github = client.ciphers.cache.find(c => c.name === 'GitHub');
```

##### map(fn): T[]

Map to array.

```typescript
const names = client.ciphers.cache.map(c => c.name);
```

##### sort(compareFn): Collection&lt;K, V&gt;

Sort values.

```typescript
const sorted = client.ciphers.cache.sort((a, b) => a.name.localeCompare(b.name));
```

##### reduce(fn, initial): T

Reduce values.

```typescript
const total = client.ciphers.cache.reduce((sum, c) => sum + c.size, 0);
```

---

## Errors

### Error Hierarchy

```
VaultwardenError (base)
├── AuthenticationError
├── APIError
├── ValidationError
├── PermissionError
├── NotFoundError
├── RateLimitError
├── TimeoutError
├── CryptoError
└── StateError
```

### VaultwardenError

Base error class.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `code` | `string` | Error code |
| `message` | `string` | Error message |
| `statusCode` | `number?` | HTTP status code |
| `context` | `Record<string, unknown>?` | Additional context |

### AuthenticationError

Invalid credentials or authentication required.

```typescript
try {
  await client.login({ username, password });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.log('Invalid credentials');
  }
}
```

### NotFoundError

Resource not found.

```typescript
try {
  await client.ciphers.fetch('nonexistent-id');
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log('Cipher not found');
  }
}
```

### RateLimitError

Rate limit exceeded.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `retryAfter` | `number` | Seconds until retry |

### TimeoutError

Request timed out.

---

## Utilities

### generatePassword(options): { password: string; entropy: number }

Generate a secure random password.

```typescript
const { password, entropy } = generatePassword({
  length: 20,
  uppercase: true,
  lowercase: true,
  numbers: true,
  special: true,
  minNumbers: 2,
  minSpecial: 1,
  ambiguous: false,
});
```

#### PasswordGenerationOptions

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `length` | `number` | `16` | Password length |
| `uppercase` | `boolean` | `true` | Include uppercase letters |
| `lowercase` | `boolean` | `true` | Include lowercase letters |
| `numbers` | `boolean` | `true` | Include numbers |
| `special` | `boolean` | `true` | Include special characters |
| `minNumbers` | `number` | `1` | Minimum numbers required |
| `minSpecial` | `number` | `0` | Minimum special chars required |
| `ambiguous` | `boolean` | `false` | Exclude ambiguous chars (0, O, 1, l) |

### generatePassphrase(options): { passphrase: string; wordCount: number }

Generate a memorable passphrase.

```typescript
const { passphrase, wordCount } = generatePassphrase({
  numWords: 5,
  wordSeparator: '-',
  capitalize: true,
  includeNumber: true,
});
// Result: "Blue-Tiger-Happy-Cloud-42"
```

#### PassphraseGenerationOptions

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `numWords` | `number` | `4` | Number of words |
| `wordSeparator` | `string` | `'-'` | Word separator |
| `capitalize` | `boolean` | `true` | Capitalize first letter |
| `includeNumber` | `boolean` | `false` | Append random number |

### Collection Utility Methods

#### firstKey(): K | undefined

Get first key.

#### lastKey(): K | undefined

Get last key.

#### randomKey(): K | undefined

Get random key.

#### findKey(predicate): K | undefined

Find key by predicate.

```typescript
const id = client.ciphers.cache.findKey(c => c.name === 'GitHub');
```

#### some(predicate): boolean

Check if some values match.

```typescript
const hasFavorites = client.ciphers.cache.some(c => c.favorite);
```

#### every(predicate): boolean

Check if all values match.

```typescript
const allFavorites = client.ciphers.cache.every(c => c.favorite);
```

#### tap(fn): this

Execute function and return collection.

```typescript
client.ciphers.cache
  .filter(c => c.favorite)
  .tap(c => console.log(`Found ${c.size} favorites`))
  .map(c => c.name);
```

#### toJSON(): Record&lt;K, V&gt;

Convert to plain object.

```typescript
const obj = client.ciphers.cache.toJSON();
```
