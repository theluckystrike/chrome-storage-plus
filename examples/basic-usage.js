/**
 * chrome-storage-plus - Basic Usage Example
 * 
 * This example demonstrates the core features of chrome-storage-plus:
 * - Creating type-safe storage instances
 * - Basic CRUD operations (get, set, remove, clear)
 * - Batch operations
 * - Schema validation
 * - Reactive subscriptions
 * - Data migrations
 * - Quota management
 * - Import/Export functionality
 * 
 * NOTE: This library is designed for Chrome Extension environments.
 * To test, you would typically run this in a Chrome extension's
 * background script, popup, or content script.
 * 
 * @author Zovo
 * @license MIT
 */

// Import the library - in a real extension, this would be:
// import { createStorage, defineSchema, ReactiveStorage, MigrationManager, QuotaManager, StorageIO } from 'chrome-storage-plus';

// ============================================================
// PART 1: BASIC STORAGE OPERATIONS
// ============================================================

/**
 * Example 1: Creating a storage instance
 * 
 * createStorage() creates a ChromeStorage instance for the specified area.
 * Options: 'local', 'sync', or 'session'
 * - 'local': Persists until explicitly removed (default)
 * - 'sync': Syncs across user's Chrome instances if signed in
 * - 'session': Persists only until the browser closes
 */
function createStorageExample() {
  // Create a local storage instance (most common use case)
  const localStorage = createStorage('local');
  
  // Create a sync storage instance (for user preferences that should sync)
  const syncStorage = createStorage('sync');
  
  // Create a session storage instance (for temporary data)
  const sessionStorage = createStorage('session');
  
  console.log('Storage area:', localStorage.getAreaName()); // 'local'
}

/**
 * Example 2: Setting and Getting values
 * 
 * The library provides type-safe get/set operations.
 * Values can be any JSON-serializable type.
 */
async function setGetExample() {
  const storage = createStorage('local');
  
  // Set a single value - any JSON-serializable type works
  await storage.set('theme', 'dark');           // string
  await storage.set('fontSize', 14);             // number
  await storage.set('notificationsEnabled', true); // boolean
  await storage.set('userPreferences', {         // object
    sidebarCollapsed: false,
    language: 'en-US'
  });
  await storage.set('recentFiles', ['doc1.txt', 'doc2.txt']); // array
  
  // Get values with type inference
  const theme = await storage.get<string>('theme');           // Returns: string | undefined
  const fontSize = await storage.get<number>('fontSize');    // Returns: number | undefined
  
  // Get value with default - returns the default if key doesn't exist
  const themeWithDefault = await storage.get('theme', 'light');  // Returns: 'dark' (since it exists)
  const newValue = await storage.get('nonexistent', 'default');   // Returns: 'default'
  
  console.log({ theme, fontSize, themeWithDefault, newValue });
}

/**
 * Example 3: Batch Operations
 * 
 * Efficiently set or get multiple values at once.
 */
async function batchOperationsExample() {
  const storage = createStorage('local');
  
  // Set multiple values at once
  await storage.setMany({
    theme: 'dark',
    fontSize: 16,
    showSidebar: true,
    lastOpened: Date.now()
  });
  
  // Get multiple values at once
  const values = await storage.getMany<{
    theme: string;
    fontSize: number;
    showSidebar: boolean;
  }>(['theme', 'fontSize', 'showSidebar']);
  
  console.log('Batch get result:', values);
  // Example output: { theme: 'dark', fontSize: 16, showSidebar: true }
}

/**
 * Example 4: Checking Existence and Removing
 * 
 * Check if keys exist and remove them when needed.
 */
