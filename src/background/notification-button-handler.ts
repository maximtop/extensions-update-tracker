/**
 * @file Handles notification button clicks and determines button configurations.
 */

import browser from 'webextension-polyfill';

import { NotificationCloseReason } from '../common/types/notification-types';
import { t } from '../common/utils/i18n';
import { Logger } from '../common/utils/logger';

import type { NotificationButton } from '../common/types/notification-types';

/**
 * Extension fields needed to decide which notification buttons to show and how to
 * handle clicking them.
 */
interface ExtensionState {
    /**
     * Extension id, or the literal `'welcome'` for the onboarding notification.
     */
    id: string;

    /**
     * Current enabled state of the extension.
     */
    enabled: boolean;

    /**
     * Display name of the extension.
     */
    name: string;

    /**
     * Current version of the extension.
     */
    version: string;

    /**
     * Extension's homepage URL, when it declares one.
     */
    homepageUrl?: string | undefined;
}

/**
 * Buttons to render on a notification, in display order.
 */
interface ButtonConfig {
    /**
     * Buttons to render, in display order.
     */
    buttons: NotificationButton[];
}

/**
 * Decides which buttons a notification shows for a given extension state, and
 * carries out the action when one of them is clicked.
 */
export class NotificationButtonHandler {
    private static readonly OPTIONS_PAGE_URL = browser.runtime.getURL('options.html');

    private static readonly WELCOME_EXTENSION_ID = 'welcome';

    /**
     * Determines which buttons to show based on extension state
     *
     * @param extensionState State of the extension the notification is about.
     * @param buttonIconUrl Icon URL applied to every button in the returned configuration.
     */
    getButtonConfiguration(
        extensionState: ExtensionState,
        buttonIconUrl: string,
    ): ButtonConfig {
        // Welcome notification buttons
        if (extensionState.id === NotificationButtonHandler.WELCOME_EXTENSION_ID) {
            return {
                buttons: [
                    {
                        title: t('notification_welcome_button_view_updates'),
                        iconUrl: buttonIconUrl,
                    },
                    {
                        title: t('notification_button_dismiss'),
                        iconUrl: buttonIconUrl,
                    },
                ],
            };
        }

        // Disabled extensions: show Enable and Uninstall
        if (!extensionState.enabled) {
            return {
                buttons: [
                    {
                        title: t('notification_button_enable'),
                        iconUrl: buttonIconUrl,
                    },
                    {
                        title: t('notification_button_uninstall'),
                        iconUrl: buttonIconUrl,
                    },
                ],
            };
        }

        // Enabled extensions
        if (extensionState.homepageUrl) {
            // Has homepage: show Visit Website and Dismiss
            return {
                buttons: [
                    {
                        title: t('notification_button_visit_website'),
                        iconUrl: buttonIconUrl,
                    },
                    {
                        title: t('notification_button_dismiss'),
                        iconUrl: buttonIconUrl,
                    },
                ],
            };
        }

        // No homepage: show View Details and Dismiss
        return {
            buttons: [
                {
                    title: t('notification_button_view_details'),
                    iconUrl: buttonIconUrl,
                },
                {
                    title: t('notification_button_dismiss'),
                    iconUrl: buttonIconUrl,
                },
            ],
        };
    }

    /**
     * Handles button click and executes the appropriate action
     * Returns the close reason for state tracking
     *
     * @param extensionState State of the extension the notification is about.
     * @param buttonIndex Index of the clicked button, matching the order from
     * {@link getButtonConfiguration}.
     */
    async handleButtonClick(
        extensionState: ExtensionState,
        buttonIndex: number,
    ): Promise<NotificationCloseReason> {
        // Welcome notification buttons
        if (extensionState.id === NotificationButtonHandler.WELCOME_EXTENSION_ID) {
            return this.handleWelcomeButtonClick(buttonIndex);
        }

        // Disabled extension buttons
        if (!extensionState.enabled) {
            return this.handleDisabledExtensionButtonClick(extensionState, buttonIndex);
        }

        // Enabled extension buttons
        return this.handleEnabledExtensionButtonClick(extensionState, buttonIndex);
    }

    /**
     * Handles welcome notification button clicks
     *
     * @param buttonIndex Index of the clicked button: 0 opens the options page, other values dismiss.
     */
    private async handleWelcomeButtonClick(buttonIndex: number): Promise<NotificationCloseReason> {
        if (buttonIndex === 0) {
            // View Updates button
            await browser.tabs.create({
                url: NotificationButtonHandler.OPTIONS_PAGE_URL,
            });
            return NotificationCloseReason.Programmatic;
        }

        // Dismiss button (index 1)
        return NotificationCloseReason.User;
    }

    /**
     * Handles disabled extension button clicks
     *
     * @param extensionState State of the extension the notification is about.
     * @param buttonIndex Index of the clicked button: 0 enables the extension, other values uninstall it.
     */
    private async handleDisabledExtensionButtonClick(
        extensionState: ExtensionState,
        buttonIndex: number,
    ): Promise<NotificationCloseReason> {
        if (buttonIndex === 0) {
            // Enable button
            try {
                await browser.management.setEnabled(extensionState.id, true);
                Logger.info(`Enabled extension: ${extensionState.id}`);
            } catch (error) {
                Logger.error('Failed to enable extension:', error);
            }
            return NotificationCloseReason.Programmatic;
        }

        // Uninstall button (index 1)
        try {
            await browser.management.uninstall(extensionState.id);
            Logger.info(`Uninstalled extension: ${extensionState.id}`);
        } catch (error) {
            Logger.error('Failed to uninstall extension:', error);
        }
        return NotificationCloseReason.Programmatic;
    }

    /**
     * Handles enabled extension button clicks
     *
     * @param extensionState State of the extension the notification is about.
     * @param buttonIndex Index of the clicked button: 0 opens the homepage or options page,
     * other values dismiss.
     */
    private async handleEnabledExtensionButtonClick(
        extensionState: ExtensionState,
        buttonIndex: number,
    ): Promise<NotificationCloseReason> {
        if (buttonIndex === 0) {
            // Visit Website or View Details button
            if (extensionState.homepageUrl) {
                await browser.tabs.create({
                    url: extensionState.homepageUrl,
                });
            } else {
                await browser.tabs.create({
                    url: NotificationButtonHandler.OPTIONS_PAGE_URL,
                });
            }
            return NotificationCloseReason.Programmatic;
        }

        // Dismiss button (index 1)
        return NotificationCloseReason.User;
    }
}
