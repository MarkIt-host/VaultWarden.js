# Migration Guide

## From 2.x to 3.0

Version 3.0 is a complete rewrite with a new object-oriented architecture inspired by discord.js. This guide helps you migrate from the old API.

### Key Changes

- **Object-Oriented Design**: Moved from functional API to Manager/Structure pattern
- **Event-Driven**: Added typed EventEmitter for real-time updates
- **Smart Caching**: Automatic caching with LRU eviction and TTL
- **Better Type Safety**: Full TypeScript support with strict mode
- **New Login API**: Credentials object instead of positional arguments

## Breaking Changes

### Client Initialization

**Before (2.x):**
```typescript
import { BitwardenClient } from 'vaultwarden.js';

const client = new BitwardenClient('https://vault.example.com');
await client.authenticate('user@example.com', 'password');
```

**After (3.0):**
```typescript
import { VaultwardenClient } from 'vaultwarden.js';

const client = new VaultwardenClient({
  baseUrl: 'https://vault.example.com',
  deviceName: 'MyApp',
});

await client.login({
  username: 'user@example.com',
  password: 'password',
});

// Must sync to populate cache
await client.sync();
```

### Accessing Items

**Before (2.x):**
```typescript
// Direct API calls
const items = await client.getItems();
const passwords = items.filter(i => i.type === 'login');
```

**After (3.0):**
```typescript
// From cache after sync
await client.sync();

// Access cached data
const logins = client.ciphers.logins;
const passwords = client.ciphers.cache.filter(c => c.type === CipherType.Login);
```

### Creating Items

**Before (2.x):**
```typescript
await client.createItem({
  type: 'login',
  name: 'GitHub',
  login: {
    username: 'myuser',
    password: 'secret',
  },
});
```

**After (3.0):**
```typescript
// Type-specific methods
await client.ciphers.createLogin({
  name: 'GitHub',
  username: 'myuser',
  password: 'secret',
});

// Or use convenience method on client
await client.createLogin({
  name: 'GitHub',
  username: 'myuser',
  password: 'secret',
});
```

### Updating Items

**Before (2.x):**
```typescript
await client.updateItem(itemId, { name: 'New Name' });
```

**After (3.0):**
```typescript
// Get from cache
const cipher = client.ciphers.cache.get(itemId);
if (cipher) {
  await cipher.update({ name: 'New Name' });
}
```

### Deleting Items

**Before (2.x):**
```typescript
await client.deleteItem(itemId);
```

**After (3.0):**
```typescript
// By ID
await client.ciphers.delete(itemId);

// Or by object
const cipher = client.ciphers.cache.get(itemId);
if (cipher) {
  await cipher.delete();
}
```

### Folders

**Before (2.x):**
```typescript
await client.createFolder('Work');
const folders = await client.getFolders();
```

**After (3.0):**
```typescript
await client.folders.create('Work');

// Sync to populate cache
await client.folders.sync();

// Access from cache
for (const [, folder] of client.folders.cache) {
  console.log(folder.name);
}
```

## Feature Comparison

| Feature | 2.x | 3.0 |
|---------|-----|-----|
| Authentication | `authenticate(user, pass)` | `login({ username, password })` |
| Get items | `getItems()` | `ciphers.cache` (after sync) |
| Create login | `createItem({ type: 'login', ... })` | `ciphers.createLogin({ ... })` |
| Update item | `updateItem(id, data)` | `cipher.update(data)` |
| Delete item | `deleteItem(id)` | `ciphers.delete(id)` or `cipher.delete()` |
| Folders | `createFolder(name)` | `folders.create(name)` |
| Search | Manual filtering | `ciphers.search(query)` |
| Events | ❌ | ✅ Full EventEmitter |
| Caching | ❌ | ✅ LRU with TTL |
| Type Safety | Basic | Strict TypeScript |

## New Features in 3.0

### Event System

```typescript
client.on('cipherCreate', (cipher) => {
  console.log(`Created: ${cipher.name}`);
});

client.on('sync', () => {
  console.log('Data synced!');
});
```

### Smart Cache

```typescript
// Cache is automatically populated after sync
await client.sync();

// Access without API calls
console.log(client.ciphers.cache.size);

// Filter without re-fetching
const favorites = client.ciphers.cache.filter(c => c.favorite);
```

### Collection Utilities

```typescript
// Like discord.js Collection
const names = client.ciphers.cache.map(c => c.name);
const first = client.ciphers.cache.first();
const random = client.ciphers.cache.random();
```

### Password Generation

```typescript
import { generatePassword, generatePassphrase } from 'vaultwarden.js';

const { password } = generatePassword({ length: 20 });
const { passphrase } = generatePassphrase({ numWords: 5 });
```

## Common Patterns

### Pattern: Check if Ready

```typescript
if (client.isReady) {
  await client.sync();
}
```

### Pattern: Find or Create

```typescript
let folder = client.folders.cache.find(f => f.name === 'Work');
if (!folder) {
  folder = await client.folders.create('Work');
}
```

### Pattern: Batch Operations

```typescript
// Delete all in trash
for (const [, cipher] of client.ciphers.trash) {
  await cipher.delete(); // Permanent delete
}
```

### Pattern: Event Handling

```typescript
client.on('cipherUpdate', (cipher) => {
  console.log(`${cipher.name} was updated`);
});

// Don't forget to clean up
client.off('cipherUpdate', handler);
```

## Troubleshooting

### "Cache is empty after login"

You must call `sync()` after login:

```typescript
await client.login({ username, password });
await client.sync(); // Required!
```

### "Item not found in cache"

Cache only contains synced items. Use `fetch()` to get by ID:

```typescript
// Will sync and find
const cipher = await client.ciphers.fetch('item-id');
```

### "Type errors with strict mode"

Enable strict TypeScript options:

```json
{
  "compilerOptions": {
    "strict": true,
    "exactOptionalPropertyTypes": true
  }
}
```

## Need Help?

- Check the [API Reference](./API.md)
- See [examples/](../examples/) directory
- Open an issue on GitHub
