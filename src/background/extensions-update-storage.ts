import * as v from 'valibot';

import { Logger } from '../common/utils/logger';

import { StorageAdapter } from './storage-adapter';

import type { Management } from 'webextension-polyfill';

/**
 * Schema for extension icon metadata
 * Captures size and URL information for extension icons at the time of update detection
 */
const IconSchema = v.object({
    size: v.number(),
    url: v.string(),
});

/**
 * Schema for capturing a complete snapshot of extension metadata at update detection time
 *
 * This comprehensive snapshot preserves extension state when updates are detected,
 * allowing the UI to display accurate historical information even if the extension
 * is later modified or uninstalled. Includes core identity, lifecycle state, URLs,
 * visual assets, permissions, and install metadata.
 */
const ExtensionInfoSnapshotSchema = v.object({
    // Core identity
    name: v.string(),
    shortName: v.optional(v.string()),
    description: v.optional(v.string()),
    version: v.string(),
    versionName: v.optional(v.string()),

    // Lifecycle state
    enabled: v.optional(v.boolean()),
    mayDisable: v.optional(v.boolean()),
    disabledReason: v.optional(v.string()),
    type: v.optional(v.union([
        v.literal('extension'),
        v.literal('theme'),
        v.literal('hosted_app'),
        v.literal('packaged_app'),
        v.literal('legacy_packaged_app'),
    ])),

    // URLs
    homepageUrl: v.optional(v.string()),
    updateUrl: v.optional(v.string()),
    optionsUrl: v.optional(v.string()),

    // Visuals
    icons: v.optional(v.array(IconSchema)),

    // Permissions
    permissions: v.optional(v.array(v.string())),
    hostPermissions: v.optional(v.array(v.string())),

    // Install info
    installType: v.optional(v.union([
        v.literal('development'),
        v.literal('normal'),
        v.literal('sideload'),
        v.literal('other'),
    ])),
});

/**
 * Schema for a single extension version entry in the update history
 *
 * Represents one detected version of an extension with its detection timestamp,
 * read status, and complete metadata snapshot. Optional fields support backward
 * compatibility with existing stored data from earlier versions of this extension.
 *
 * @property version - The version string of the extension (e.g., "1.2.3")
 * @property detectedTimestampMs - Unix timestamp in milliseconds when this version was first detected
 * @property isRead - Whether the user has acknowledged this update (optional for backward compatibility)
 * @property previousVersion - The version that preceded this one (optional, may not exist for first entry)
 * @property infoSnapshot - Complete extension metadata at the time of detection (optional for backward compatibility)
 */
const ExtensionVersionInfoSchema = v.object({
    version: v.string(),
    detectedTimestampMs: v.number(),
    // Newly added fields
    isRead: v.optional(v.boolean()),
    previousVersion: v.optional(v.string()),
    infoSnapshot: v.optional(ExtensionInfoSnapshotSchema),
});

/**
 * Type representing a single extension version history entry
 */
type ExtensionVersionInfo = v.InferOutput<typeof ExtensionVersionInfoSchema>;

/**
 * Schema for the entire extensions update storage structure
 *
 * A record mapping extension IDs to their current version and complete update history.
 * Each extension entry tracks the current version and maintains a chronological history
 * of all detected versions up to MAX_HISTORY_ENTRIES limit.
 */
const ExtensionsUpdateStorageSchema = v.record(
    v.string(), // extensionId as key
    v.object({
        currentVersion: v.string(),
        updateHistory: v.array(ExtensionVersionInfoSchema),
    }),
);

/**
 * Type representing the complete extensions update storage data structure
 */
type ExtensionsUpdateStorageType = v.InferOutput<typeof ExtensionsUpdateStorageSchema>;

/**
 * Manages persistent storage of extension update history and metadata
 *
 * This class handles tracking extension versions over time, maintaining a history
 * of updates with complete metadata snapshots. It provides thread-safe operations
 * through a save queue to prevent race conditions during concurrent updates.
 *
 * Key responsibilities:
 * - Track version changes for all installed extensions
 * - Maintain chronological update history with metadata snapshots
 * - Mark updates as read/unread for notification management
 * - Clean up data for uninstalled extensions
 * - Prevent data corruption through queued write operations
 *
 * @example
 * ```typescript
 * import { storage } from './storage';
 * const extensionsUpdateStorage = new ExtensionsUpdateStorage(storage);
 * await extensionsUpdateStorage.init();
 * await extensionsUpdateStorage.saveInstalledInfo(extensionInfo);
 * ```
 */
export class ExtensionsUpdateStorage {
    /**
     * In-memory cache of the extensions update storage
     * Initialized as null until init() is called to load from persistent storage
     */
    private extensionsUpdateStorage: ExtensionsUpdateStorageType | null = null;