async function existenceAndRemoveExample() {
  const storage = createStorage('local');
  
  // Check if a key exists
  const hasTheme = await storage.has('theme');
  console.log('Has theme:', hasTheme); // true or false
  
  // Remove a single key
  await storage.remove('theme');
  
  // Remove multiple keys at once
  await storage.remove(['fontSize', 'showSidebar', 'lastOpened']);
  
  // Clear all data in this storage area
  // WARNING: This removes ALL data - use with caution!
  // await storage.clear();
  
  // Get all data at once
  const allData = await storage.getAll();
  console.log('All stored data:', allData);
}

// ============================================================
// PART 2: SCHEMA VALIDATION
// ============================================================

/**
 * Example 5: Defining and Using Schemas
 * 
 * Schema validation ensures data integrity and provides defaults.
 */
function schemaValidationExample() {
  // Define a schema for your extension's settings
  const settingsSchema = defineSchema({
    // Required string with default
    theme: { 
      type: 'string', 
      required: true, 
      default: 'light' 
    },
    // Optional number with default
    fontSize: { 
      type: 'number', 
      default: 14 
    },
    // Optional boolean with default
    notifications: { 
      type: 'boolean', 
      default: true 
    },
    // Optional object with default
    userInfo: {
      type: 'object',
      default: { name: 'Anonymous', id: null }
    },
    // Optional array with default
    recentProjects: {
      type: 'array',
      default: []
    }
  });
  
  // Validate incoming data against the schema
  const validData = {
    theme: 'dark',
    fontSize: 18,
    notifications: false
  };
  
  const { valid, errors } = settingsSchema.validate(validData);
  
  if (valid) {
    console.log('Data is valid!');
  } else {
    console.log('Validation errors:', errors);
  }
  
  // Apply defaults to fill in missing fields
  const dataWithDefaults = settingsSchema.applyDefaults(validData);
  console.log('Data with defaults:', dataWithDefaults);
  // Output: { theme: 'dark', fontSize: 18, notifications: false, userInfo: { name: 'Anonymous', id: null }, recentProjects: [] }
}

// ============================================================
// PART 3: REACTIVE SUBSCRIPTIONS
// ============================================================

/**
 * Example 6: Listening for Storage Changes
 * 
 * ReactiveStorage allows you to subscribe to storage changes.
 * This is useful for syncing state across popup, background, and content scripts.
 */
function reactiveStorageExample() {
  // Create a reactive storage instance
  const reactive = new ReactiveStorage('local');
  
  // Subscribe to changes on a specific key
  const unsubscribeTheme = reactive.onChange<string>('theme', (newValue, oldValue) => {
    console.log(`Theme changed from "${oldValue}" to "${newValue}"`);
    // Update UI, notify other parts of extension, etc.
  });
  
  // Subscribe to ALL changes in the storage area
  const unsubscribeAll = reactive.onAnyChange((changes) => {
    console.log('Storage changed:', changes);
    // changes is an object like: { theme: { newValue: 'dark', oldValue: 'light' } }
  });
  
  // Set an error handler for callback failures
  reactive.onError((error, key, operation) => {
    console.error(`Error in ${operation} for key "${key}":`, error);
  });
  
  // Later, when you want to stop listening:
  // unsubscribeTheme();
  // unsubscribeAll();
  
  // When done with the reactive instance (e.g., in popup closing):
  // reactive.dispose();
}

// ============================================================
// PART 4: DATA MIGRATIONS
// ============================================================

/**
 * Example 7: Managing Data Migrations
 * 
 * MigrationManager helps evolve your storage schema over time.
 * When you release a new version that changes data structure,
 * migrations transform old data to the new format.
 */
