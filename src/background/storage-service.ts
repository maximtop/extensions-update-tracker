/**
 * Storage service with schema validation using Valibot
 * Provides type-safe storage operations with automatic validation and error recovery
 */

import * as v from 'valibot';
import browser from 'webextension-polyfill';

import { Logger } from '../common/utils/logger';

/**
 * Storage key configuration with valibot schema for validation
 *
 * @example
 * import * as v from 'valibot';
 *
 * const STATES_KEY = new StorageKey(
 *     'notification_states',
 *     {},
 *     v.record(v.string(), v.object({
 *         extensionId: v.string(),
 *         version: v.string(),
 *         // ... more fields
 *     }))
 * );
 */
export class StorageKey<T> {
    constructor(
        public readonly key: string,
        public readonly defaultValue: T,
        public readonly schema?: v.BaseSchema<T, T, v.BaseIssue<unknown>>,
    ) {}
}

/**
 * Storage service interface with schema validation
 */
export interface IStorageService {
    /**
     * Reads data from storage with optional schema validation
     * Returns default value if key doesn't exist, validation fails, or error occurs
     * Errors are logged internally
     *
     * @param key - Storage key configuration
     * @returns The data (or default value on error)
     */
    get<T>(key: StorageKey<T>): Promise<T>;

    /**
     * Writes data to storage
     * Errors are logged internally
     *
     * @param key - Storage key configuration
     * @param value - Data to write
     */
    set<T>(key: StorageKey<T>, value: T): Promise<void>;

    /**
     * Removes a key from storage
     * Errors are logged internally
     *
     * @param key - Storage key configuration
     */
    remove<T>(key: StorageKey<T>): Promise<void>;
}

/**
 * Implementation of storage service with validation
 * Uses browser.storage.local exclusively
 */
class StorageService implements IStorageService {
    /**
     * Reads data from storage with optional schema validation
     * Automatically fixes corrupted/outdated data by merging with defaults when validation fails
     */
    async get<T>(storageKey: StorageKey<T>): Promise<T> {
        try {
            const result = await browser.storage.local.get(storageKey.key);
            const rawData = result[storageKey.key];

            // Return default if key doesn't exist
            // Clone the default value to prevent mutations
            if (rawData === undefined) {
                return this.cloneDefaultValue(storageKey.defaultValue);
            }

            // If no schema provided, return data as-is
            if (!storageKey.schema) {
                return rawData;
            }

            // Validate with valibot schema
            const parseResult = v.safeParse(storageKey.schema, rawData);

            if (!parseResult.success) {
                Logger.warn(
                    `Storage validation failed for key "${storageKey.key}". `
                    + 'Attempting to fix by merging with defaults.',
                    parseResult.issues,
                );

                // Try to preserve user data by deep merging stored data with defaults
                // This handles schema evolution (e.g., new fields added)
                const mergedValue = this.deepMerge(
                    this.cloneDefaultValue(storageKey.defaultValue),
                    rawData,
                );

                // Validate the merged data
                const mergedParseResult = v.safeParse(storageKey.schema, mergedValue);

                if (mergedParseResult.success) {
                    Logger.info(
                        `Successfully fixed storage for key "${storageKey.key}" by merging with defaults`,
                    );

                    // Auto-fix: Save the merged value to storage to prevent repeated warnings
                    // This is a fire-and-forget operation - we don't await it
                    this.set(storageKey, mergedParseResult.output).catch((error) => {
                        Logger.error(
                            `Failed to auto-fix storage for key "${storageKey.key}":`,
                            error,
                        );
                    });

                    return mergedParseResult.output;
                }

                // If merge didn't work, fall back to defaults
                Logger.warn(
                    `Merge failed for key "${storageKey.key}". Using default value.`,
                );
                const defaultValue = this.cloneDefaultValue(storageKey.defaultValue);

                // Save defaults as last resort
                this.set(storageKey, defaultValue).catch((error) => {
                    Logger.error(
                        `Failed to auto-fix storage for key "${storageKey.key}":`,
                        error,
                    );
                });

                return defaultValue;
            }

            return parseResult.output;
        } catch (error) {
            Logger.error(`Failed to read from storage (key: "${storageKey.key}"):`, error);
            return this.cloneDefaultValue(storageKey.defaultValue);
        }
    }

    /**
     * Deep merge two objects, preferring values from source when they exist
     * Used to merge stored data with defaults to handle schema evolution
     *
     * @param target - The default/base object
     * @param source - The stored/user object to merge in
     * @returns Merged object with source values taking precedence
     */
    private deepMerge<T>(target: T, source: any): T {
        // Handle non-object cases
        if (!target || typeof target !== 'object' || Array.isArray(target)) {
            return target;
        }
        if (!source || typeof source !== 'object') {
            return target;
        }

        const result: any = { ...target };

        for (const [key, sourceValue] of Object.entries(source)) {
            const targetValue = result[key];

            // If both are objects (and not arrays), recurse
            if (
                sourceValue
                && typeof sourceValue === 'object'
                && !Array.isArray(sourceValue)
                && targetValue
                && typeof targetValue === 'object'
                && !Array.isArray(targetValue)
            ) {
                result[key] = this.deepMerge(targetValue, sourceValue);
            } else if (sourceValue !== undefined) {
                // Otherwise, take the source value if it exists
                result[key] = sourceValue;
            }
            // If sourceValue is undefined, keep the target (default) value
        }

        return result as T;
    }

    /**
     * Clones the default value to prevent mutations
     */
    private cloneDefaultValue<T>(defaultValue: T): T {
        // For primitive types, return as-is
        if (defaultValue === null || typeof defaultValue !== 'object') {
            return defaultValue;
        }

        // Use structuredClone if available (modern browsers/Node 17+)
        if (typeof structuredClone !== 'undefined') {
            return structuredClone(defaultValue);
        }

        // Fallback to JSON clone for objects/arrays
        return JSON.parse(JSON.stringify(defaultValue));
    }

    /**
     * Writes data to storage
     */
    async set<T>(storageKey: StorageKey<T>, value: T): Promise<void> {
        try {
            await browser.storage.local.set({ [storageKey.key]: value });
        } catch (error) {
            Logger.error(`Failed to write to storage (key: "${storageKey.key}"):`, error);
        }
    }

    /**
     * Removes a key from storage
     */
    async remove<T>(storageKey: StorageKey<T>): Promise<void> {
        try {
            await browser.storage.local.remove(storageKey.key);
        } catch (error) {
            Logger.error(`Failed to remove from storage (key: "${storageKey.key}"):`, error);
        }
    }
}

/**
 * Singleton instance of the storage service
 */
export const storageService = new StorageService();
