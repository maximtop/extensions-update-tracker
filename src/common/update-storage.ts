/**
 * @file Common types for extension update tracking shared between background and UI
 */

/**
 * Represents a single extension update record for display in the UI
 */
export interface ExtensionUpdate {
    /**
     * ID of the extension this update belongs to.
     */
    extensionId: string;

    /**
     * Version installed by this update.
     */
    version: string;

    /**
     * Version that was installed before this update, when known.
     */
    previousVersion?: string | undefined;

    /**
     * ISO date string of when the update was detected.
     */
    updateDate: string;

    /**
     * Whether the user has acknowledged/viewed this update.
     */
    isRead: boolean;

    /**
     * Optional free-form notes about the update.
     */
    notes?: string;
}

/**
 * Extension info for display
 */
export interface ExtensionInfo {
    /**
     * Extension ID.
     */
    id: string;

    /**
     * Display name of the extension.
     */
    name: string;

    /**
     * Currently installed version.
     */
    version: string;

    /**
     * Whether the extension is currently enabled.
     */
    enabled?: boolean;

    /**
     * Icons available for the extension, undefined when none are provided.
     */
    icons?: {
        /**
         * Icon width and height in pixels (icons are square).
         */
        size: number;

        /**
         * URL of the icon image.
         */
        url: string;
    }[] | undefined;

    /**
     * Extension description shown to the user.
     */
    description?: string;

    /**
     * URL of the extension's homepage, when available.
     */
    homepageUrl?: string | undefined;

    /**
     * How the extension was installed.
     */
    installType?: 'development' | 'normal' | 'sideload' | 'other';
}

/**
 * Represents a single version entry in an extension's update history.
 * Tracks when a version was detected and stores metadata about the update.
 */
export interface ExtensionVersionInfo {
    /**
     * The version string (e.g., "1.2.3")
     */
    version: string;

    /**
     * Timestamp in milliseconds when this version was first detected
     */
    detectedTimestampMs: number;

    /**
     * Whether the user has acknowledged/viewed this update
     */
    isRead?: boolean;

    /**
     * The version that was installed before this update
     */
    previousVersion?: string;

    /**
     * Snapshot of extension metadata captured at detection time
     */
    infoSnapshot?: {
        /**
         * Extension name at the time of detection
         */
        name: string;

        /**
         * Extension icons with their sizes and URLs
         */
        icons?: {
            /**
             * Icon width and height in pixels (icons are square).
             */
            size: number;

            /**
             * URL of the icon image.
             */
            url: string;
        }[];
    };
}

/**
 * Stored extension data structure containing current version and update history
 */
export interface StoredExtensionData {
    /**
     * Extension version currently installed.
     */
    currentVersion: string;

    /**
     * History of detected versions, oldest first.
     */
    updateHistory: ExtensionVersionInfo[];
}

/**
 * Storage structure mapping extension IDs to their stored data
 */
export type ExtensionsUpdateStorageType = Record<string, StoredExtensionData>;
