# chrome-storage-plus

[![npm version](https://img.shields.io/npm/v/chrome-storage-plus)](https://npmjs.com/package/chrome-storage-plus)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Discord](https://img.shields.io/badge/Discord-Zovo-blueviolet.svg?logo=discord)](https://discord.gg/zovo)
[![Website](https://img.shields.io/badge/Website-zovo.one-blue)](https://zovo.one)
[![GitHub Stars](https://img.shields.io/github/stars/theluckystrike/chrome-storage-plus?style=social)](https://github.com/theluckystrike/chrome-storage-plus)

> Type-safe Chrome extension storage wrapper with schema validation, data migrations, reactive subscriptions, quota management, and import/export -- zero dependencies.

Part of the [Zovo](https://zovo.one) developer tools family.

## Install

```bash
npm install chrome-storage-plus
```

## Usage

```typescript
import { createStorage } from 'chrome-storage-plus';

const storage = createStorage('local'); // or 'sync' or 'session'

// Type-safe get/set
await storage.set('theme', 'dark');
const theme = await storage.get<string>('theme'); // string | undefined
const theme2 = await storage.get('theme', 'light'); // string (with default)

// Check existence
if (await storage.has('theme')) {
  console.log('Theme key exists');
}

// Batch operations
await storage.setMany({ theme: 'dark', fontSize: 14 });
const values = await storage.getMany(['theme', 'fontSize']);

// Remove and clear
await storage.remove('theme');
await storage.remove(['theme', 'fontSize']);
await storage.clear();
```

### Schema Validation

```typescript
import { defineSchema } from 'chrome-storage-plus';

const settingsSchema = defineSchema({
  theme: { type: 'string', required: true, default: 'light' },
  fontSize: { type: 'number', default: 14 },
  notifications: { type: 'boolean', default: true },
});

const { valid, errors } = settingsSchema.validate(data);
const withDefaults = settingsSchema.applyDefaults(data);
```

### Data Migrations

```typescript
import { createStorage, MigrationManager } from 'chrome-storage-plus';

const storage = createStorage('local');
const migrations = new MigrationManager(storage, [
  {
    version: 1,
    description: 'Rename settings key',
    up: (data) => {
      data.preferences = data.settings;
      delete data.settings;
      return data;
    },
  },
]);

const result = await migrations.migrate();
// { migrated: true, from: 0, to: 1, applied: ['v1: Rename settings key'] }
```

### Reactive Subscriptions

```typescript
import { ReactiveStorage } from 'chrome-storage-plus';

const reactive = new ReactiveStorage('local');

// Subscribe to a specific key
const unsubscribe = reactive.onChange<string>('theme', (newValue, oldValue) => {
  console.log(`Theme changed: ${oldValue} -> ${newValue}`);
});

// Subscribe to all changes in a storage area
const unsub = reactive.onAnyChange((changes) => {
  console.log('Storage changed:', changes);
});

// Set an error handler for callback failures
reactive.onError((error, key, operation) => {
  console.error(`Error in ${operation} for key "${key}":`, error);
});

// Clean up
unsubscribe();
reactive.dispose();
```

### Quota Management

```typescript
import { QuotaManager } from 'chrome-storage-plus';

const quota = new QuotaManager('local');

const { bytesUsed, percentUsed, bytesRemaining } = await quota.getQuota();
console.log(`Using ${percentUsed}% of storage`);

if (await quota.wouldExceedQuota('bigData', largeObject)) {
  alert('Not enough storage space!');
}

const keysBySize = await quota.getKeysBySize(); // sorted largest first
```

### Import / Export

```typescript
import { StorageIO } from 'chrome-storage-plus';

const io = new StorageIO('local');

// Export to JSON string
const json = await io.exportData();

// Export as a downloadable file
await io.exportToFile('backup.json');

// Import from JSON string (merges by default, pass true to overwrite)
const { imported } = await io.importData(jsonString);
const { imported: count } = await io.importData(jsonString, true); // overwrite

// Import from a File object (e.g., from <input type="file">)
const { imported: n } = await io.importFromFile(file);
```

## API

### `createStorage(area?)`

Factory function that returns a `ChromeStorage` instance.

- `area` -- `'local'` | `'sync'` | `'session'` (default: `'local'`)

### `ChromeStorage`

| Method | Description |
|--------|-------------|
| `get<T>(key, defaultValue?)` | Get a typed value by key. Returns `T \| undefined` or `T` when a default is provided. |
| `getMany<T>(keys)` | Get multiple values. Returns `Partial<T>`. |
| `set<T>(key, value)` | Set a typed value by key. |
| `setMany(items)` | Set multiple key-value pairs at once. |
| `remove(key)` | Remove one key or an array of keys. |
| `clear()` | Remove all data in the storage area. |
| `getAll()` | Get every key-value pair in the storage area. |
| `has(key)` | Check whether a key exists. Returns `boolean`. |
| `getAreaName()` | Get the storage area name (`'local'`, `'sync'`, or `'session'`). |

### `defineSchema(schema)` / `SchemaValidator`

| Method | Description |
|--------|-------------|
| `validate(data)` | Validate data against the schema. Returns `{ valid: boolean, errors: ValidationError[] }`. |
| `applyDefaults(data)` | Return a copy of `data` with missing fields filled from schema defaults. |

Schema fields support `type` (`'string'` | `'number'` | `'boolean'` | `'object'` | `'array'`), `required`, `default`, and a custom `validate` function.

### `MigrationManager`

| Method | Description |
|--------|-------------|
| `constructor(storage, migrations?)` | Create a manager with an array of versioned migrations. |
| `addMigration(migration)` | Add a migration. Returns `this` for chaining. |
| `getCurrentVersion()` | Get the stored schema version number. |
| `getLatestVersion()` | Get the highest migration version. |
| `migrate()` | Run all pending migrations. Returns `{ migrated, from, to, applied }`. |

Each `Migration` has `version: number`, `description: string`, and `up: (data) => data`.

### `ReactiveStorage`

| Method | Description |
|--------|-------------|
| `constructor(area?)` | Create a reactive storage listener for the given area. |
| `onChange<T>(key, callback)` | Subscribe to changes on a specific key. Returns an unsubscribe function. |
| `onAnyChange(callback)` | Subscribe to all changes in the storage area. Returns an unsubscribe function. |
| `onError(callback)` | Set a global error handler for subscription callback failures. |
| `dispose()` | Remove all subscriptions and stop listening. |

### `QuotaManager`

| Method | Description |
|--------|-------------|
| `constructor(area?)` | Create a quota manager for the given area. |
| `getQuota()` | Returns `{ bytesUsed, bytesTotal, percentUsed, bytesRemaining }`. |
| `getKeySize(key)` | Get the size of a specific key in bytes. |
| `wouldExceedQuota(key, value)` | Check if storing a value would exceed the quota. |
| `getKeysBySize()` | Get all keys sorted by size (largest first). Returns `{ key, bytes }[]`. |

### `StorageIO`

| Method | Description |
|--------|-------------|
| `constructor(area?)` | Create an I/O manager for the given area. |
| `exportData()` | Export all storage data as a JSON string. |
| `exportToFile(filename?)` | Export data and trigger a browser file download. |
| `importData(json, overwrite?)` | Import from a JSON string. Merges by default. Returns `{ imported }`. |
| `importFromFile(file, overwrite?)` | Import from a `File` object. Returns `{ imported }`. |

### Error Classes

- `ChromeStorageError` -- thrown by `ChromeStorage` (codes: `CHROME_API_UNAVAILABLE`, `OPERATION_FAILED`, `INVALID_KEY`, `SERIALIZATION_FAILED`)
- `ReactiveStorageError` -- thrown by `ReactiveStorage` (codes: `CHROME_API_UNAVAILABLE`, `CALLBACK_ERROR`, `INVALID_KEY`)
- `StorageIOError` -- thrown by `StorageIO` (codes: `JSON_PARSE_FAILED`, `INVALID_DATA_TYPE`, `CHROME_STORAGE_ERROR`, `FILE_READ_ERROR`)

## License

MIT

## See Also

### Related Zovo Repositories

- [chrome-extension-core](https://github.com/theluckystrike/chrome-extension-core) - Essential utilities for Chrome extension development
- [webext-messenger](https://github.com/theluckystrike/webext-messenger) - Type-safe messaging between extension contexts
- [ext-background-jobs](https://github.com/theluckystrike/ext-background-jobs) - Background job scheduler
- [chrome-devtools-kit](https://github.com/theluckystrike/chrome-devtools-kit) - Build custom DevTools panels
- [chrome-extension-starter-mv3](https://github.com/theluckystrike/chrome-extension-starter-mv3) - Production-ready Chrome extension starter

### Zovo Chrome Extensions

- [Zovo Tab Manager](https://chrome.google.com/webstore/detail/zovo-tab-manager) - Manage tabs efficiently
- [Zovo Focus](https://chrome.google.com/webstore/detail/zovo-focus) - Block distractions

Visit [zovo.one](https://zovo.one) for more information.

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

Built by [Zovo](https://zovo.one)
