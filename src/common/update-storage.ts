/**
 * Common types for extension update tracking shared between background and UI
 */

/**
 * Represents a single extension update record for display in the UI
 */
export interface ExtensionUpdate {
    extensionId: string;
    version: string;
    previousVersion?: string;
    updateDate: string; // ISO date string
    isRead: boolean;
    notes?: string;
}

/**
 * Extension info for display
 */
export interface ExtensionInfo {
    id: string;
    name: string;
    version: string;
    enabled?: boolean;
    icons?: Array<{ size: number; url: string }>;
    description?: string;
    homepageUrl?: string;
    installType?: 'development' | 'normal' | 'sideload' | 'other';
}

/**
 * Represents a single version entry in an extension's update history.
 * Tracks when a version was detected and stores metadata about the update.
 */
export interface ExtensionVersionInfo {
    /** The version string (e.g., "1.2.3") */
    version: string;
    /** Timestamp in milliseconds when this version was first detected */
    detectedTimestampMs: number;
    /** Whether the user has acknowledged/viewed this update */
    isRead?: boolean;
    /** The version that was installed before this update */
    previousVersion?: string;
    /** Snapshot of extension metadata captured at detection time */
    infoSnapshot?: {
        /** Extension name at the time of detection */
        name: string;
        /** Extension icons with their sizes and URLs */
        icons?: Array<{ size: number; url: string }>;
    };
}

/**
 * Stored extension data structure containing current version and update history
 */
export interface StoredExtensionData {
    currentVersion: string;
    updateHistory: ExtensionVersionInfo[];
}

/**
 * Storage structure mapping extension IDs to their stored data
 */
export type ExtensionsUpdateStorageType = Record<string, StoredExtensionData>;
