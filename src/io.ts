/**
 * Storage I/O
 * Import and export chrome.storage data as JSON files
 */

import { AreaName } from './storage';

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
     */
    async importData(jsonString: string, overwrite: boolean = false): Promise<{ imported: number }> {
        const data = JSON.parse(jsonString);

        if (typeof data !== 'object' || data === null || Array.isArray(data)) {
            throw new Error('Import data must be a JSON object');
        }

        if (overwrite) {
            await chrome.storage[this.area].clear();
        }

        await chrome.storage[this.area].set(data);
        return { imported: Object.keys(data).length };
    }

    /**
     * Import from a File object (for use with file input elements)
     */
    async importFromFile(file: File, overwrite: boolean = false): Promise<{ imported: number }> {
        const text = await file.text();
        return this.importData(text, overwrite);
    }
}
