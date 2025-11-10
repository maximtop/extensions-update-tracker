/**
 * Notification service for displaying extension update notifications
 */

import browser from 'webextension-polyfill';

import { NotificationCloseReason } from '../common/types/notification-types';
import { t } from '../common/utils/i18n';
import { Logger } from '../common/utils/logger';

import { NotificationButtonHandler } from './notification-button-handler';
import { NotificationIconHandler } from './notification-icon-handler';
import { notificationStateStorage } from './notification-state-storage';
import { settingsStorage } from './settings-storage';

import type { ExtensionsUpdateStorage } from './extensions-update-storage';
import type {
    UpdateNotificationOptions,
    NotificationButton,
    NotificationStatesStorage,
} from '../common/types/notification-types';
import type { Management } from 'webextension-polyfill';

interface ExtensionState {
    id: string;
    enabled: boolean;
    name: string;
    version: string;
    homepageUrl?: string;
}

export class NotificationService {
    private static readonly OPTIONS_PAGE_URL = browser.runtime.getURL('options.html');

    private static readonly NOTIFICATION_ID_PREFIX = 'extension-update-';

    private static readonly WELCOME_NOTIFICATION_ID = 'extension-welcome';

    private static readonly WELCOME_EXTENSION_ID = 'welcome';

    private static readonly EXTENSION_NAME = 'Extensions Update Tracker';

    private iconHandler = new NotificationIconHandler();

    private buttonHandler = new NotificationButtonHandler();

    /**
     * Map to store auto-close timeouts
     * Use NodeJS.Timeout type for service worker compatibility (not window.setTimeout)
     */
    private autoCloseTimeouts: Map<string, NodeJS.Timeout> = new Map();

    /**
     * Map to store extension state for button click handling
     */
    private extensionStates: Map<string, ExtensionState> = new Map();

    /**
     * Track which notifications were shown to distinguish auto-close from user dismissal
     */
    private activeNotifications: Map<string, { extensionId: string; version: string; shownAt: number }> = new Map();

    constructor(private updateStorage?: ExtensionsUpdateStorage) {
        this.init();
    }

    private init() {
        // Set up notification click handlers
        browser.notifications.onClicked.addListener(this.handleNotificationClick);
        browser.notifications.onButtonClicked.addListener(this.handleButtonClick);
        browser.notifications.onClosed.addListener(this.handleNotificationClosed);
        // onShowSettings is available in Firefox but not all browsers
        browser.notifications.onShowSettings?.addListener(this.handleShowSettings);

        // Listen for extension installation to show welcome notification
        browser.runtime.onInstalled.addListener(this.handleExtensionInstalled);

        notificationStateStorage.addChangeListener(this.handleRemoteStateChange);
    }

    /**
     * Shows a notification for an extension update
     */
    async showUpdateNotification(
        extensionInfo: Management.ExtensionInfo,
        previousVersion?: string,
    ): Promise<void> {
        const extensionId = extensionInfo.id;
        const extensionName = extensionInfo.name;
        const currentVersion = extensionInfo.version;
        const isEnabled = extensionInfo.enabled ?? true;

        Logger.info(
            `showUpdateNotification called - Extension: ${extensionName} (${extensionId}), `
            + `Version: ${previousVersion || 'N/A'} -> ${currentVersion}, `
            + `Enabled: ${isEnabled}`,
        );

        // Check if notifications are enabled
        if (!settingsStorage.areNotificationsEnabled()) {
            Logger.info('Notifications are globally disabled');
            return;
        }

        // Check if notifications are enabled for this extension
        if (!settingsStorage.areNotificationsEnabledForExtension(extensionId)) {
            Logger.info(`Notifications are muted for extension: ${extensionName}`);
            return;
        }

        // Check if this notification was previously dismissed by the user for this version
        const wasDismissed = await notificationStateStorage.wasDismissedByUser(extensionId, currentVersion);
        if (wasDismissed) {
            Logger.info(`Notification for ${extensionName} v${currentVersion} was previously dismissed by user`);
            return;
        }

        Logger.info(
            `All checks passed for ${extensionName}, proceeding to show notification`,
        );

        // Clear any previous dismissal state since this is a new/different version
        // This ensures that if a new version comes out, we can show notifications again
        await notificationStateStorage.clearState(extensionId);

        // Build notification options
        const notificationId = this.generateNotificationId(extensionId);
        const iconUrl = await this.iconHandler.getExtensionIconUrl(extensionId, isEnabled);

        const title = t('notification_title');
        const message = previousVersion
            ? t('notification_message', [extensionName, previousVersion, currentVersion])
            : t('notification_message_first_install', [extensionName, currentVersion]);

        const settings = settingsStorage.get();

        // Button configuration based on extension state
        const buttonIconUrl = browser.runtime.getURL('assets/icons/icon-16.png');
        const extensionState: ExtensionState = {
            id: extensionId,
            enabled: isEnabled,
            name: extensionName,
            version: currentVersion,
            homepageUrl: extensionInfo.homepageUrl,
        };
        const { buttons } = this.buttonHandler.getButtonConfiguration(extensionState, buttonIconUrl);
        const options: UpdateNotificationOptions = {
            type: 'basic',
            iconUrl,
            title,
            message,
            buttons,
            priority: 2, // High priority for important extension updates
            requireInteraction: true, // Persistent notification requiring user interaction
            silent: !settings.notifications.soundEnabled,
        };

        try {
            await browser.notifications.create(notificationId, options);
            Logger.info(`Notification shown for ${extensionName} (${extensionId})`);

            // Store extension state for button click handling
            this.extensionStates.set(notificationId, {
                id: extensionId,
                enabled: isEnabled,
                name: extensionName,
                version: currentVersion,
                homepageUrl: extensionInfo.homepageUrl,
            });

            // Track active notification for state management
            const now = Date.now();
            this.activeNotifications.set(notificationId, {
                extensionId,
                version: currentVersion,
                shownAt: now,
            });

            // Save initial state (shown, not yet closed)
            await notificationStateStorage.saveState({
                extensionId,
                version: currentVersion,
                shownAt: now,
                dismissedByUser: false,
            });

            // Set up auto-close if enabled
            if (settings.notifications.autoCloseTimeout > 0) {
                this.scheduleAutoClose(notificationId, settings.notifications.autoCloseTimeout);
            }
        } catch (error) {
            Logger.error('Failed to show notification:', error);
        }
    }