    /**
     * Promise chain ensuring sequential execution of write operations
     * Prevents race conditions when multiple updates occur simultaneously
     */
    private saveQueue: Promise<void> = Promise.resolve();

    /**
     * Promise that resolves when initialization is complete
     * Used to prevent race conditions when service worker wakes up
     */
    private initPromise: Promise<void> | null = null;

    /**
     * Storage key used to persist extension update data
     */
    static readonly EXTENSIONS_UPDATE_STORAGE_KEY = 'extensions-update-storage';

    /**
     * Maximum number of version history entries to retain per extension
     * Older entries are trimmed when this limit is exceeded
     */
    static MAX_HISTORY_ENTRIES = 100;

    /**
     * Creates a new ExtensionsUpdateStorage instance
     *
     * @param storage - Storage adapter for persistent data operations
     */
    constructor(private storage: StorageAdapter) {}

    /**
     * Initializes the storage by loading and validating persisted data
     *
     * Loads extension update history from persistent storage, validates it against
     * the schema, and populates the in-memory cache. If validation fails (e.g., due
     * to schema changes or corrupted data), falls back to an empty storage object.
     *
     * Must be called before any other operations on this instance.
     *
     * @throws Will log errors but not throw - gracefully degrades to empty storage
     */
    async init() {
        if (!this.initPromise) {
            this.initPromise = this.performInit();
        }
        return this.initPromise;
    }

    /**
     * Performs the actual initialization logic
     * Separated from init() to allow for promise caching
     */
    private async performInit(): Promise<void> {
        const rawData = await this.storage.get(ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY);
        // Provide a default empty object if rawData is null or undefined
        const dataToParse = rawData ?? {};
        const result = v.safeParse(ExtensionsUpdateStorageSchema, dataToParse);

        if (result.success) {
            this.extensionsUpdateStorage = result.output;
        } else {
            Logger.error(
                `Failed to parse extensions update storage: ${JSON.stringify(result.issues)}`,
            );
            // Initialize with an empty object as a fallback in case of parse error
            this.extensionsUpdateStorage = {};
        }
    }

    /**
     * Ensures that the storage is initialized before accessing data
     * Waits for initialization to complete if it's in progress
     *
     * This method should be called by message handlers to prevent race conditions
     * when the service worker wakes up and handlers are invoked before init() completes.
     */
    async ensureInitialized(): Promise<void> {
        if (!this.initPromise) {
            await this.init();
        } else {
            await this.initPromise;
        }
    }

    /**
     * Returns the in-memory cache of extension update storage
     *
     * @returns The current extensions update storage object, or null if not yet initialized
     */
    getStorage() {
        return this.extensionsUpdateStorage;
    }

    /**
     * Saves or updates extension information when a new version is detected
     *
     * This method queues the save operation to ensure thread-safe sequential writes.
     * For new extensions, creates an initial history entry. For existing extensions,
     * either updates the timestamp if the version is unchanged, or appends a new
     * history entry for version changes. History is automatically trimmed to
     * MAX_HISTORY_ENTRIES.
     *
     * @param info - Complete extension information from the browser's management API
     * @returns Promise that resolves when the save operation completes
     *
     * @example
     * ```typescript
     * // Called when extension installed or updated
     * await storage.saveInstalledInfo(extensionInfo);
     * ```
     */
    async saveInstalledInfo(info: Management.ExtensionInfo) {
        // Queue this operation to prevent concurrent writes from racing
        this.saveQueue = this.saveQueue.then(async () => {
            await this.performSave(info);
        }).catch((error) => {
            Logger.error(`Failed to save extension info: ${error}`);
        });

        return this.saveQueue;
    }

