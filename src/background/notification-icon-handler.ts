/**
 * Handles icon retrieval and manipulation for notifications
 */

import browser from 'webextension-polyfill';

import { Logger } from '../common/utils/logger';

export class NotificationIconHandler {
    private static readonly ICON_SIZE = 48;

    /**
     * Gets the icon URL for an extension
     * Service workers can't access chrome:// URLs or Canvas API,
     * so we use the extension's own icon for all notifications
     */
    async getExtensionIconUrl(extensionId: string, isEnabled: boolean): Promise<string> {
        // Use our extension's icon for all notifications
        // Service workers can't fetch chrome://extension-icon/ URLs or use Canvas API
        // to convert icons to grayscale, so we use a consistent icon for all notifications
        const iconUrl = browser.runtime.getURL('assets/icons/icon-48.png');

        Logger.info(`Using notification icon for extension ${extensionId} (enabled: ${isEnabled})`);

        return iconUrl;
    }
}
