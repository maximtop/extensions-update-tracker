/**
 * Settings store for managing user preferences in the UI
 * Uses message passing to communicate with background page for settings operations
 */

import { makeAutoObservable, runInAction } from 'mobx';

import { MessageSender } from '../../common/messaging/message-sender';
import { MessageType } from '../../common/messaging/message-types';
import { UserSettings, DEFAULT_SETTINGS } from '../../common/types/settings-types';
import {
    OptionsTab,
    DEFAULT_TAB,
    TAB_ABOUT,
    TAB_SETTINGS,
} from '../types/tab-types';

/**
 * URL hash for each non-default tab, so the active tab survives page
 * reloads and tabs become directly linkable (options.html#settings)
 */
const TAB_HASHES: Partial<Record<OptionsTab, string>> = {
    [TAB_SETTINGS]: '#settings',
    [TAB_ABOUT]: '#about',
};

/**
 * Resolves the tab encoded in the current URL hash, falling back to the default tab
 */
function getTabFromHash(): OptionsTab {
    const { hash } = window.location;
    const match = Object.entries(TAB_HASHES).find(([, tabHash]) => tabHash === hash);
    return match ? (match[0] as OptionsTab) : DEFAULT_TAB;
}

export class SettingsStore {
    // Observable state
    settings: UserSettings = DEFAULT_SETTINGS;

    isLoading = false;

    error: string | null = null;

    activeTab: OptionsTab = getTabFromHash();

    constructor() {
        makeAutoObservable(this);
        this.loadSettings();
        // Follow in-page hash navigation (e.g. a link to options.html#settings
        // opened while the page is already loaded). Our own setActiveTab uses
        // replaceState, which does not fire hashchange, so this cannot loop.
        window.addEventListener('hashchange', () => {
            runInAction(() => {
                this.activeTab = getTabFromHash();
            });
        });
    }

    /**
     * Load settings from background page via messaging
     *
     * @param showLoadingState Pass false for silent refreshes after user actions:
     * flipping the global isLoading flag swaps the whole page for the loading
     * skeleton and makes the layout jump.
     */
    async loadSettings(showLoadingState = true) {
        if (showLoadingState) {
            this.isLoading = true;
        }
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
        // Silent reload to reflect the change without swapping in the loading state
        await this.loadSettings(false);
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
     * Set active tab and mirror it into the URL hash, so a reload restores
     * the tab and tabs can be linked to directly. replaceState avoids piling
     * up history entries and the scroll jump of assigning location.hash.
     */
    setActiveTab(tab: OptionsTab) {
        this.activeTab = tab;
        const hash = TAB_HASHES[tab] ?? '';
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hash}`);
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
            // Silent reload to reflect the change without swapping in the loading state
            await this.loadSettings(false);
        } catch (err) {
            runInAction(() => {
                this.error = err instanceof Error ? err.message : 'Failed to update settings';
            });
        }
    }
}