    /**
     * Internal implementation of save operation - executes within the save queue
     *
     * Reads fresh data from storage to avoid stale cache issues, then either:
     * - For existing extensions with same version: updates timestamp and snapshot only
     * - For existing extensions with new version: appends new history entry
     * - For new extensions: creates initial history entry
     *
     * Creates a complete metadata snapshot to preserve extension state at update time.
     * Trims history to MAX_HISTORY_ENTRIES and updates both persistent storage and cache.
     *
     * @param info - Complete extension information from the browser's management API
     * @private
     */
    private async performSave(info: Management.ExtensionInfo) {
        // Read fresh data from storage to avoid stale cache
        const rawData = await this.storage.get(ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY);
        const dataToParse = rawData ?? {};
        const parseResult = v.safeParse(ExtensionsUpdateStorageSchema, dataToParse);

        const currentStorage: ExtensionsUpdateStorageType = parseResult.success
            ? parseResult.output
            : {};

        const key = info.id;
        const detectedTimestampMs = Date.now();

        // Create info snapshot for UI display
        const infoSnapshot = {
            name: info.name,
            shortName: info.shortName,
            description: info.description,
            version: info.version,
            versionName: info.versionName,
            enabled: info.enabled,
            mayDisable: info.mayDisable,
            disabledReason: info.disabledReason,
            type: info.type,
            homepageUrl: info.homepageUrl,
            updateUrl: info.updateUrl,
            optionsUrl: info.optionsUrl,
            icons: info.icons?.map((icon) => ({
                size: icon.size,
                url: icon.url,
            })),
            permissions: info.permissions,
            hostPermissions: info.hostPermissions,
            installType: info.installType,
        };

        const existing = currentStorage[key];

        if (existing) {
            const history = [...existing.updateHistory];
            const last = history[history.length - 1];

            if (last && last.version === info.version) {
                // Same version detected again: update timestamp only, do not append
                const updatedEntry: ExtensionVersionInfo = {
                    ...last,
                    detectedTimestampMs,
                    infoSnapshot,
                };
                history[history.length - 1] = updatedEntry;
            } else {
                const historyEntry: ExtensionVersionInfo = {
                    version: info.version,
                    detectedTimestampMs,
                    previousVersion: last?.version,
                    infoSnapshot,
                };
                history.push(historyEntry);
            }

            // Trim to keep only the last N entries
            const trimmed = history.slice(-ExtensionsUpdateStorage.MAX_HISTORY_ENTRIES);

            currentStorage[key] = {
                currentVersion: info.version,
                updateHistory: trimmed,
            };
        } else {
            const historyEntry: ExtensionVersionInfo = {
                version: info.version,
                detectedTimestampMs,
                infoSnapshot,
            };
            currentStorage[key] = {
                currentVersion: info.version,
                updateHistory: [historyEntry],
            };
        }

        // Write to storage
        await this.storage.set(
            ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY,
            currentStorage,
        );

        // Update in-memory cache after successful write
        this.extensionsUpdateStorage = currentStorage;
    }

    /**
     * Removes all stored data for a specific extension
     *
     * Called when an extension is uninstalled to clean up orphaned update history
     * and prevent accumulation of data for non-existent extensions. The operation
     * is queued to ensure thread-safe sequential execution.
     *
     * @param extensionId - Unique identifier of the extension to remove
     * @returns Promise that resolves when the removal completes
     *
     * @example
     * ```typescript
     * // Called when extension is uninstalled
     * await storage.removeExtension('extension-id-123');
     * ```
     */
    async removeExtension(extensionId: string): Promise<void> {
        // Queue this operation to prevent concurrent writes from racing
        this.saveQueue = this.saveQueue.then(async () => {
            await this.performRemove(extensionId);
        }).catch((error) => {
            Logger.error(`Failed to remove extension data: ${error}`);
        });

        return this.saveQueue;
    }

    /**
     * Internal implementation of remove operation - executes within the save queue
     *
     * Reads fresh data from storage, deletes the specified extension's entry if it exists,
     * and updates both persistent storage and the in-memory cache. Silently succeeds
     * if the extension has no stored data.
     *
     * @param extensionId - Unique identifier of the extension to remove
     * @private
     */
    private async performRemove(extensionId: string): Promise<void> {
        // Read fresh data from storage to avoid stale cache
        const rawData = await this.storage.get(ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY);
        const dataToParse = rawData ?? {};
        const parseResult = v.safeParse(ExtensionsUpdateStorageSchema, dataToParse);

        const currentStorage: ExtensionsUpdateStorageType = parseResult.success
            ? parseResult.output
            : {};

        // Remove the extension entry if it exists
        if (currentStorage[extensionId]) {
            delete currentStorage[extensionId];

            // Write to storage
            await this.storage.set(
                ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY,
                currentStorage,
            );

            // Update in-memory cache after successful write
            this.extensionsUpdateStorage = currentStorage;

            Logger.info(`Cleaned up storage data for uninstalled extension: ${extensionId}`);
        }
    }

    /**
     * Marks an extension update as read by the user
     *
     * Used to track whether the user has acknowledged an update, typically for
     * notification badge management. Can mark either a specific version or the
     * latest version if no version is specified. The operation is queued to
     * ensure thread-safe sequential execution.
     *
     * @param extensionId - Unique identifier of the extension
     * @param version - Specific version to mark as read (optional, defaults to latest)
     * @returns Promise that resolves when the mark operation completes
     *
     * @example
     * ```typescript
     * // Mark latest update as read
     * await storage.markUpdateAsRead('extension-id-123');
     *
     * // Mark specific version as read
     * await storage.markUpdateAsRead('extension-id-123', '1.2.3');
     * ```
     */
    async markUpdateAsRead(extensionId: string, version?: string): Promise<void> {
        // Queue this operation to prevent concurrent writes from racing
        this.saveQueue = this.saveQueue.then(async () => {
            await this.performMarkAsRead(extensionId, version);
        }).catch((error) => {
            Logger.error(`Failed to mark update as read: ${error}`);
        });

        return this.saveQueue;
    }

