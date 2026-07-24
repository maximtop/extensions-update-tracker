import { makeAutoObservable, runInAction } from 'mobx';

import { EXTENSION_DEFAULTS } from '../../../common/constants';
import { MessageSender } from '../../../common/messaging/message-sender';
import { getErrorMessage } from '../../../common/utils/error';
import { Logger } from '../../../common/utils/logger';

import type { ExtensionsUpdateStorageType } from '../../../common/update-storage';

/**
 * Represents an unread update to display in the popup.
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
 * How many unread updates the popup lists before collapsing the rest
 * into a "+N more" link to the options page
 */
export const MAX_VISIBLE_UNREAD = 3;

/**
 * MobX store managing popup-specific update state.
 * Tracks unread counts, total updates, recent unread updates, and last checked timestamp.
 */
export class PopupUpdatesStore {
    // Observable state
    unreadCount = 0;

    updateCount = 0;

    /** Most recent unread updates, newest first, capped at MAX_VISIBLE_UNREAD */
    recentUnread: UnreadUpdate[] = [];

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
                    this.recentUnread = [];
                    this.lastChecked = lastCheckedTimestamp;
                    this.isLoading = false;
                });
                return;
            }

            let totalUpdates = 0;
            const allUnread: UnreadUpdate[] = [];

            for (const [extensionId, data] of Object.entries(storageData)) {
                totalUpdates += data.updateHistory.length;

                for (const update of data.updateHistory.filter((u) => !u.isRead)) {
                    // Try to get extension info from snapshot first
                    const extensionName = update.infoSnapshot?.name || EXTENSION_DEFAULTS.UNKNOWN_NAME;
                    // Pick the largest icon so it stays sharp at display size
                    const icons = update.infoSnapshot?.icons;
                    const icon = icons && icons.length > 0
                        ? icons.reduce((prev, current) => (current.size > prev.size ? current : prev)).url
                        : undefined;

                    allUnread.push({
                        extensionId,
                        extensionName,
                        version: update.version,
                        previousVersion: update.previousVersion,
                        timestamp: update.detectedTimestampMs,
                        icon,
                    });
                }
            }

            allUnread.sort((a, b) => b.timestamp - a.timestamp);

            runInAction(() => {
                this.updateCount = totalUpdates;
                this.unreadCount = allUnread.length;
                this.recentUnread = allUnread.slice(0, MAX_VISIBLE_UNREAD);
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
