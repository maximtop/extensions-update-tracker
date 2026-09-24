import browser from 'webextension-polyfill';

import { getErrorMessage } from '../utils/error';
import { Logger } from '../utils/logger';

import { MessageType } from './message-types';

import type { ExtensionInfo, ExtensionsUpdateStorageType } from '../update-storage';
import type { Message, UpdateRef } from './message-types';

/**
 * Service for sending messages to the background script
 */
export class MessageSender {
    /**
     * Sends a message to the background script
     *
     * @param message The message to send
     *
     * @returns Promise that resolves with the response from the background script
     */
    static async send<T = void>(message: Message): Promise<T> {
        try {
            const response: unknown = await browser.runtime.sendMessage(message);
            return response as T;
        } catch (error) {
            // Background script might not be ready yet, log but don't throw
            Logger.warn(`Failed to send message: ${message.type}, ${getErrorMessage(error)}`);
            throw error;
        }
    }

    /**
     * Notifies the background script that the updates page was opened
     * This triggers the badge to be cleared
     */
    static async notifyUpdatesPageOpened(): Promise<void> {
        await this.send({ type: MessageType.UpdatesPageOpened });
    }

    /**
     * Requests the background script to mark all updates as read
     * This updates storage through the background page to ensure consistency
     */
    static async markAllAsRead(): Promise<void> {
        await this.send({ type: MessageType.MarkAllAsRead });
    }

    /**
     * Requests all extension updates from the background script
     *
     * @returns Promise that resolves with the extensions update storage data
     */
    static async getUpdates(): Promise<ExtensionsUpdateStorageType> {
        return this.send({ type: MessageType.GetUpdates });
    }

    /**
     * Requests multiple extensions info from the background script
     *
     * @param extensionIds Array of extension IDs to get info for
     *
     * @returns Promise that resolves with a map of extension IDs to extension info
     */
    static async getExtensionsInfo(extensionIds: string[]): Promise<Record<string, ExtensionInfo>> {
        return this.send({ type: MessageType.GetExtensionsInfo, extensionIds });
    }

    /**
     * Requests the background script to mark a specific update as read
     *
     * @param extensionId The ID of the extension
     * @param version Optional version to mark as read (defaults to latest)
     */
    static async markUpdateAsRead(extensionId: string, version?: string): Promise<void> {
        await this.send({ type: MessageType.MarkUpdateAsRead, extensionId, version });
    }

    /**
     * Requests the background script to mark a set of updates as unread again
     * Used to undo a mark-all-as-read action
     *
     * @param items References to the updates to restore
     */
    static async markUpdatesAsUnread(items: UpdateRef[]): Promise<void> {
        await this.send({ type: MessageType.MarkUpdatesAsUnread, items });
    }

    /**
     * Requests the last checked timestamp from the background script
     *
     * @returns Promise that resolves with the timestamp or null
     */
    static async getLastCheckedTimestamp(): Promise<number | null> {
        return this.send<number | null>({ type: MessageType.GetLastCheckedTimestamp });
    }

    /**
     * Sets the last checked timestamp via the background script
     *
     * @param timestamp The timestamp to set
     */
    static async setLastCheckedTimestamp(timestamp: number): Promise<void> {
        await this.send({ type: MessageType.SetLastCheckedTimestamp, timestamp });
    }
}
