/**
 * ChromeStorage — Type-safe wrapper for chrome.storage API
 * Provides generic get/set with full TypeScript support
 */

export type AreaName = 'local' | 'sync' | 'session';

/**
 * Custom error class for ChromeStorage operations
 */
export class ChromeStorageError extends Error {
    constructor(
        message: string,
        public code: string,
        public operation: string,
        public originalError?: Error
    ) {
        super(message);
        this.name = 'ChromeStorageError';
        if (originalError) {
            this.stack = originalError.stack;
        }
    }
}

/**
 * Error codes for ChromeStorage operations
 */
export const ChromeStorageErrorCode = {
    CHROME_API_UNAVAILABLE: 'CHROME_API_UNAVAILABLE',
    OPERATION_FAILED: 'OPERATION_FAILED',
    INVALID_KEY: 'INVALID_KEY',
    SERIALIZATION_FAILED: 'SERIALIZATION_FAILED',
} as const;

export class ChromeStorage {
    private area: AreaName;

    constructor(area: AreaName = 'local') {
        this.area = area;
    }

    private getStore(): chrome.storage.StorageArea {
        if (typeof chrome === 'undefined' || !chrome.storage) {
            throw new ChromeStorageError(
                `Chrome storage API is not available. This code must run in a Chrome extension environment.`,
                ChromeStorageErrorCode.CHROME_API_UNAVAILABLE,
                'getStore'
            );
        }
        return chrome.storage[this.area];
    }

    /**
     * Handle errors from chrome.storage operations
     */
    private handleError(error: unknown, operation: string, context?: Record<string, unknown>): never {
        const e = error as Error;
        
        // Check if it's a quota error
        if (e.message && e.message.includes('QUOTA')) {
            throw new ChromeStorageError(
                `Storage quota exceeded for ${this.area}. Please free up space or remove some items.`,
                ChromeStorageErrorCode.OPERATION_FAILED,
                operation,
                error as Error
            );
        }
        
        throw new ChromeStorageError(
            `Failed to ${operation}: ${e.message}. ` +
            `Context: ${context ? JSON.stringify(context) : 'none'}`,
            ChromeStorageErrorCode.OPERATION_FAILED,
            operation,
            error as Error
        );
    }

    /**
     * Get a typed value from storage
     * @throws {ChromeStorageError} When storage operation fails
     */
    async get<T>(key: string): Promise<T | undefined>;
    async get<T>(key: string, defaultValue: T): Promise<T>;
    async get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
        if (!key || typeof key !== 'string') {
            throw new ChromeStorageError(
                `Invalid key: must be a non-empty string. Received: ${key}`,
                ChromeStorageErrorCode.INVALID_KEY,
                'get'
            );
        }
        
        try {
            const result = await this.getStore().get(key);
            const value = result[key];
            return value !== undefined ? (value as T) : defaultValue;
        } catch (e) {
            this.handleError(e, 'get value', { key, area: this.area });
        }
    }

    /**
     * Get multiple values from storage
     * @throws {ChromeStorageError} When storage operation fails
     */
    async getMany<T extends Record<string, unknown>>(keys: (keyof T)[]): Promise<Partial<T>> {
        if (!Array.isArray(keys) || keys.length === 0) {
            throw new ChromeStorageError(
                `Invalid keys: must be a non-empty array. Received: ${keys}`,
                ChromeStorageErrorCode.INVALID_KEY,
                'getMany'
            );
        }
        
        try {
            const result = await this.getStore().get(keys as string[]);
            return result as Partial<T>;
        } catch (e) {
            this.handleError(e, 'get multiple values', { keys, area: this.area });
        }
    }

    /**
     * Set a typed value in storage
     * @throws {ChromeStorageError} When storage operation fails
     */
    async set<T>(key: string, value: T): Promise<void> {
        if (!key || typeof key !== 'string') {
            throw new ChromeStorageError(
                `Invalid key: must be a non-empty string. Received: ${key}`,
                ChromeStorageErrorCode.INVALID_KEY,
                'set'
            );
        }
        
        try {
            await this.getStore().set({ [key]: value });
        } catch (e) {
            this.handleError(e, 'set value', { key, area: this.area });
        }
    }

    /**
     * Set multiple values in storage
     * @throws {ChromeStorageError} When storage operation fails
     */
    async setMany(items: Record<string, unknown>): Promise<void> {
        if (!items || typeof items !== 'object' || Array.isArray(items)) {
            throw new ChromeStorageError(
                `Invalid items: must be a plain object. Received: ${typeof items}`,
                ChromeStorageErrorCode.INVALID_KEY,
                'setMany'
            );
        }
        
        try {
            await this.getStore().set(items);
        } catch (e) {
            this.handleError(e, 'set multiple values', { keys: Object.keys(items), area: this.area });
        }
    }

    /**
     * Remove a key from storage
     * @throws {ChromeStorageError} When storage operation fails
     */
    async remove(key: string | string[]): Promise<void> {
        const keys = Array.isArray(key) ? key : [key];
        
        if (keys.length === 0 || keys.some(k => !k || typeof k !== 'string')) {
            throw new ChromeStorageError(
                `Invalid key(s): must be a non-empty string or array of non-empty strings.`,
                ChromeStorageErrorCode.INVALID_KEY,
                'remove'
            );
        }
        
        try {
            await this.getStore().remove(key);
        } catch (e) {
            this.handleError(e, 'remove value', { key, area: this.area });
        }
    }

    /**
     * Clear all data in this storage area
     * @throws {ChromeStorageError} When storage operation fails
     */
    async clear(): Promise<void> {
        try {
            await this.getStore().clear();
        } catch (e) {
            this.handleError(e, 'clear storage', { area: this.area });
        }
    }

    /**
     * Get all key-value pairs
     * @throws {ChromeStorageError} When storage operation fails
     */
    async getAll(): Promise<Record<string, unknown>> {
        try {
            return await this.getStore().get(null);
        } catch (e) {
            this.handleError(e, 'get all values', { area: this.area });
        }
    }

    /**
     * Check if a key exists
     * @throws {ChromeStorageError} When storage operation fails
     */
    async has(key: string): Promise<boolean> {
        if (!key || typeof key !== 'string') {
            throw new ChromeStorageError(
                `Invalid key: must be a non-empty string. Received: ${key}`,
                ChromeStorageErrorCode.INVALID_KEY,
                'has'
            );
        }
        
        try {
            const result = await this.getStore().get(key);
            return key in result;
        } catch (e) {
            this.handleError(e, 'check key existence', { key, area: this.area });
        }
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
