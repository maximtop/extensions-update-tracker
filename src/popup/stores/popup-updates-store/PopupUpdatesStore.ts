import { makeAutoObservable, runInAction } from 'mobx';

import { EXTENSION_DEFAULTS } from '../../../common/constants';
import { MessageSender } from '../../../common/messaging/message-sender';
import { getErrorMessage } from '../../../common/utils/error';
import { Logger } from '../../../common/utils/logger';

import type { ExtensionsUpdateStorageType } from '../../../common/update-storage';

/**
 * Represents the most recent unread update to display in the popup.
 */
export interface UnreadUpdate {
    extensionId: string;
    extensionName: string;
    version: string;
    previousVersion?: string;
    timestamp: number;
    icon?: string;
}

/**
 * MobX store managing popup-specific update state.
 * Tracks unread counts, total updates, latest unread update, and last checked timestamp.
 */
export class PopupUpdatesStore {
    // Observable state
    unreadCount = 0;

    updateCount = 0;

    latestUnread: UnreadUpdate | null = null;

    lastChecked: number | null = null;

    isLoading = false;

    error: string | null = null;

    constructor() {
        makeAutoObservable(this);
        // Auto-load on initialization: MobX stores should be self-contained and ready to use.
        // Loading data in constructor ensures the store is immediately usable when created,
        // simplifying component code and preventing "forgot to load" bugs.
        this.loadUpdateCounts();
    }

    /**
     * Load update counts and metadata from background page
     */
    async loadUpdateCounts(showLoadingState = true) {
        if (showLoadingState) {
            this.isLoading = true;
        }
        this.error = null;

        try {
            // Get update data through message passing
            const storageData = await MessageSender.getUpdates() as ExtensionsUpdateStorageType;

            // Load last checked timestamp through message passing
            const lastCheckedTimestamp = await MessageSender.getLastCheckedTimestamp();

            if (!storageData || Object.keys(storageData).length === 0) {
                runInAction(() => {
                    this.unreadCount = 0;
                    this.updateCount = 0;
                    this.latestUnread = null;
                    this.lastChecked = lastCheckedTimestamp;
                    this.isLoading = false;
                });
                return;
            }

            let totalUpdates = 0;
            let totalUnread = 0;
            let mostRecentUnread: UnreadUpdate | null = null;
            let mostRecentTimestamp = 0;

            for (const [extensionId, data] of Object.entries(storageData)) {
                totalUpdates += data.updateHistory.length;

                const unreadUpdates = data.updateHistory.filter((u) => !u.isRead);
                totalUnread += unreadUpdates.length;

                // Find the most recent unread update
                for (const update of unreadUpdates) {
                    if (update.detectedTimestampMs > mostRecentTimestamp) {
                        mostRecentTimestamp = update.detectedTimestampMs;

                        // Try to get extension info from snapshot first
                        const extensionName = update.infoSnapshot?.name || EXTENSION_DEFAULTS.UNKNOWN_NAME;
                        const icon = update.infoSnapshot?.icons?.[0]?.url;

                        mostRecentUnread = {
                            extensionId,
                            extensionName,
                            version: update.version,
                            previousVersion: update.previousVersion,
                            timestamp: update.detectedTimestampMs,
                            icon,
                        };
                    }
                }
            }

            runInAction(() => {
                this.updateCount = totalUpdates;
                this.unreadCount = totalUnread;
                this.latestUnread = mostRecentUnread;
                this.lastChecked = lastCheckedTimestamp;
                this.isLoading = false;
            });

            // Update last checked timestamp through message passing
            const now = Date.now();
            await MessageSender.setLastCheckedTimestamp(now);

            runInAction(() => {
                this.lastChecked = now;
            });
        } catch (err) {
            runInAction(() => {
                this.error = getErrorMessage(err);
                this.isLoading = false;
            });
            Logger.error('Failed to load update counts:', err);
        }
    }

    /**
     * Mark all updates as read via background page messaging
     */
    async markAllAsRead() {
        try {
            await MessageSender.markAllAsRead();
            // Reload needed: The background service updates storage directly. UI must reload
            // to sync with the new state (all isRead flags now true, unreadCount = 0).
            // Loading without spinner provides smoother UX since user expects instant feedback.
            await this.loadUpdateCounts(false);
        } catch (err) {
            this.error = getErrorMessage(err);
            Logger.error('Failed to mark all as read:', err);
        }
    }
}
