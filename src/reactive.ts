/**
 * Reactive Storage
 * Subscribe to storage changes with onChange listeners
 */

import { AreaName } from './storage.js';

/**
 * Error callback type for reactive storage errors
 */
export type ErrorCallback = (error: Error, key: string, operation: 'callback') => void;

export type ChangeCallback<T = unknown> = (newValue: T | undefined, oldValue: T | undefined) => void;

interface Subscription {
    key: string;
    callback: ChangeCallback;
}

/**
 * Custom error class for ReactiveStorage operations
 */
export class ReactiveStorageError extends Error {
    constructor(
        message: string,
        public code: string,
        public operation: string,
        public originalError?: Error
    ) {
        super(message);
        this.name = 'ReactiveStorageError';
    }
}

export const ReactiveStorageErrorCode = {
    CHROME_API_UNAVAILABLE: 'CHROME_API_UNAVAILABLE',
    CALLBACK_ERROR: 'CALLBACK_ERROR',
    INVALID_KEY: 'INVALID_KEY',
} as const;

export class ReactiveStorage {
    private area: AreaName;
    private subscriptions: Subscription[] = [];
    private listening = false;
    private errorCallback: ErrorCallback | null = null;

    constructor(area: AreaName = 'local') {
        this.area = area;
    }

    /**
     * Set an error handler for subscription callbacks
     */
    onError(callback: ErrorCallback): void {
        this.errorCallback = callback;
    }

    /**
     * Subscribe to changes for a specific key
     * @throws {ReactiveStorageError} When key is invalid
     */
    onChange<T>(key: string, callback: ChangeCallback<T>): () => void {
        if (!key || typeof key !== 'string') {
            throw new ReactiveStorageError(
                `Invalid key: must be a non-empty string. Received: ${key}`,
                ReactiveStorageErrorCode.INVALID_KEY,
                'onChange'
            );
        }
        
        if (typeof callback !== 'function') {
            throw new ReactiveStorageError(
                `Invalid callback: must be a function. Received: ${typeof callback}`,
                ReactiveStorageErrorCode.CALLBACK_ERROR,
                'onChange'
            );
        }
        
        const subscription: Subscription = { key, callback: callback as ChangeCallback };
        this.subscriptions.push(subscription);

        if (!this.listening) {
            this.startListening();
        }

        // Return unsubscribe function
        return () => {
            const index = this.subscriptions.indexOf(subscription);
            if (index !== -1) {
                this.subscriptions.splice(index, 1);
            }
            if (this.subscriptions.length === 0) {
                this.stopListening();
            }
        };
    }

    /**
     * Subscribe to all storage changes
     * @throws {ReactiveStorageError} When callback is not a function
     */
    onAnyChange(callback: (changes: Record<string, chrome.storage.StorageChange>) => void): () => void {
        if (typeof callback !== 'function') {
            throw new ReactiveStorageError(
                `Invalid callback: must be a function. Received: ${typeof callback}`,
                ReactiveStorageErrorCode.CALLBACK_ERROR,
                'onAnyChange'
            );
        }
        
        const handler = (
            changes: Record<string, chrome.storage.StorageChange>,
            areaName: string
        ) => {
            if (areaName === this.area) {
                try {
                    callback(changes);
                } catch (e) {
                    const error = e as Error;
                    if (this.errorCallback) {
                        this.errorCallback(error, '*', 'callback');
                    } else {
                        console.error('[ReactiveStorage] Callback error:', error);
                    }
                }
            }
        };

        chrome.storage.onChanged.addListener(handler);
        return () => chrome.storage.onChanged.removeListener(handler);
    }

    private startListening(): void {
        if (typeof chrome === 'undefined' || !chrome.storage) {
            throw new ReactiveStorageError(
                `Chrome storage API is not available. This code must run in a Chrome extension environment.`,
                ReactiveStorageErrorCode.CHROME_API_UNAVAILABLE,
                'startListening'
            );
        }
        
        this.listening = true;
        chrome.storage.onChanged.addListener(this.handleChange);
    }

    private stopListening(): void {
        this.listening = false;
        chrome.storage.onChanged.removeListener(this.handleChange);
    }

    private handleChange = (
        changes: Record<string, chrome.storage.StorageChange>,
        areaName: string
    ): void => {
        if (areaName !== this.area) return;

        for (const sub of this.subscriptions) {
            if (sub.key in changes) {
                const change = changes[sub.key];
                try {
                    sub.callback(change.newValue, change.oldValue);
                } catch (e) {
                    const error = e as Error;
                    if (this.errorCallback) {
                        this.errorCallback(error, sub.key, 'callback');
                    } else {
                        console.error(`[ReactiveStorage] Callback error for key "${sub.key}":`, error);
                    }
                }
            }
        }
    };

    /**
     * Remove all subscriptions
     */
    dispose(): void {
        this.subscriptions = [];
        this.stopListening();
    }
}
