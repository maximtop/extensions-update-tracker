/**
 * Application-wide constants
 */

/**
 * Default/fallback values for extension data
 */
export const EXTENSION_DEFAULTS = {
    /** Fallback name when extension name is not available */
    UNKNOWN_NAME: 'Unknown Extension',
    /** Default version string when version is not specified */
    UNKNOWN_VERSION: '',
} as const;

/**
 * URL parameter names used across the application
 */
export const URL_PARAMS = {
    EXTENSION_ID: 'id',
    EXTENSION_NAME: 'name',
    EXTENSION_VERSION: 'version',
} as const;
