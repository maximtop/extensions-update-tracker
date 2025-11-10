/**
 * Badge service for displaying unread update count on the extension icon
 */

import browser from 'webextension-polyfill';

import { MessageDispatcherService } from '../common/messaging/message-handler';
import { MessageType } from '../common/messaging/message-types';
import { Logger } from '../common/utils/logger';

import { ExtensionsUpdateStorage } from './extensions-update-storage';

/**
 * Service responsible for managing the extension's badge counter.
 * Displays the number of unread extension updates and automatically
 * clears when the updates page is opened.
 */
export class BadgeService {
    private static readonly BADGE_COLOR = '#FF0000'; // Red background

    private static readonly BADGE_TEXT_COLOR = '#FFFFFF'; // White text

    /** Maximum number to display before showing overflow indicator */
    private static readonly MAX_BADGE_COUNT = 99;

    /** Suffix to indicate count exceeds maximum (universally understood across all locales) */
    private static readonly OVERFLOW_SUFFIX = '+';

    constructor(
        private storage: ExtensionsUpdateStorage,
        private messageDispatcher: MessageDispatcherService,
    ) {
        // Self-initializing pattern: init() is called in constructor to ensure badge is
        // immediately set when service is created. This prevents race conditions where
        // badge might not be set if init() call is forgotten or delayed.
        this.init();
    }

    private init() {
        // Initial badge update
        this.updateBadge();

        // Subscribe to updates page opened event to clear badge
        this.messageDispatcher.on(MessageType.UpdatesPageOpened, () => {
            this.clearBadge();
        });
    }

    /**
     * Updates the badge to show the count of unread updates
     */
    async updateBadge(): Promise<void> {
        try {
            const unreadCount = this.getUnreadCount();

            if (unreadCount === 0) {
                // Clear badge when no unread updates
                await browser.action.setBadgeText({ text: '' });
            } else {
                // Display count with overflow indicator for values exceeding maximum
                const badgeText = unreadCount > BadgeService.MAX_BADGE_COUNT
                    ? `${BadgeService.MAX_BADGE_COUNT}${BadgeService.OVERFLOW_SUFFIX}`
                    : unreadCount.toString();
                await browser.action.setBadgeText({ text: badgeText });
                await browser.action.setBadgeBackgroundColor({ color: BadgeService.BADGE_COLOR });
                // Note: setBadgeTextColor is synchronous per Chrome API docs,
                // but webextension-polyfill wraps it as async
                browser.action.setBadgeTextColor({ color: BadgeService.BADGE_TEXT_COLOR });
            }

            Logger.info(`Badge updated: ${unreadCount} unread update(s)`);
        } catch (error) {
            Logger.error('Failed to update badge:', error);
        }
    }

    /**
     * Gets the count of unread updates
     */
    private getUnreadCount(): number {
        // Direct storage access is intentional: This service needs synchronous access to
        // compute badge count. Adding a service layer would add unnecessary abstraction
        // without providing benefit since ExtensionsUpdateStorage already encapsulates storage logic.
        const storageData = this.storage.getStorage();

        if (!storageData) {
            return 0;
        }

        let unreadCount = 0;

        for (const extensionData of Object.values(storageData)) {
            // Count updates that are marked as unread (isRead !== true)
            for (const update of extensionData.updateHistory) {
                if (!update.isRead) {
                    unreadCount += 1;
                }
            }
        }

        return unreadCount;
    }

    /**
     * Clears the badge
     */
    async clearBadge(): Promise<void> {
        try {
            await browser.action.setBadgeText({ text: '' });
            Logger.info('Badge cleared');
        } catch (error) {
            Logger.error('Failed to clear badge:', error);
        }
    }

    /**
     * Manually triggers a badge update
     * This should be called when the storage is updated
     */
    async refresh(): Promise<void> {
        await this.updateBadge();
    }
}
