/**
 * Migration Manager for chrome.storage
 * Version-based data migration system for Chrome extensions
 */

import { ChromeStorage } from './storage';

export interface Migration {
    version: number;
    description: string;
    up: (data: Record<string, unknown>) => Record<string, unknown> | Promise<Record<string, unknown>>;
}

const VERSION_KEY = '__chrome_storage_plus_version__';

export class MigrationManager {
    private storage: ChromeStorage;
    private migrations: Migration[];

    constructor(storage: ChromeStorage, migrations: Migration[] = []) {
        this.storage = storage;
        this.migrations = migrations.sort((a, b) => a.version - b.version);
    }

    /**
     * Add a migration
     */
    addMigration(migration: Migration): this {
        this.migrations.push(migration);
        this.migrations.sort((a, b) => a.version - b.version);
        return this;
    }

    /**
     * Get the current storage version
     */
    async getCurrentVersion(): Promise<number> {
        return (await this.storage.get<number>(VERSION_KEY)) ?? 0;
    }

    /**
     * Get the latest migration version
     */
    getLatestVersion(): number {
        if (this.migrations.length === 0) return 0;
        return this.migrations[this.migrations.length - 1].version;
    }

    /**
     * Run pending migrations
     */
    async migrate(): Promise<{ migrated: boolean; from: number; to: number; applied: string[] }> {
        const currentVersion = await this.getCurrentVersion();
        const pendingMigrations = this.migrations.filter((m) => m.version > currentVersion);

        if (pendingMigrations.length === 0) {
            return { migrated: false, from: currentVersion, to: currentVersion, applied: [] };
        }

        let data = await this.storage.getAll();
        const applied: string[] = [];

        for (const migration of pendingMigrations) {
            data = await migration.up(data);
            applied.push(`v${migration.version}: ${migration.description}`);
        }

        // Save migrated data
        await this.storage.set(VERSION_KEY, this.getLatestVersion());
        for (const [key, value] of Object.entries(data)) {
            if (key !== VERSION_KEY) {
                await this.storage.set(key, value);
            }
        }

        return {
            migrated: true,
            from: currentVersion,
            to: this.getLatestVersion(),
            applied,
        };
    }
}