    /**
     * Internal implementation of mark-as-read operation - executes within the save queue
     *
     * Reads fresh data from storage, locates the specified version entry (or latest if
     * no version specified), and sets its isRead flag to true. Only writes to storage
     * if the flag was actually changed. Warns if the extension has no stored data.
     *
     * @param extensionId - Unique identifier of the extension
     * @param version - Specific version to mark as read (optional, defaults to latest)
     * @private
     */
    private async performMarkAsRead(extensionId: string, version?: string): Promise<void> {
        // Read fresh data from storage to avoid stale cache
        const rawData = await this.storage.get(ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY);
        const dataToParse = rawData ?? {};
        const parseResult = v.safeParse(ExtensionsUpdateStorageSchema, dataToParse);

        const currentStorage: ExtensionsUpdateStorageType = parseResult.success
            ? parseResult.output
            : {};

        const extensionData = currentStorage[extensionId];
        if (!extensionData) {
            Logger.warn(`No data found for extension: ${extensionId}`);
            return;
        }

        // If version is specified, mark that specific version as read
        // Otherwise, mark the latest version as read
        let updated = false;
        if (version) {
            // Find and mark specific version
            for (let i = extensionData.updateHistory.length - 1; i >= 0; i -= 1) {
                const entry = extensionData.updateHistory[i];
                if (entry.version === version && !entry.isRead) {
                    const updatedEntry: ExtensionVersionInfo = {
                        ...entry,
                        isRead: true,
                    };
                    extensionData.updateHistory[i] = updatedEntry;
                    updated = true;
                    Logger.info(`Marked extension ${extensionId} version ${version} as read`);
                    break;
                }
            }
        } else {
            // Mark the latest version as read
            const lastIndex = extensionData.updateHistory.length - 1;
            const lastEntry = extensionData.updateHistory[lastIndex];
            if (lastEntry && !lastEntry.isRead) {
                const updatedEntry: ExtensionVersionInfo = {
                    ...lastEntry,
                    isRead: true,
                };
                extensionData.updateHistory[lastIndex] = updatedEntry;
                updated = true;
                Logger.info(`Marked latest update for extension ${extensionId} (version ${lastEntry.version}) as read`);
            }
        }

        // Only write to storage if we actually updated something
        if (updated) {
            currentStorage[extensionId] = extensionData;

            await this.storage.set(
                ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY,
                currentStorage,
            );

            // Update in-memory cache after successful write
            this.extensionsUpdateStorage = currentStorage;
        }
    }

    /**
     * Marks all updates across all extensions as read
     *
     * Iterates through all extensions and marks every update in their history as read.
     * Useful for "mark all as read" functionality in the UI. The operation is queued
     * to ensure thread-safe sequential execution.
     *
     * @returns Promise that resolves when the operation completes
     *
     * @example
     * ```typescript
     * // Mark all updates for all extensions as read
     * await storage.markAllAsRead();
     * ```
     */
    async markAllAsRead(): Promise<void> {
        // Queue this operation to prevent concurrent writes from racing
        this.saveQueue = this.saveQueue.then(async () => {
            await this.performMarkAllAsRead();
        }).catch((error) => {
            Logger.error(`Failed to mark all as read: ${error}`);
        });

        return this.saveQueue;
    }

    /**
     * Internal implementation of mark-all-as-read operation - executes within the save queue
     *
     * Reads fresh data from storage and marks every update entry across all extensions
     * as read. Only writes to storage if any changes were actually made.
     *
     * @private
     */
    private async performMarkAllAsRead(): Promise<void> {
        // Read fresh data from storage to avoid stale cache
        const rawData = await this.storage.get(ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY);
        const dataToParse = rawData ?? {};
        const parseResult = v.safeParse(ExtensionsUpdateStorageSchema, dataToParse);

        const currentStorage: ExtensionsUpdateStorageType = parseResult.success
            ? parseResult.output
            : {};

        let updated = false;

        // Iterate through all extensions and mark all updates as read
        for (const extensionData of Object.values(currentStorage)) {
            for (let i = 0; i < extensionData.updateHistory.length; i += 1) {
                const entry = extensionData.updateHistory[i];
                if (!entry.isRead) {
                    const updatedEntry: ExtensionVersionInfo = {
                        ...entry,
                        isRead: true,
                    };
                    extensionData.updateHistory[i] = updatedEntry;
                    updated = true;
                }
            }
        }

        // Only write to storage if we actually updated something
        if (updated) {
            await this.storage.set(
                ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY,
                currentStorage,
            );

            // Update in-memory cache after successful write
            this.extensionsUpdateStorage = currentStorage;
            Logger.info('Marked all updates as read across all extensions');
        }
    }
}
