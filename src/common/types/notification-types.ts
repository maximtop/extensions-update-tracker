/**
 * @file Extension update notification types and interfaces
 */

/**
 * Notification button configuration
 */
export interface NotificationButton {
    /**
     * Text shown on the button.
     */
    title: string;

    /**
     * Optional icon shown alongside the button title.
     */
    iconUrl?: string;
}

/**
 * Chrome notification options for extension updates
 */
export interface UpdateNotificationOptions {
    /**
     * Chrome notification layout; only `basic` is used for update notifications.
     */
    type: 'basic';

    /**
     * URL of the icon shown in the notification.
     */
    iconUrl: string;

    /**
     * Notification title.
     */
    title: string;

    /**
     * Notification body text.
     */
    message: string;

    /**
     * Action buttons shown on the notification.
     */
    buttons?: NotificationButton[];

    /**
     * Notification priority, from -2 (lowest) to 2 (highest); Chrome restricts positive values.
     */
    priority?: 0 | 1 | 2;

    /**
     * Whether the notification stays visible until the user dismisses it.
     */
    requireInteraction?: boolean;

    /**
     * Whether to suppress the notification sound.
     */
    silent?: boolean;
}

/**
 * Data associated with a notification for tracking purposes
 */
export interface NotificationMetadata {
    /**
     * ID of the extension the notification is about.
     */
    extensionId: string;

    /**
     * Display name of the extension the notification is about.
     */
    extensionName: string;

    /**
     * Version that triggered the notification.
     */
    version: string;

    /**
     * Version that was installed before this update, when known.
     */
    previousVersion?: string;

    /**
     * Time the notification was created, in milliseconds since the epoch.
     */
    timestamp: number;
}

/**
 * Reason why a notification was closed
 */
export enum NotificationCloseReason {
    /**
     * User explicitly dismissed the notification
     */
    User = 'user',

    /**
     * Notification was auto-closed after timeout period
     */
    Timeout = 'timeout',

    /**
     * Notification was closed programmatically (e.g., button click, navigation)
     */
    Programmatic = 'programmatic',
}

/**
 * State of a notification interaction
 */
export interface NotificationInteractionState {
    /**
     * Extension ID the notification is for
     */
    extensionId: string;

    /**
     * Extension version at time of notification
     */
    version: string;

    /**
     * Timestamp when notification was shown
     */
    shownAt: number;

    /**
     * Timestamp when notification was closed
     */
    closedAt?: number | undefined;

    /**
     * Reason the notification was closed
     */
    closeReason?: NotificationCloseReason | undefined;

    /**
     * Whether user explicitly dismissed the notification
     */
    dismissedByUser: boolean;
}

/**
 * Storage structure for notification states
 */
export type NotificationStatesStorage = Record<string, NotificationInteractionState>;
