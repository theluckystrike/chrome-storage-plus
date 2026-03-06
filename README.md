# chrome-storage-plus

[![npm version](https://img.shields.io/npm/v/chrome-storage-plus)](https://npmjs.com/package/chrome-storage-plus)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![GitHub Stars](https://img.shields.io/github/stars/theluckystrike/chrome-storage-plus?style=social)](https://github.com/theluckystrike/chrome-storage-plus)

Type-safe Chrome extension storage with schema validation, data migrations, reactive subscriptions, quota management, and import/export. Zero runtime dependencies. Works with Manifest V3.

INSTALL

```bash
npm install chrome-storage-plus
```

Peer dependency on @types/chrome is optional but recommended for full TypeScript support.

BASIC USAGE

```typescript
import { createStorage } from 'chrome-storage-plus';

// Create a storage instance for local, sync, or session
const storage = createStorage('local');

// Get and set with generics
await storage.set('theme', 'dark');
const theme = await storage.get<string>('theme');        // string | undefined
const safe = await storage.get('theme', 'light');        // string (default applied)

// Check if a key exists
const exists = await storage.has('theme');

// Batch operations
await storage.setMany({ theme: 'dark', fontSize: 14 });
const values = await storage.getMany(['theme', 'fontSize']);

// Remove one key, several keys, or everything
await storage.remove('theme');
await storage.remove(['theme', 'fontSize']);
await storage.clear();

// Grab all stored data
const all = await storage.getAll();
```

SCHEMA VALIDATION

Runtime type checking with no external libraries. Define a schema, validate incoming data, and fill in defaults for missing fields.

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

Each field accepts a type ('string', 'number', 'boolean', 'object', or 'array'), an optional required flag, an optional default value, and an optional custom validate function that receives the value and returns a boolean.

DATA MIGRATIONS

Version-based migration system that runs pending transforms in order and persists the version number to storage.

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

// You can also chain additional migrations
migrations.addMigration({
  version: 2,
  description: 'Add default locale',
  up: (data) => {
    data.locale = data.locale ?? 'en';
    return data;
  },
});

const result = await migrations.migrate();
// { migrated: true, from: 0, to: 2, applied: ['v1: ...', 'v2: ...'] }
```

The up function can be sync or async. getCurrentVersion() returns the stored version number and getLatestVersion() returns the highest registered migration version.

REACTIVE SUBSCRIPTIONS

Listen for storage changes on individual keys or across an entire storage area. Each subscription returns an unsubscribe function.

```typescript
import { ReactiveStorage } from 'chrome-storage-plus';

const reactive = new ReactiveStorage('local');

// Watch a single key
const unsub = reactive.onChange<string>('theme', (newValue, oldValue) => {
  console.log(`Theme changed from ${oldValue} to ${newValue}`);
});

// Watch all changes in the area
const unsubAll = reactive.onAnyChange((changes) => {
  console.log('Storage changed:', changes);
});

// Handle errors from callbacks
reactive.onError((error, key, operation) => {
  console.error(`Error in ${operation} for key "${key}":`, error);
});

// Clean up when done
unsub();
unsubAll();
reactive.dispose();
```

QUOTA MANAGEMENT

Inspect storage usage, check if a write would exceed quota, and find your largest keys.

```typescript
import { QuotaManager } from 'chrome-storage-plus';

const quota = new QuotaManager('local');

const { bytesUsed, bytesTotal, percentUsed, bytesRemaining } = await quota.getQuota();

const keyBytes = await quota.getKeySize('bigData');

if (await quota.wouldExceedQuota('bigData', largeObject)) {
  console.warn('Not enough storage space');
}

const sorted = await quota.getKeysBySize(); // [{ key, bytes }, ...] largest first
```

Built-in limits are 10 MB for local and session, 100 KB total for sync, and 8 KB per item for sync.

IMPORT AND EXPORT

Move data in and out of chrome.storage as JSON. Useful for backups, debugging, and migration tooling.

```typescript
import { StorageIO } from 'chrome-storage-plus';

const io = new StorageIO('local');

// Export everything as a JSON string
const json = await io.exportData();

// Trigger a browser file download
await io.exportToFile('backup.json');

// Import from a JSON string (merges by default)
const { imported } = await io.importData(jsonString);

// Overwrite all existing data instead of merging
await io.importData(jsonString, true);

// Import from a File object (from an input element, for example)
await io.importFromFile(file);
```

ERROR HANDLING

Every module throws typed errors with machine-readable codes.

ChromeStorageError is thrown by ChromeStorage with codes CHROME_API_UNAVAILABLE, OPERATION_FAILED, INVALID_KEY, and SERIALIZATION_FAILED.

ReactiveStorageError is thrown by ReactiveStorage with codes CHROME_API_UNAVAILABLE, CALLBACK_ERROR, and INVALID_KEY.

StorageIOError is thrown by StorageIO with codes JSON_PARSE_FAILED, INVALID_DATA_TYPE, CHROME_STORAGE_ERROR, and FILE_READ_ERROR.

```typescript
import { ChromeStorageError } from 'chrome-storage-plus';

try {
  await storage.get('key');
} catch (e) {
  if (e instanceof ChromeStorageError) {
    console.error(e.code, e.operation, e.message);
  }
}
```

TYPESCRIPT

The package ships with full type declarations. @types/chrome is listed as an optional peer dependency so your editor can resolve chrome.storage types when installed.

LICENSE

MIT. See LICENSE file.

---

Built by Zovo -- https://zovo.one
