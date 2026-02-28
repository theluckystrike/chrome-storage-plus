# chrome-storage-plus — Type-Safe Chrome Extension Storage Wrapper

[![npm version](https://img.shields.io/npm/v/chrome-storage-plus.svg)](https://www.npmjs.com/package/chrome-storage-plus)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-green.svg)]()

> **Built by [Zovo](https://zovo.one)** — used in production across 18+ Chrome extensions serving 3,400+ users

**The missing `chrome.storage` wrapper.** Type-safe get/set, schema validation, data migrations, reactive subscriptions, quota management, and import/export — all with **zero runtime dependencies**.

## 📦 Install

```bash
npm install chrome-storage-plus
```

## 🚀 Quick Start

```typescript
import { createStorage } from 'chrome-storage-plus';

const storage = createStorage('local'); // or 'sync' or 'session'

// Type-safe get/set
await storage.set('theme', 'dark');
const theme = await storage.get<string>('theme'); // string | undefined
const theme2 = await storage.get('theme', 'light'); // string (with default)

// Check existence
if (await storage.has('theme')) { /* ... */ }

// Batch operations
await storage.setMany({ theme: 'dark', fontSize: 14 });
const { theme, fontSize } = await storage.getMany(['theme', 'fontSize']);
```

## ✨ Features

### Schema Validation

```typescript
import { defineSchema } from 'chrome-storage-plus';

const settingsSchema = defineSchema({
  theme: { type: 'string', required: true, default: 'light' },
  fontSize: { type: 'number', default: 14 },
  notifications: { type: 'boolean', default: true },
});

// Validate data
const { valid, errors } = settingsSchema.validate(data);

// Apply defaults for missing fields
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
  {
    version: 2,
    description: 'Add theme default',
    up: (data) => {
      if (!data.preferences) data.preferences = {};
      (data.preferences as any).theme = (data.preferences as any).theme || 'auto';
      return data;
    },
  },
]);

// Run on extension startup
const result = await migrations.migrate();
console.log(`Migrated from v${result.from} to v${result.to}`);
```

### Reactive Subscriptions

```typescript
import { ReactiveStorage } from 'chrome-storage-plus';

const reactive = new ReactiveStorage('local');

// Subscribe to specific key changes
const unsubscribe = reactive.onChange<string>('theme', (newValue, oldValue) => {
  console.log(`Theme changed: ${oldValue} → ${newValue}`);
  updateUI(newValue);
});

// Clean up when done
unsubscribe();
```

### Quota Management

```typescript
import { QuotaManager } from 'chrome-storage-plus';

const quota = new QuotaManager('local');

// Check usage
const { bytesUsed, percentUsed, bytesRemaining } = await quota.getQuota();
console.log(`Using ${percentUsed}% of storage`);

// Check before saving
if (await quota.wouldExceedQuota('bigData', largeObject)) {
  alert('Not enough storage space!');
}

// Find biggest keys
const keys = await quota.getKeysBySize();
```

### Import / Export

```typescript
import { StorageIO } from 'chrome-storage-plus';

const io = new StorageIO('local');

// Export to file download
await io.exportToFile('my-extension-backup.json');

// Import from file input
const fileInput = document.getElementById('import') as HTMLInputElement;
fileInput.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    const { imported } = await io.importFromFile(file);
    console.log(`Imported ${imported} keys`);
  }
});
```

## 🏗 Used By

- [Tab Suspender Pro](https://chrome.google.com/webstore/detail/tab-suspender-pro) — 1,400+ users
- [JSON Formatter Pro](https://chrome.google.com/webstore/detail/json-formatter-pro) — 2,000+ users
- [Cookie Manager Pro](https://chrome.google.com/webstore/detail/cookie-manager-pro) — Production
- [Clipboard History Pro](https://chrome.google.com/webstore/detail/clipboard-history-pro) — Production
- ...and 14 more Zovo extensions

## 🔗 Related Projects

- [chrome-extension-starter-mv3](https://github.com/theluckystrike/chrome-extension-starter-mv3) — Chrome extension boilerplate
- [mv3-migrate](https://github.com/theluckystrike/mv3-migrate) — MV2 → MV3 migration tool
- [tab-manager-api](https://github.com/theluckystrike/tab-manager-api) — Chrome tabs API wrapper
- [json-toolkit-cli](https://github.com/theluckystrike/json-toolkit-cli) — JSON CLI toolkit

## 📄 License

MIT — [Zovo](https://zovo.one)