async function migrationExample() {
  const storage = createStorage('local');
  
  // Define migrations for each version
  const migrations = new MigrationManager(storage, [
    {
      version: 1,
      description: 'Initial schema - rename settings to preferences',
      up: (data) => {
        // Rename 'settings' to 'preferences'
        data.preferences = data.settings;
        delete data.settings;
        return data;
      }
    },
    {
      version: 2,
      description: 'Add default language to preferences',
      up: (data) => {
        // Add default language if not present
        if (data.preferences && !data.preferences.language) {
          data.preferences.language = 'en-US';
        }
        return data;
      }
    },
    {
      version: 3,
      description: 'Convert fontSize from string to number',
      up: (data) => {
        // Fix type mismatch from v1
        if (typeof data.fontSize === 'string') {
          data.fontSize = parseInt(data.fontSize, 10);
        }
        return data;
      }
    }
  ]);
  
  // Run migrations - only runs pending ones
  const result = await migrations.migrate();
  
  console.log('Migration result:', result);
  // Example output: { migrated: true, from: 0, to: 3, applied: ['v1: Initial schema', 'v2: Add default language', 'v3: Convert fontSize'] }
  
  // You can also add migrations dynamically
  migrations.addMigration({
    version: 4,
    description: 'Add new feature flag',
    up: (data) => {
      data.newFeatureEnabled = false;
      return data;
    }
  });
}

// ============================================================
// PART 5: QUOTA MANAGEMENT
// ============================================================

/**
 * Example 8: Monitoring Storage Quota
 * 
 * QuotaManager helps you stay within Chrome's storage limits.
 * Local storage has a limit (typically 5MB, but can vary).
 */
async function quotaManagementExample() {
  const quota = new QuotaManager('local');
  
  // Get current quota usage
  const quotaInfo = await quota.getQuota();
  console.log(`Using ${quotaInfo.percentUsed.toFixed(2)}% of storage`);
  console.log(`Bytes used: ${quotaInfo.bytesUsed.toLocaleString()}`);
  console.log(`Bytes remaining: ${quotaInfo.bytesRemaining.toLocaleString()}`);
  
  // Check if adding new data would exceed quota
  const largeData = { /* ... some large object ... */ };
  const wouldExceed = await quota.wouldExceedQuota('largeData', largeData);
  
  if (wouldExceed) {
    console.warn('Warning: Adding this data would exceed storage quota!');
    // Handle gracefully - maybe warn user or cleanup old data
  }
  
  // Get all keys sorted by size (largest first)
  // Useful for finding what's consuming most space
  const keysBySize = await quota.getKeysBySize();
  console.log('Keys by size:', keysBySize);
  // Example: [{ key: 'cache', bytes: 1024000 }, { key: 'theme', bytes: 5 }, ...]
}

// ============================================================
// PART 6: IMPORT / EXPORT
// ============================================================

/**
 * Example 9: Backup and Restore
 * 
 * StorageIO provides easy import/export functionality.
 * Great for user backups or migrating data between devices.
 */
async function importExportExample() {
  const io = new StorageIO('local');
  
  // Export all data as a JSON string
  const jsonExport = await io.exportData();
  console.log('Exported JSON:', jsonExport);
  // Example: '{"theme":"dark","fontSize":16,"userPreferences":{...}}'
  
  // Export as a downloadable file (triggers browser download)
  await io.exportToFile('my-extension-backup.json');
  
  // Import from a JSON string
  // By default, merges with existing data (keeps keys not in import)
  const importResult = await io.importData(jsonExport);
  console.log(`Imported ${importResult.imported} keys`);
  
  // Import with overwrite (replaces all existing data)
  const overwriteResult = await io.importData(jsonExport, true);
  console.log(`Overwrote with ${overwriteResult.imported} keys`);
  
  // Import from a File object (e.g., from <input type="file">)
  // Useful for user uploading a backup file
  // const fileInput = document.getElementById('backupFile') as HTMLInputElement;
  // if (fileInput.files?.[0]) {
  //   const fileImportResult = await io.importFromFile(fileInput.files[0]);
  //   console.log(`Imported ${fileImportResult.imported} keys from file`);
  // }
}

// ============================================================
// PART 7: COMPLETE WORKFLOW EXAMPLE
// ============================================================

/**
 * Example 10: Complete Extension Settings Manager
 * 
 * This demonstrates a real-world pattern: a settings manager
 * that uses schema validation, reactive updates, and persistence.
 */

