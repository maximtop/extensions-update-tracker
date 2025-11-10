/**
 * Handles notification button clicks and determines button configurations
 */

import browser from 'webextension-polyfill';

import { NotificationCloseReason } from '../common/types/notification-types';
import { t } from '../common/utils/i18n';
import { Logger } from '../common/utils/logger';

import type { NotificationButton } from '../common/types/notification-types';

interface ExtensionState {
    id: string;
    enabled: boolean;
    name: string;
    version: string;
    homepageUrl?: string;
}

interface ButtonConfig {
    buttons: NotificationButton[];
}

export class NotificationButtonHandler {
    private static readonly OPTIONS_PAGE_URL = browser.runtime.getURL('options.html');

    private static readonly WELCOME_EXTENSION_ID = 'welcome';

    /**
     * Determines which buttons to show based on extension state
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
