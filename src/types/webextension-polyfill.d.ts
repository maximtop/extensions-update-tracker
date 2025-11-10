import 'webextension-polyfill';

// Extend the existing types from webextension-polyfill
declare module 'webextension-polyfill' {
    // Augment the Notifications namespace
    namespace Notifications {
        /**
         * Options for creating a notification.
         * Added `contextMessage` which is not standard but used in some implementations.
         * Added `buttons` which seems missing from the base @types/webextension-polyfill definition.
         * Added `requireInteraction` which is standard but might be missing in base types.
         */
        interface CreateNotificationOptions {
            contextMessage?: string;
            // Explicitly add buttons based on documentation, as the base type seems incomplete
            buttons?: Notifications.ButtonOptions[];
            requireInteraction?: boolean;
        }

        /**
         * The browser.notifications API static interface.
         * Added `onButtonClicked` which is non-standard but available in some environments.
         */
        interface Static {
            onButtonClicked?: browser.Events.Event<
            (notificationId: string, buttonIndex: number) => void
            >;
            onShowSettings?: browser.Events.Event<() => void>;
        }
    }

    namespace Management {
        interface ExtensionInfo {
            // Core fields that are always present (fixing overly conservative base types)
            id: string;
            name: string;
            version: string;
            // Optional fields
            isApp?: boolean;
            mayEnable?: boolean;
            offlineEnabled?: boolean;
        }

        /**
         * The Management static interface.
         * Added `uninstall` method which is part of the WebExtensions API but may be missing from base types.
         */
        interface Static {
            uninstall(extensionId: string, options?: { showConfirmDialog?: boolean }): Promise<void>;
        }
    }
}
