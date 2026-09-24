/**
 * @file Settings storage service using StorageService with Valibot validation.
 * All writes are centralized through the background page.
 */

import * as v from 'valibot';

import { DEFAULT_SETTINGS } from '../common/types/settings-types';
import { Logger } from '../common/utils/logger';

import { StorageKey } from './storage-key';
import { storageService } from './storage-service';

import type { UserSettings } from '../common/types/settings-types';

/**
 * Valibot schema for NotificationSettings
 */
const NotificationSettingsSchema = v.object({
    enabled: v.boolean(),
    autoCloseTimeout: v.number(),
    soundEnabled: v.boolean(),
});

/**
 * Valibot schema for ExtensionNotificationPreferences
 */
const ExtensionNotificationPreferencesSchema = v.object({
    mutedExtensions: v.record(v.string(), v.boolean()),
});

/**
 * Valibot schema for SecuritySettings
 */
const SecuritySettingsSchema = v.object({
    autoDisableOnUpdate: v.boolean(),
});

/**
 * Valibot schema for UserSettings with automatic validation and default value fallback
 */
const UserSettingsSchema = v.object({
    notifications: NotificationSettingsSchema,
    extensionPreferences: ExtensionNotificationPreferencesSchema,
    security: SecuritySettingsSchema,
});

/**
 * Storage key for user settings with validation
 */
const SETTINGS_KEY = new StorageKey<UserSettings>(
    'user-settings',
    DEFAULT_SETTINGS,
    UserSettingsSchema,
);

/**
 * Loads, persists, and broadcasts changes to user settings.
 */
export class SettingsStorage {
    private settings: UserSettings = DEFAULT_SETTINGS;

    private changeListeners: ((settings: UserSettings) => void)[] = [];

    /**
     * Creates the storage and starts loading persisted settings in the background.
     */
    constructor() {
        void this.init();
    }

    /**
     * Initialize settings from storage
     */
    private async init() {
        await this.load();
    }

    /**
     * Load settings from storage with validation
     * Uses StorageService which automatically handles validation and defaults
     */
    async load(): Promise<UserSettings> {
        this.settings = await storageService.get(SETTINGS_KEY);
        return this.settings;
    }

    /**
     * Save settings to storage
     * Uses StorageService which handles errors internally
     *
     * @param settings Complete settings object to persist and adopt.
     */
    async save(settings: UserSettings): Promise<void> {
        await storageService.set(SETTINGS_KEY, settings);
        this.settings = settings;
        this.notifyListeners();
    }

    /**
     * Update specific settings without replacing all
     *
     * @param partial Settings fields to merge into the current settings; each nested
     * object (notifications, extensionPreferences, security) is merged rather than replaced.
     */
    async update(partial: Partial<UserSettings>): Promise<void> {
        const updated = {
            ...this.settings,
            ...partial,
            notifications: {
                ...this.settings.notifications,
                ...(partial.notifications || {}),
            },
            extensionPreferences: {
                ...this.settings.extensionPreferences,
                ...(partial.extensionPreferences || {}),
            },
            security: {
                ...this.settings.security,
                ...(partial.security || {}),
            },
        };

        await this.save(updated);
    }

    /**
     * Get current settings (synchronous)
     */
    get(): UserSettings {
        return this.settings;
    }

    /**
     * Check if notifications are enabled globally
     */
    areNotificationsEnabled(): boolean {
        return this.settings.notifications.enabled;
    }

    /**
     * Check if notifications are enabled for a specific extension
     *
     * @param extensionId Extension to check.
     */
    areNotificationsEnabledForExtension(extensionId: string): boolean {
        if (!this.settings.notifications.enabled) {
            return false;
        }

        return !this.settings.extensionPreferences.mutedExtensions[extensionId];
    }

    /**
     * Mute/unmute notifications for a specific extension
     *
     * @param extensionId Extension to mute or unmute.
     * @param muted Whether the extension's update notifications should be muted.
     */
    async setExtensionMuted(extensionId: string, muted: boolean): Promise<void> {
        const mutedExtensions = {
            ...this.settings.extensionPreferences.mutedExtensions,
        };

        if (muted) {
            mutedExtensions[extensionId] = true;
        } else {
            delete mutedExtensions[extensionId];
        }

        await this.update({
            extensionPreferences: {
                mutedExtensions,
            },
        });
    }

    /**
     * Reset settings to defaults
     */
    async reset(): Promise<void> {
        await this.save(DEFAULT_SETTINGS);
    }

    /**
     * Add a listener for settings changes
     *
     * @param listener Called with the new settings after every save.
     */
    addChangeListener(listener: (settings: UserSettings) => void): void {
        this.changeListeners.push(listener);
    }

    /**
     * Remove a settings change listener
     *
     * @param listener Listener previously passed to {@link addChangeListener}.
     */
    removeChangeListener(listener: (settings: UserSettings) => void): void {
        const index = this.changeListeners.indexOf(listener);
        if (index > -1) {
            this.changeListeners.splice(index, 1);
        }
    }

    /**
     * Notify all listeners of settings changes
     */
    private notifyListeners(): void {
        for (const listener of this.changeListeners) {
            try {
                listener(this.settings);
            } catch (error) {
                Logger.error('Error in settings change listener:', error);
            }
        }
    }
}

// Singleton instance
export const settingsStorage = new SettingsStorage();
