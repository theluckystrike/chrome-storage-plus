/**
 * Storage I/O
 * Import and export chrome.storage data as JSON files
 */

import { AreaName } from './storage.js';

/**
 * Custom error class for StorageIO operations
 * Provides specific error codes and helpful messages
 */
export class StorageIOError extends Error {
    constructor(
        message: string,
        public code: string,
        public originalError?: Error
    ) {
        super(message);
        this.name = 'StorageIOError';
        if (originalError) {
            this.stack = originalError.stack;
        }
    }
}

/**
 * Error codes for StorageIO operations
 */
export const StorageIOErrorCode = {
    JSON_PARSE_FAILED: 'JSON_PARSE_FAILED',
    INVALID_DATA_TYPE: 'INVALID_DATA_TYPE',
    CHROME_STORAGE_ERROR: 'CHROME_STORAGE_ERROR',
    FILE_READ_ERROR: 'FILE_READ_ERROR',
} as const;

export class StorageIO {
    private area: AreaName;

    constructor(area: AreaName = 'local') {
        this.area = area;
    }

    /**
     * Export all storage data as a JSON string
     */
    async exportData(): Promise<string> {
        const data = await chrome.storage[this.area].get(null);
        return JSON.stringify(data, null, 2);
    }

    /**
     * Export data and trigger a file download
     */
    async exportToFile(filename: string = 'extension-data.json'): Promise<void> {
        const jsonString = await this.exportData();
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();

        URL.revokeObjectURL(url);
    }

    /**
     * Import data from a JSON string (merges with existing data)
     * @throws {StorageIOError} When JSON parsing fails or data is invalid
     */
    async importData(jsonString: string, overwrite: boolean = false): Promise<{ imported: number }> {
        let data: unknown;
        
        try {
            data = JSON.parse(jsonString);
        } catch (e) {
            const error = e as Error;
            throw new StorageIOError(
                `Failed to parse JSON: ${error.message}. Please ensure the input is valid JSON.`,
                StorageIOErrorCode.JSON_PARSE_FAILED,
                error
            );
        }

        if (typeof data !== 'object' || data === null || Array.isArray(data)) {
            throw new StorageIOError(
                `Invalid data type: expected a JSON object but received ${Array.isArray(data) ? 'an array' : typeof data}. ` +
                `Import data must be a plain object with key-value pairs.`,
                StorageIOErrorCode.INVALID_DATA_TYPE
            );
        }

        try {
            if (overwrite) {
                await chrome.storage[this.area].clear();
            }
            await chrome.storage[this.area].set(data as Record<string, unknown>);
        } catch (e) {
            const error = e as Error;
            throw new StorageIOError(
                `Failed to write to chrome.storage.${this.area}: ${error.message}. ` +
                `This may be due to quota limits or storage being disabled.`,
                StorageIOErrorCode.CHROME_STORAGE_ERROR,
                error
            );
        }
        
        return { imported: Object.keys(data as object).length };
    }

    /**
     * Import from a File object (for use with file input elements)
     * @throws {StorageIOError} When file reading or JSON parsing fails
     */
    async importFromFile(file: File, overwrite: boolean = false): Promise<{ imported: number }> {
        let text: string;
        
        try {
            text = await file.text();
        } catch (e) {
            const error = e as Error;
            throw new StorageIOError(
                `Failed to read file "${file.name}": ${error.message}. ` +
                `The file may be corrupted or inaccessible.`,
                StorageIOErrorCode.FILE_READ_ERROR,
                error
            );
        }
        
        return this.importData(text, overwrite);
    }
}
