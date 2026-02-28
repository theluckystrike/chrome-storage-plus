/**
 * Quota Manager
 * Track and manage chrome.storage quota usage
 */

import { AreaName } from './storage';

export interface QuotaInfo {
    bytesUsed: number;
    bytesTotal: number;
    percentUsed: number;
    bytesRemaining: number;
}

// Chrome storage limits
const QUOTA_LIMITS: Record<AreaName, number> = {
    local: 10_485_760,  // 10 MB
    sync: 102_400,       // 100 KB total
    session: 10_485_760, // 10 MB
};

const SYNC_PER_ITEM = 8_192; // 8 KB per item for sync

export class QuotaManager {
    private area: AreaName;

    constructor(area: AreaName = 'local') {
        this.area = area;
    }

    /**
     * Get current quota usage
     */
    async getQuota(): Promise<QuotaInfo> {
        const store = chrome.storage[this.area];
        const bytesUsed = await store.getBytesInUse(null);
        const bytesTotal = QUOTA_LIMITS[this.area];

        return {
            bytesUsed,
            bytesTotal,
            percentUsed: Math.round((bytesUsed / bytesTotal) * 100),
            bytesRemaining: bytesTotal - bytesUsed,
        };
    }

    /**
     * Get size of a specific key in bytes
     */
    async getKeySize(key: string): Promise<number> {
        return chrome.storage[this.area].getBytesInUse(key);
    }

    /**
     * Check if storing a value would exceed quota
     */
    async wouldExceedQuota(key: string, value: unknown): Promise<boolean> {
        const currentUsage = await chrome.storage[this.area].getBytesInUse(null);
        const currentKeySize = await chrome.storage[this.area].getBytesInUse(key);
        const newSize = new TextEncoder().encode(JSON.stringify({ [key]: value })).length;
        const projectedUsage = currentUsage - currentKeySize + newSize;

        if (this.area === 'sync' && newSize > SYNC_PER_ITEM) {
            return true; // Exceeds per-item limit
        }

        return projectedUsage > QUOTA_LIMITS[this.area];
    }

    /**
     * Get all keys sorted by size (largest first)
     */
    async getKeysBySize(): Promise<Array<{ key: string; bytes: number }>> {
        const allData = await chrome.storage[this.area].get(null);
        const entries: Array<{ key: string; bytes: number }> = [];

        for (const key of Object.keys(allData)) {
            const bytes = await chrome.storage[this.area].getBytesInUse(key);
            entries.push({ key, bytes });
        }

        return entries.sort((a, b) => b.bytes - a.bytes);
    }
}