// Define your extension's settings schema
const extensionSettingsSchema = defineSchema({
  theme: { type: 'string', required: true, default: 'light' },
  fontSize: { type: 'number', required: true, default: 14 },
  notificationsEnabled: { type: 'boolean', default: true },
  syncEnabled: { type: 'boolean', default: false },
  lastUpdated: { type: 'number', default: 0 }
});

// Create a settings manager class
class SettingsManager {
  private storage = createStorage('local');
  private reactive = new ReactiveStorage('local');
  private quota = new QuotaManager('local');
  
  // Initialize settings with defaults if needed
  async initialize() {
    const settings = await this.storage.getAll();
    
    // Apply defaults for any missing keys
    const defaults = extensionSettingsSchema.applyDefaults({});
    for (const [key, value] of Object.entries(defaults)) {
      if (!(key in settings)) {
        await this.storage.set(key, value);
      }
    }
    
    // Listen for external changes (e.g., from sync)
    this.reactive.onChange('theme', (newVal, oldVal) => {
      console.log(`Theme changed externally: ${oldVal} -> ${newVal}`);
      this.notifyListeners('theme', newVal);
    });
  }
  
  // Get a setting with type safety
  async getSetting<K extends string>(key: K): Promise<any> {
    return this.storage.get(key);
  }
  
  // Update a setting with validation
  async updateSetting<K extends string>(key: K, value: any): Promise<boolean> {
    // Validate the new value
    const { valid, errors } = extensionSettingsSchema.validate({ [key]: value });
    
    if (!valid) {
      console.error('Validation failed:', errors);
      return false;
    }
    
    // Check quota before saving
    const wouldExceed = await this.quota.wouldExceedQuota(key, value);
    if (wouldExceed) {
      console.error('Would exceed storage quota');
      return false;
    }
    
    // Save with timestamp
    await this.storage.setMany({
      [key]: value,
      lastUpdated: Date.now()
    });
    
    return true;
  }
  
  // Subscribe to setting changes
  onSettingChange(key: string, callback: (newValue: any, oldValue: any) => void) {
    return this.reactive.onChange(key, callback);
  }
  
  // Export all settings
  async exportSettings(): Promise<string> {
    const io = new StorageIO('local');
    return io.exportData();
  }
  
  // Import settings
  async importSettings(json: string, overwrite: boolean = false): Promise<number> {
    const result = await new StorageIO('local').importData(json, overwrite);
    return result.imported;
  }
  
  private listeners = new Map<string, Function[]>();
  
  private notifyListeners(key: string, value: any) {
    const callbacks = this.listeners.get(key) || [];
    callbacks.forEach(cb => cb(value));
  }
}

// ============================================================
// RUNNING THE EXAMPLES
// ============================================================

/**
 * To use this in your Chrome extension:
 * 
 * 1. Install: npm install chrome-storage-plus
 * 2. Import: import { createStorage, ... } from 'chrome-storage-plus';
 * 3. Use in your extension's background/popup/content scripts
 * 
 * Example manifest.json permissions:
 * {
 *   "permissions": ["storage"]
 * }
 */

// Uncomment to run examples (requires Chrome extension environment):
/*
async function main() {
  await setGetExample();
  await batchOperationsExample();
  await existenceAndRemoveExample();
  schemaValidationExample();
  reactiveStorageExample();
  await migrationExample();
  await quotaManagementExample();
  await importExportExample();
  
  // Settings manager
  const settings = new SettingsManager();
  await settings.initialize();
  await settings.updateSetting('theme', 'dark');
  const theme = await settings.getSetting('theme');
  console.log('Current theme:', theme);
}

main();
*/

console.log('chrome-storage-plus examples loaded!');
console.log('These examples demonstrate the library\'s API.');
console.log('Run in a Chrome extension environment for full functionality.');
