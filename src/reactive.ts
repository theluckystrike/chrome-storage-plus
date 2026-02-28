/**
 * Reactive Storage
 * Subscribe to storage changes with onChange listeners
 */

import { AreaName } from './storage';

export type ChangeCallback<T = unknown> = (newValue: T | undefined, oldValue: T | undefined) => void;

interface Subscription {
    key: string;
    callback: ChangeCallback;
}

export class ReactiveStorage {
    private area: AreaName;
    private subscriptions: Subscription[] = [];
    private listening = false;

    constructor(area: AreaName = 'local') {
        this.area = area;
    }

    /**
     * Subscribe to changes for a specific key
     */
    onChange<T>(key: string, callback: ChangeCallback<T>): () => void {
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
     */
    onAnyChange(callback: (changes: Record<string, chrome.storage.StorageChange>) => void): () => void {
        const handler = (
            changes: Record<string, chrome.storage.StorageChange>,
            areaName: string
        ) => {
            if (areaName === this.area) {
                callback(changes);
            }
        };

        chrome.storage.onChanged.addListener(handler);
        return () => chrome.storage.onChanged.removeListener(handler);
    }

    private startListening(): void {
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
                sub.callback(change.newValue, change.oldValue);
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
