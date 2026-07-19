import { makeAutoObservable, runInAction } from 'mobx';

import { MessageSender } from '../../common/messaging/message-sender';
import { UpdateRef } from '../../common/messaging/message-types';
import { ExtensionInfo, ExtensionUpdate } from '../../common/update-storage';
import { getErrorMessage } from '../../common/utils/error';
import { Logger } from '../../common/utils/logger';

interface ExtensionVersionInfo {
    version: string;
    detectedTimestampMs: number;
    isRead?: boolean;
    previousVersion?: string;
    infoSnapshot?: any;
}

export class UpdatesStore {
    // Observable state
    updates: Map<string, ExtensionUpdate[]> = new Map();

    extensionInfoMap: Map<string, ExtensionInfo> = new Map();

    isLoading = false;

    error: string | null = null;

    constructor() {
        makeAutoObservable(this);
        // Auto-load on initialization
        this.loadUpdates();
    }

    /**
     * Load all updates from background page via messaging
     */
    async loadUpdates(showLoadingState = true) {
        if (showLoadingState) {
            this.isLoading = true;
        }
        this.error = null;
        try {
            const storageData = await MessageSender.getUpdates();

            if (!storageData || Object.keys(storageData).length === 0) {
                runInAction(() => {
                    this.updates = new Map();
                    this.isLoading = false;
                });
                return;
            }

            // Transform storage data to UI-friendly format
            const updatesMap = new Map<string, ExtensionUpdate[]>();

            for (const [extensionId, data] of Object.entries(storageData)) {
                const extensionUpdates = data.updateHistory.map((versionInfo: ExtensionVersionInfo, index: number) => {
                    // Determine previous version from the history
                    const prevVersion = index > 0
                        ? data.updateHistory[index - 1].version
                        : versionInfo.previousVersion;

                    const extensionUpdate: ExtensionUpdate = {
                        extensionId,
                        version: versionInfo.version,
                        previousVersion: prevVersion,
                        updateDate: new Date(versionInfo.detectedTimestampMs).toISOString(),
                        isRead: versionInfo.isRead ?? false,
                        notes: undefined, // Could be added from infoSnapshot if available
                    };
                    return extensionUpdate;
                });

                if (extensionUpdates.length > 0) {
                    updatesMap.set(extensionId, extensionUpdates);
                }
            }

            // Load extension info for all extensions with updates
            const extensionIds = Array.from(updatesMap.keys());
            await this.loadExtensionInfo(extensionIds);

            runInAction(() => {
                this.updates = updatesMap;
                this.isLoading = false;
            });
        } catch (err) {
            runInAction(() => {
                this.error = getErrorMessage(err);
                this.isLoading = false;
            });
            Logger.error('Failed to load updates:', err);
        }
    }

    /**
     * Load extension info for multiple extensions
     */
    private async loadExtensionInfo(extensionIds: string[]) {
        if (extensionIds.length === 0) {
            return;
        }

        const infoMap = new Map<string, ExtensionInfo>();

        try {
            // Fetch all extension info in a single message call
            const infoRecord = await MessageSender.getExtensionsInfo(extensionIds);

            // Convert record to Map
            for (const [extensionId, info] of Object.entries(infoRecord)) {
                if (info) {
                    infoMap.set(extensionId, info);
                }
            }
        } catch (err) {
            Logger.error('Failed to get extensions info:', getErrorMessage(err));
        }

        runInAction(() => {
            this.extensionInfoMap = infoMap;
        });
    }

    /**
     * Get extension info for a specific extension
     */
    getExtensionInfo(extensionId: string): ExtensionInfo | null {
        return this.extensionInfoMap.get(extensionId) ?? null;
    }

    /**
     * Get all extension IDs that have updates
     */
    get extensionIds(): string[] {
        return Array.from(this.updates.keys());
    }

    /**
     * Get updates for a specific extension
     */
    getUpdatesForExtension(extensionId: string): ExtensionUpdate[] {
        return this.updates.get(extensionId) || [];
    }

    /**
     * Get total number of updates across all extensions
     */
    get totalUpdateCount(): number {
        let count = 0;
        for (const updates of this.updates.values()) {
            count += updates.length;
        }
        return count;
    }

    /**
     * Get total number of unread updates
     */
    get unreadUpdateCount(): number {
        let count = 0;
        for (const updates of this.updates.values()) {
            count += updates.filter((u) => !u.isRead).length;
        }
        return count;
    }

    /**
     * Mark all updates as read via background page messaging
     *
     * @returns References to the updates that were unread before the action,
     * so the caller can offer an undo; empty array if nothing changed or on error
     */
    async markAllAsRead(): Promise<UpdateRef[]> {
        // Snapshot the unread set before the bulk action so it can be restored
        const snapshot: UpdateRef[] = [];
        for (const updates of this.updates.values()) {
            for (const update of updates) {
                if (!update.isRead) {
                    snapshot.push({ extensionId: update.extensionId, version: update.version });
                }
            }
        }

        try {
            await MessageSender.markAllAsRead();
            // Reload to update UI without showing loading state (smoother UX)
            await this.loadUpdates(false);
            return snapshot;
        } catch (err) {
            Logger.error('Failed to mark all as read:', getErrorMessage(err));
            return [];
        }
    }

    /**
     * Mark a single update as read via background page messaging
     */
    async markUpdateAsRead(extensionId: string, version: string) {
        try {
            await MessageSender.markUpdateAsRead(extensionId, version);
            await this.loadUpdates(false);
        } catch (err) {
            Logger.error('Failed to mark update as read:', getErrorMessage(err));
        }
    }

    /**
     * Restore a set of updates to unread (undo of mark-all-as-read)
     */
    async markUpdatesAsUnread(items: UpdateRef[]) {
        if (items.length === 0) {
            return;
        }
        try {
            await MessageSender.markUpdatesAsUnread(items);
            await this.loadUpdates(false);
        } catch (err) {
            Logger.error('Failed to mark updates as unread:', getErrorMessage(err));
        }
    }
}
