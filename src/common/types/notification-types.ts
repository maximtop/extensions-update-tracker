/**
 * Extension update notification types and interfaces
 */

/**
 * Notification button configuration
 */
export interface NotificationButton {
    title: string;
    iconUrl?: string;
}

/**
 * Chrome notification options for extension updates
 */
export interface UpdateNotificationOptions {
    type: 'basic';
    iconUrl: string;
    title: string;
    message: string;
    buttons?: NotificationButton[];
    priority?: 0 | 1 | 2;
    requireInteraction?: boolean;
    silent?: boolean;
}

/**
 * Data associated with a notification for tracking purposes
 */
export interface NotificationMetadata {
    extensionId: string;
    extensionName: string;
    version: string;
    previousVersion?: string;
    timestamp: number;
}

/**
 * Reason why a notification was closed
 */
export enum NotificationCloseReason {
    /** User explicitly dismissed the notification */
    User = 'user',
    /** Notification was auto-closed after timeout period */
    Timeout = 'timeout',
    /** Notification was closed programmatically (e.g., button click, navigation) */
    Programmatic = 'programmatic'
}

/**
 * State of a notification interaction
 */
export interface NotificationInteractionState {
    /** Extension ID the notification is for */
    extensionId: string;
    /** Extension version at time of notification */
    version: string;
    /** Timestamp when notification was shown */
    shownAt: number;
    /** Timestamp when notification was closed */
    closedAt?: number;
    /** Reason the notification was closed */
    closeReason?: NotificationCloseReason;
    /** Whether user explicitly dismissed the notification */
    dismissedByUser: boolean;
}

/**
 * Storage structure for notification states
 */
export interface NotificationStatesStorage {
    [extensionId: string]: NotificationInteractionState;
}
