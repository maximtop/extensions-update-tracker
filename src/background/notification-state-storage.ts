/**
 * Storage service for notification interaction states
 * Uses browser.storage.local to persist dismissed notification states
 */

import * as v from 'valibot';

import { NotificationCloseReason } from '../common/types/notification-types';
import { Logger } from '../common/utils/logger';

import { StorageKey, storageService } from './storage-service';

import type { NotificationInteractionState, NotificationStatesStorage } from '../common/types/notification-types';

/**
 * Valibot schema for NotificationInteractionState
 */
const NotificationInteractionStateSchema = v.object({
    extensionId: v.string(),
    version: v.string(),
    shownAt: v.number(),
    closedAt: v.optional(v.number()),
    closeReason: v.optional(v.enum(NotificationCloseReason)),
    dismissedByUser: v.boolean(),
});

/**
 * Valibot schema for NotificationStatesStorage
 */
const NotificationStatesStorageSchema = v.record(
    v.string(),
    NotificationInteractionStateSchema,
);

/**
 * Storage key for notification states with validation
 */
const NOTIFICATION_STATES_KEY = new StorageKey<NotificationStatesStorage>(
    'notification_states',
    {},
    NotificationStatesStorageSchema,
);

export class NotificationStateStorage {
    private static readonly STATE_EXPIRY_DAYS = 30; // States expire after 30 days

    private static readonly VALID_EXTENSION_ID_LENGTH = 32; // Chrome extension IDs are always 32 characters

    private changeListeners: Array<(changes: NotificationStatesStorage) => void> = [];

    /**
     * Gets the notification state for a specific extension
     */
    async getState(extensionId: string): Promise<NotificationInteractionState | null> {
        const states = await storageService.get(NOTIFICATION_STATES_KEY);
        return states[extensionId] || null;
    }

    /**
     * Gets all notification states
     */
    async getAllStates(): Promise<NotificationStatesStorage> {
        return storageService.get(NOTIFICATION_STATES_KEY);
    }

    /**
     * Saves a notification state
     */
    async saveState(state: NotificationInteractionState): Promise<void> {
        let states = await this.getAllStates();
        states[state.extensionId] = state;

        // Clean up expired states
        states = await this.cleanupExpiredStates(states);

        await storageService.set(NOTIFICATION_STATES_KEY, states);
    }

    /**
     * Checks if a notification was dismissed by the user for a specific version
     */
    async wasDismissedByUser(extensionId: string, version: string): Promise<boolean> {
        const state = await this.getState(extensionId);

        if (!state) {
            return false;
        }

        // Check if the state is for the same version and was dismissed by user
        return state.version === version && state.dismissedByUser;
    }

    /**
     * Clears the dismissed state for an extension (e.g., when showing notification for new version)
     */
    async clearState(extensionId: string): Promise<void> {
        const states = await this.getAllStates();
        delete states[extensionId];
        await storageService.set(NOTIFICATION_STATES_KEY, states);
    }

    /**
     * Clears all notification states
     */
    async clearAllStates(): Promise<void> {
        await storageService.remove(NOTIFICATION_STATES_KEY);
    }

    /**
     * Removes expired notification states and invalid keys
     */
    private async cleanupExpiredStates(
        inputStates: NotificationStatesStorage,
    ): Promise<NotificationStatesStorage> {
        const now = Date.now();
        const expiryTime = NotificationStateStorage.STATE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
        const cleanedStates: NotificationStatesStorage = {};

        Object.entries(inputStates).forEach(([extensionId, state]) => {
            // Remove states with invalid extension IDs (must be exactly 32 characters)
            if (extensionId.length !== NotificationStateStorage.VALID_EXTENSION_ID_LENGTH) {
                const logMsg = `Removing orphaned notification state with invalid key: ${extensionId}`
                    + ` (length: ${extensionId.length})`;
                Logger.info(logMsg);
                return;
            }

            const stateAge = now - state.shownAt;

            // Remove expired states
            if (stateAge > expiryTime) {
                return;
            }

            cleanedStates[extensionId] = state;
        });

        return cleanedStates;
    }

    /**
     * Cleans up orphaned notification states for uninstalled extensions
     * Also removes states with invalid extension IDs (keys that are not exactly 32 characters)
     */
    async cleanupOrphanedStates(installedExtensionIds: Set<string>): Promise<void> {
        const allStates = await this.getAllStates();
        const states = { ...allStates };
        let hasChanges = false;
        const entriesToDelete: string[] = [];

        Object.entries(states).forEach(([extensionId]) => {
            // Remove states with invalid extension IDs
            if (extensionId.length !== NotificationStateStorage.VALID_EXTENSION_ID_LENGTH) {
                const logMsg = `Removing orphaned notification state with invalid key: ${extensionId}`
                    + ` (length: ${extensionId.length})`;
                Logger.info(logMsg);
                entriesToDelete.push(extensionId);
                hasChanges = true;
                return;
            }

            // Remove states for extensions that are no longer installed
            if (!installedExtensionIds.has(extensionId)) {
                Logger.info(`Removing orphaned notification state for uninstalled extension: ${extensionId}`);
                entriesToDelete.push(extensionId);
                hasChanges = true;
            }
        });

        // Delete marked entries
        entriesToDelete.forEach((extensionId) => {
            delete states[extensionId];
        });

        // Only update storage if there were changes
        if (hasChanges) {
            await storageService.set(NOTIFICATION_STATES_KEY, states);
        }
    }

    /**
     * Adds a listener for notification state changes
     */
    addChangeListener(listener: (changes: NotificationStatesStorage) => void): void {
        this.changeListeners.push(listener);
    }

    /**
     * Removes a change listener
     */
    removeChangeListener(listener: (changes: NotificationStatesStorage) => void): void {
        const index = this.changeListeners.indexOf(listener);
        if (index !== -1) {
            this.changeListeners.splice(index, 1);
        }
    }

    /**
     * Gets the list of change listeners (for testing purposes)
     */
    getChangeListeners(): Array<(changes: NotificationStatesStorage) => void> {
        return this.changeListeners;
    }
}

// Export singleton instance
export const notificationStateStorage = new NotificationStateStorage();
