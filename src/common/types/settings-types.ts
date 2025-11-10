/**
 * User preferences and settings types
 */

/**
 * Global notification settings
 */
export interface NotificationSettings {
    /** Enable/disable all notifications globally */
    enabled: boolean;
    /** Auto-close notifications after timeout (in seconds, 0 = never) */
    autoCloseTimeout: number;
    /** Enable notification sound */
    soundEnabled: boolean;
}

/**
 * Per-extension notification preferences
 */
export interface ExtensionNotificationPreferences {
    /** Map of extension ID to muted status */
    mutedExtensions: Record<string, boolean>;
}

/**
 * Security and automation settings
 */
export interface SecuritySettings {
    /** Auto-disable extensions on update (security feature) */
    autoDisableOnUpdate: boolean;
}

/**
 * Complete user settings
 */
export interface UserSettings {
    notifications: NotificationSettings;
    extensionPreferences: ExtensionNotificationPreferences;
    security: SecuritySettings;
}

/**
 * Default settings values
 */
export const DEFAULT_SETTINGS: UserSettings = {
    notifications: {
        enabled: true,
        autoCloseTimeout: 10, // 10 seconds
        soundEnabled: true, // Enable system notification sound by default
    },
    extensionPreferences: {
        mutedExtensions: {},
    },
    security: {
        autoDisableOnUpdate: false,
    },
};
