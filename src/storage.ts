/**
 * ChromeStorage — Type-safe wrapper for chrome.storage API
 * Provides generic get/set with full TypeScript support
 */

export type AreaName = 'local' | 'sync' | 'session';

export class ChromeStorage {
    private area: AreaName;

    constructor(area: AreaName = 'local') {
        this.area = area;
    }

    private getStore(): chrome.storage.StorageArea {
        return chrome.storage[this.area];
    }

    /**
     * Get a typed value from storage
     */
    async get<T>(key: string): Promise<T | undefined>;
    async get<T>(key: string, defaultValue: T): Promise<T>;
    async get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
        const result = await this.getStore().get(key);
        const value = result[key];
        return value !== undefined ? (value as T) : defaultValue;
    }

    /**
     * Get multiple values from storage
     */
    async getMany<T extends Record<string, unknown>>(keys: (keyof T)[]): Promise<Partial<T>> {
        const result = await this.getStore().get(keys as string[]);
        return result as Partial<T>;
    }

    /**
     * Set a typed value in storage
     */
    async set<T>(key: string, value: T): Promise<void> {
        await this.getStore().set({ [key]: value });
    }

    /**
     * Set multiple values in storage
     */
    async setMany(items: Record<string, unknown>): Promise<void> {
        await this.getStore().set(items);
    }

    /**
     * Remove a key from storage
     */
    async remove(key: string | string[]): Promise<void> {
        await this.getStore().remove(key);
    }

    /**
     * Clear all data in this storage area
     */
    async clear(): Promise<void> {
        await this.getStore().clear();
    }

    /**
     * Get all key-value pairs
     */
    async getAll(): Promise<Record<string, unknown>> {
        return this.getStore().get(null);
    }

    /**
     * Check if a key exists
     */
    async has(key: string): Promise<boolean> {
        const result = await this.getStore().get(key);
        return key in result;
    }

    /**
     * Get the current storage area name
     */
    getAreaName(): AreaName {
        return this.area;
    }
}

/**
 * Create a new ChromeStorage instance
 */
export function createStorage(area: AreaName = 'local'): ChromeStorage {
    return new ChromeStorage(area);
}
