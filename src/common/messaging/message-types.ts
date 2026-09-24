/**
 * @file Message and payload types exchanged between UI pages and the background script.
 */

import type { UserSettings } from '../types/settings-types';

/**
 * Message types for communication between different parts of the extension
 */
export enum MessageType {
    /**
     * Sent when the updates/options page is opened
     * Used to clear the badge counter
     */
    UpdatesPageOpened = 'UpdatesPageOpened',

    /**
     * Sent to mark all extension updates as read
     * Used by popup/options pages to update storage through background
     */
    MarkAllAsRead = 'MarkAllAsRead',

    /**
     * Request to get all extension updates from storage
     * Used by UI pages to retrieve update data through background
     */
    GetUpdates = 'GetUpdates',

    /**
     * Request to get multiple extensions info from management API
     * Used by UI pages to retrieve info for multiple extensions in one call
     */
    GetExtensionsInfo = 'GetExtensionsInfo',

    /**
     * Request to mark a specific update as read
     * Used by UI pages to update read status through background
     */
    MarkUpdateAsRead = 'MarkUpdateAsRead',

    /**
     * Request to mark a set of updates as unread again
     * Used by the options page to undo a mark-all-as-read action
     */
    MarkUpdatesAsUnread = 'MarkUpdatesAsUnread',

    /**
     * Request to get current user settings
     * Used by UI pages to retrieve settings through background
     */
    GetSettings = 'GetSettings',

    /**
     * Request to update user settings
     * Used by UI pages to update settings through background
     */
    UpdateSettings = 'UpdateSettings',

    /**
     * Request to reset settings to defaults
     * Used by UI pages to reset settings through background
     */
    ResetSettings = 'ResetSettings',

    /**
     * Request to mute/unmute extension notifications
     * Used by UI pages to update extension mute status through background
     */
    SetExtensionMuted = 'SetExtensionMuted',

    /**
     * Request to get the last checked timestamp
     * Used by popup to retrieve when updates were last checked
     */
    GetLastCheckedTimestamp = 'GetLastCheckedTimestamp',

    /**
     * Request to set the last checked timestamp
     * Used by popup to update when updates were last checked
     */
    SetLastCheckedTimestamp = 'SetLastCheckedTimestamp',

}

/**
 * Base interface for all messages
 */
export interface BaseMessage {
    /**
     * Discriminant identifying which message shape this is.
     */
    type: MessageType;
}

/**
 * Message sent when updates page is opened
 */
export interface UpdatesPageOpenedMessage extends BaseMessage {
    /**
     * Discriminant for this message.
     */
    type: MessageType.UpdatesPageOpened;
}

/**
 * Message sent to mark all updates as read
 */
export interface MarkAllAsReadMessage extends BaseMessage {
    /**
     * Discriminant for this message.
     */
    type: MessageType.MarkAllAsRead;
}

/**
 * Message sent to request all extension updates
 */
export interface GetUpdatesMessage extends BaseMessage {
    /**
     * Discriminant for this message.
     */
    type: MessageType.GetUpdates;
}

/**
 * Message sent to request multiple extensions info
 */
export interface GetExtensionsInfoMessage extends BaseMessage {
    /**
     * Discriminant for this message.
     */
    type: MessageType.GetExtensionsInfo;

    /**
     * IDs of the extensions to fetch info for.
     */
    extensionIds: string[];
}

/**
 * Message sent to mark a specific update as read
 */
export interface MarkUpdateAsReadMessage extends BaseMessage {
    /**
     * Discriminant for this message.
     */
    type: MessageType.MarkUpdateAsRead;

    /**
     * ID of the extension whose update is being marked as read.
     */
    extensionId: string;

    /**
     * Version being marked as read; undefined marks the latest known version.
     */
    version?: string | undefined;
}

/**
 * A single update reference used when restoring unread state
 */
export interface UpdateRef {
    /**
     * ID of the extension the update belongs to.
     */
    extensionId: string;

    /**
     * Version of the referenced update.
     */
    version: string;
}

/**
 * Message sent to mark a set of updates as unread (undo of mark-all-as-read)
 */
export interface MarkUpdatesAsUnreadMessage extends BaseMessage {
    /**
     * Discriminant for this message.
     */
    type: MessageType.MarkUpdatesAsUnread;

    /**
     * Updates to restore to the unread state.
     */
    items: UpdateRef[];
}

/**
 * Message sent to request current settings
 */
export interface GetSettingsMessage extends BaseMessage {
    /**
     * Discriminant for this message.
     */
    type: MessageType.GetSettings;
}

/**
 * Message sent to update settings
 */
export interface UpdateSettingsMessage extends BaseMessage {
    /**
     * Discriminant for this message.
     */
    type: MessageType.UpdateSettings;

    /**
     * Partial settings to merge into the current user settings.
     */
    settings: Partial<UserSettings>;
}

/**
 * Message sent to reset settings to defaults
 */
export interface ResetSettingsMessage extends BaseMessage {
    /**
     * Discriminant for this message.
     */
    type: MessageType.ResetSettings;
}

/**
 * Message sent to mute/unmute extension notifications
 */
export interface SetExtensionMutedMessage extends BaseMessage {
    /**
     * Discriminant for this message.
     */
    type: MessageType.SetExtensionMuted;

    /**
     * ID of the extension whose mute status is being changed.
     */
    extensionId: string;

    /**
     * New mute status to apply.
     */
    muted: boolean;
}

/**
 * Message sent to request last checked timestamp
 */
export interface GetLastCheckedTimestampMessage extends BaseMessage {
    /**
     * Discriminant for this message.
     */
    type: MessageType.GetLastCheckedTimestamp;
}

/**
 * Message sent to set last checked timestamp
 */
export interface SetLastCheckedTimestampMessage extends BaseMessage {
    /**
     * Discriminant for this message.
     */
    type: MessageType.SetLastCheckedTimestamp;

    /**
     * New last-checked timestamp, in milliseconds since the epoch.
     */
    timestamp: number;
}

/**
 * Union type of all possible messages
 */
export type Message = | UpdatesPageOpenedMessage
    | MarkAllAsReadMessage
    | GetUpdatesMessage
    | GetExtensionsInfoMessage
    | MarkUpdateAsReadMessage
    | MarkUpdatesAsUnreadMessage
    | GetSettingsMessage
    | UpdateSettingsMessage
    | ResetSettingsMessage
    | SetExtensionMutedMessage
    | GetLastCheckedTimestampMessage
    | SetLastCheckedTimestampMessage;
