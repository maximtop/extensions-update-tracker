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
    SetLastCheckedTimestamp = 'SetLastCheckedTimestamp'

}

/**
 * Base interface for all messages
 */
export interface BaseMessage {
    type: MessageType;
}

/**
 * Message sent when updates page is opened
 */
export interface UpdatesPageOpenedMessage extends BaseMessage {
    type: MessageType.UpdatesPageOpened;
}

/**
 * Message sent to mark all updates as read
 */
export interface MarkAllAsReadMessage extends BaseMessage {
    type: MessageType.MarkAllAsRead;
}

/**
 * Message sent to request all extension updates
 */
export interface GetUpdatesMessage extends BaseMessage {
    type: MessageType.GetUpdates;
}

/**
 * Message sent to request multiple extensions info
 */
export interface GetExtensionsInfoMessage extends BaseMessage {
    type: MessageType.GetExtensionsInfo;
    extensionIds: string[];
}

/**
 * Message sent to mark a specific update as read
 */
export interface MarkUpdateAsReadMessage extends BaseMessage {
    type: MessageType.MarkUpdateAsRead;
    extensionId: string;
    version?: string;
}

/**
 * Message sent to request current settings
 */
export interface GetSettingsMessage extends BaseMessage {
    type: MessageType.GetSettings;
}

/**
 * Message sent to update settings
 */
export interface UpdateSettingsMessage extends BaseMessage {
    type: MessageType.UpdateSettings;
    settings: Partial<UserSettings>;
}

/**
 * Message sent to reset settings to defaults
 */
export interface ResetSettingsMessage extends BaseMessage {
    type: MessageType.ResetSettings;
}

/**
 * Message sent to mute/unmute extension notifications
 */
export interface SetExtensionMutedMessage extends BaseMessage {
    type: MessageType.SetExtensionMuted;
    extensionId: string;
    muted: boolean;
}

/**
 * Message sent to request last checked timestamp
 */
export interface GetLastCheckedTimestampMessage extends BaseMessage {
    type: MessageType.GetLastCheckedTimestamp;
}

/**
 * Message sent to set last checked timestamp
 */
export interface SetLastCheckedTimestampMessage extends BaseMessage {
    type: MessageType.SetLastCheckedTimestamp;
    timestamp: number;
}

/**
 * Union type of all possible messages
 */
export type Message =
    | UpdatesPageOpenedMessage
    | MarkAllAsReadMessage
    | GetUpdatesMessage
    | GetExtensionsInfoMessage
    | MarkUpdateAsReadMessage
    | GetSettingsMessage
    | UpdateSettingsMessage
    | ResetSettingsMessage
    | SetExtensionMutedMessage
    | GetLastCheckedTimestampMessage
    | SetLastCheckedTimestampMessage;