    /**
     * Schedule auto-close for a notification
     */
    private scheduleAutoClose(notificationId: string, timeoutSeconds: number): void {
        // Clear any existing timeout for this notification
        const existingTimeout = this.autoCloseTimeouts.get(notificationId);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }

        // Schedule new timeout
        // Use global setTimeout (not window.setTimeout) for service worker compatibility
        const timeoutId = setTimeout(async () => {
            // Mark as auto-closed (timeout)
            await this.recordNotificationClosed(notificationId, NotificationCloseReason.Timeout);
            await this.clearNotification(notificationId.replace(NotificationService.NOTIFICATION_ID_PREFIX, ''));
            this.autoCloseTimeouts.delete(notificationId);
        }, timeoutSeconds * 1000);

        this.autoCloseTimeouts.set(notificationId, timeoutId);
    }

    /**
     * Generates a consistent notification ID for an extension
     */
    private generateNotificationId(extensionId: string): string {
        return `${NotificationService.NOTIFICATION_ID_PREFIX}${extensionId}`;
    }

    /**
     * Handles notification body click (opens updates page)
     */
    private handleNotificationClick = async (notificationId: string): Promise<void> => {
        try {
            // Get extension ID and version from notification
            const activeNotification = this.activeNotifications.get(notificationId);

            // Mark update as read if we have the extension info and storage
            if (activeNotification && this.updateStorage) {
                await this.updateStorage.markUpdateAsRead(
                    activeNotification.extensionId,
                    activeNotification.version,
                );
            }

            // Record as programmatic close (user interacted but via click, not dismiss)
            await this.recordNotificationClosed(notificationId, NotificationCloseReason.Programmatic);

            // Open the updates page
            await browser.tabs.create({
                url: NotificationService.OPTIONS_PAGE_URL,
            });

            // Clear the notification
            await browser.notifications.clear(notificationId);
        } catch (error) {
            Logger.error('Failed to handle notification click:', error);
        }
    };

    /**
     * Handles notification button clicks
     * Delegates to button handler for action execution
     */
    private handleButtonClick = async (
        notificationId: string,
        buttonIndex: number,
    ): Promise<void> => {
        try {
            const extensionState = this.extensionStates.get(notificationId);

            if (!extensionState) {
                Logger.warn('Extension state not found for notification:', notificationId);
                await browser.notifications.clear(notificationId);
                return;
            }

            // Execute button action and get close reason
            const closeReason = await this.buttonHandler.handleButtonClick(
                extensionState,
                buttonIndex,
            );

            // Record notification closure
            await this.recordNotificationClosed(notificationId, closeReason);

            // Clear the notification
            await browser.notifications.clear(notificationId);

            // Clean up stored state
            this.extensionStates.delete(notificationId);
        } catch (error) {
            Logger.error('Failed to handle button click:', error);
        }
    };

    /**
     * Handles notification closed event
     * This is called by the browser when a notification is closed
     */
    private handleNotificationClosed = async (
        notificationId: string,
        byUser: boolean,
    ): Promise<void> => {
        // Only record if we haven't already recorded the closure
        const activeNotification = this.activeNotifications.get(notificationId);
        if (activeNotification) {
            // If closed by user and not via button/click, it's a dismissal
            const closeReason: NotificationCloseReason = byUser
                ? NotificationCloseReason.User
                : NotificationCloseReason.Programmatic;
            await this.recordNotificationClosed(notificationId, closeReason);
        }
    };

    /**
     * Records that a notification was closed with a specific reason
     */
    private async recordNotificationClosed(
        notificationId: string,
        closeReason: NotificationCloseReason,
    ): Promise<void> {
        const activeNotification = this.activeNotifications.get(notificationId);
        if (!activeNotification) {
            return;
        }

        const now = Date.now();
        const dismissedByUser = closeReason === NotificationCloseReason.User;

        await notificationStateStorage.saveState({
            extensionId: activeNotification.extensionId,
            version: activeNotification.version,
            shownAt: activeNotification.shownAt,
            closedAt: now,
            closeReason,
            dismissedByUser,
        });

        // Clean up active notification tracking
        this.activeNotifications.delete(notificationId);

        Logger.info(
            `Notification closed for ${activeNotification.extensionId} - `
            + `reason: ${closeReason}, dismissed by user: ${dismissedByUser}`,
        );
    }

    /**
     * Handles notification state changes from other devices
     * Automatically clears notifications that were dismissed on another device
     */
    private handleRemoteStateChange = async (
        states: NotificationStatesStorage,
    ): Promise<void> => {
        // Check each state to see if a notification was dismissed on another device
        for (const [extensionId, state] of Object.entries(states)) {
            // If the notification was dismissed by user on another device
            if (state.dismissedByUser && state.closedAt) {
                const notificationId = this.generateNotificationId(extensionId);

                // Check if we have this notification active locally
                if (this.activeNotifications.has(notificationId)) {
                    Logger.info(`Auto-clearing notification for ${extensionId} - dismissed on another device`);
                    await this.clearNotification(extensionId);
                }
            }
        }
    };

    /**
     * Handles extension installation event
     * Shows welcome notification for first-time installations
     */
    private handleExtensionInstalled = (details: browser.Runtime.OnInstalledDetailsType): void => {
        if (details.reason === 'install') {
            Logger.info('Extension installed for the first time');
            this.showWelcomeNotification();
        }
    };

    /**
     * Handles notification settings button click
     * Opens the updates page with settings section
     */
    private handleShowSettings = async (): Promise<void> => {
        Logger.info('Notification settings clicked, opening updates page...');
        // Open the updates page with hash to navigate to settings section
        await browser.tabs.create({
            url: `${NotificationService.OPTIONS_PAGE_URL}#settings`,
        });
    };

    /**
     * Checks if there's an active notification for a specific extension
     * @param extensionId - The extension ID to check
     * @returns true if there's an active notification for this extension
     */
    async hasActiveNotification(extensionId: string): Promise<boolean> {
        const notificationId = this.generateNotificationId(extensionId);
        const hasActive = this.activeNotifications.has(notificationId);

        Logger.info(
            `Checking active notification for ${extensionId}: ${hasActive ? 'YES' : 'NO'}`,
        );

        return hasActive;
    }

    /**
     * Clears a notification for a specific extension
     */
    async clearNotification(extensionId: string): Promise<void> {
        const notificationId = this.generateNotificationId(extensionId);

        // Clear any auto-close timeout
        const timeoutId = this.autoCloseTimeouts.get(notificationId);
        if (timeoutId) {
            clearTimeout(timeoutId);
            this.autoCloseTimeouts.delete(notificationId);
        }

        // Clean up extension state
        this.extensionStates.delete(notificationId);
        this.activeNotifications.delete(notificationId);

        await browser.notifications.clear(notificationId);
    }

    /**
     * Clears all extension update notifications
     */
    async clearAllNotifications(): Promise<void> {
        const notifications = await browser.notifications.getAll();
        const updateNotifications = Object.keys(notifications)
            .filter((id) => id.startsWith(NotificationService.NOTIFICATION_ID_PREFIX));

        for (const notificationId of updateNotifications) {
            await browser.notifications.clear(notificationId);
        }
    }

    /**
     * Shows a welcome notification for first-time users
     */
    async showWelcomeNotification(): Promise<void> {
        // Check if notifications are enabled
        if (!settingsStorage.areNotificationsEnabled()) {
            Logger.info('Notifications are globally disabled, skipping welcome notification');
            return;
        }

        const notificationId = NotificationService.WELCOME_NOTIFICATION_ID;
        const title = t('notification_welcome_title');
        const message = t('notification_welcome_message');

        const settings = settingsStorage.get();

        // Button icons - using small icon for all buttons
        const buttonIconUrl = browser.runtime.getURL('assets/icons/icon-16.png');

        // Two buttons: View Updates and Dismiss
        const buttons: NotificationButton[] = [
            {
                title: t('notification_welcome_button_view_updates'),
                iconUrl: buttonIconUrl,
            },
            {
                title: t('notification_button_dismiss'),
                iconUrl: buttonIconUrl,
            },
        ];

        const options: UpdateNotificationOptions = {
            type: 'basic',
            iconUrl: browser.runtime.getURL('assets/icons/icon-128.png'),
            title,
            message,
            buttons,
            priority: 2,
            requireInteraction: true, // Keep it visible until user interacts
            silent: !settings.notifications.soundEnabled,
        };

        try {
            await browser.notifications.create(notificationId, options);
            Logger.info('Welcome notification shown');

            // Store a special state for the welcome notification
            this.extensionStates.set(notificationId, {
                id: NotificationService.WELCOME_EXTENSION_ID,
                enabled: true,
                name: NotificationService.EXTENSION_NAME,
                version: browser.runtime.getManifest().version,
            });
        } catch (error) {
            Logger.error('Failed to show welcome notification:', error);
        }
    }
}
