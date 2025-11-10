/**
 * Settings store for managing user preferences in the UI
 * Uses message passing to communicate with background page for settings operations
 */

import { makeAutoObservable, runInAction } from 'mobx';

import { MessageSender } from '../../common/messaging/message-sender';
import { MessageType } from '../../common/messaging/message-types';
import { UserSettings, DEFAULT_SETTINGS } from '../../common/types/settings-types';
import { OptionsTab, DEFAULT_TAB } from '../types/tab-types';

export class SettingsStore {
    // Observable state
    settings: UserSettings = DEFAULT_SETTINGS;

    isLoading = false;

    error: string | null = null;

    activeTab: OptionsTab = DEFAULT_TAB;

    constructor() {
        makeAutoObservable(this);
        this.loadSettings();
    }

    /**
     * Load settings from background page via messaging
     */
    async loadSettings() {
        this.isLoading = true;
        this.error = null;

        try {
            const settings = await MessageSender.send<UserSettings>({ type: MessageType.GetSettings });
            runInAction(() => {
                this.settings = settings || DEFAULT_SETTINGS;
                this.isLoading = false;
            });
        } catch (err) {
            runInAction(() => {
                this.error = err instanceof Error ? err.message : 'Failed to load settings';
                this.isLoading = false;
            });
        }
    }

    /**
     * Toggle global notifications on/off
     */
    async toggleNotifications() {
        const enabled = !this.settings.notifications.enabled;
        await this.updateSettings({
            notifications: {
                ...this.settings.notifications,
                enabled,
            },
        });
    }

    /**
     * Toggle notification sound
     */
    async toggleNotificationSound() {
        const soundEnabled = !this.settings.notifications.soundEnabled;
        await this.updateSettings({
            notifications: {
                ...this.settings.notifications,
                soundEnabled,
            },
        });
    }

    /**
     * Toggle auto-disable on update
     */
    async toggleAutoDisableOnUpdate() {
        const autoDisableOnUpdate = !this.settings.security.autoDisableOnUpdate;
        await this.updateSettings({
            security: {
                ...this.settings.security,
                autoDisableOnUpdate,
            },
        });
    }

    /**
     * Mute/unmute notifications for a specific extension
     */
    async toggleExtensionMuted(extensionId: string) {
        const isMuted = this.settings.extensionPreferences.mutedExtensions[extensionId] || false;
        await MessageSender.send({
            type: MessageType.SetExtensionMuted,
            extensionId,
            muted: !isMuted,
        });
        // Reload settings to reflect the change
        await this.loadSettings();
    }

    /**
     * Check if extension notifications are muted
     */
    isExtensionMuted(extensionId: string): boolean {
        const DEFAULT_MUTED_STATUS = false;
        return this.settings.extensionPreferences.mutedExtensions[extensionId] || DEFAULT_MUTED_STATUS;
    }

    /**
     * Reset all settings to defaults
     */
    async resetSettings() {
        try {
            await MessageSender.send({ type: MessageType.ResetSettings });
            runInAction(() => {
                this.settings = DEFAULT_SETTINGS;
            });
        } catch (err) {
            runInAction(() => {
                this.error = err instanceof Error ? err.message : 'Failed to reset settings';
            });
        }
    }

    /**
     * Set active tab
     */
    setActiveTab(tab: OptionsTab) {
        this.activeTab = tab;
    }

    /**
     * Update settings (internal helper)
     */
    private async updateSettings(partial: Partial<UserSettings>) {
        try {
            await MessageSender.send({
                type: MessageType.UpdateSettings,
                settings: partial,
            });
            // Reload settings to reflect the change
            await this.loadSettings();
        } catch (err) {
            runInAction(() => {
                this.error = err instanceof Error ? err.message : 'Failed to update settings';
            });
        }
    }
}
