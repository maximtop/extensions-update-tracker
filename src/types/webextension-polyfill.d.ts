/**
 * @file Augments `webextension-polyfill` types with fields and methods missing from the
 * upstream definitions but present in the WebExtensions API.
 */

import 'webextension-polyfill';

// Extend the existing types from webextension-polyfill
declare module 'webextension-polyfill' {
    // Augment the Notifications namespace
    namespace Notifications {
        /**
         * Options for creating a notification.
         * Added `contextMessage` which is not standard but used in some implementations.
         * Added `buttons` which seems missing from the base `@types/webextension-polyfill` definition.
         * Added `requireInteraction` which is standard but might be missing in base types.
         */
        interface CreateNotificationOptions {
            /**
             * Additional message text shown below the notification title, not part of the standard API.
             */
            contextMessage?: string;

            // Explicitly add buttons based on documentation, as the base type seems incomplete

            /**
             * Action buttons shown on the notification.
             */
            buttons?: Notifications.ButtonOptions[];

            /**
             * Whether the notification stays visible until the user dismisses it.
             */
            requireInteraction?: boolean;
        }

        /**
         * The browser.notifications API static interface.
         * Added `onButtonClicked` which is non-standard but available in some environments.
         */
        interface Static {
            /**
             * Fires when the user clicks one of the notification's buttons.
             */
            onButtonClicked?: Events.Event<
                (notificationId: string, buttonIndex: number) => void
            >;

            /**
             * Fires when the user asks to see notification settings.
             */
            onShowSettings?: Events.Event<() => void>;
        }
    }

    namespace Management {
        /**
         * Metadata describing an installed extension.
         */
        interface ExtensionInfo {
            // Core fields that are always present (fixing overly conservative base types)

            /**
             * Extension ID.
             */
            id: string;

            /**
             * Display name of the extension.
             */
            name: string;

            /**
             * Installed extension version.
             */
            version: string;

            // Optional fields

            /**
             * Whether the extension is a hosted/packaged app rather than a regular extension.
             */
            isApp?: boolean;

            /**
             * Whether the user is allowed to enable/disable the extension.
             */
            mayEnable?: boolean;

            /**
             * Whether the extension can run without a network connection.
             */
            offlineEnabled?: boolean;
        }

        /**
         * The Management static interface.
         * Added `uninstall` method which is part of the WebExtensions API but may be missing from base types.
         */
        interface Static {
            /**
             * Uninstalls an extension.
             *
             * @param extensionId ID of the extension to uninstall.
             * @param options Options controlling the uninstall confirmation dialog.
             * @param options.showConfirmDialog Whether to show a confirmation dialog before uninstalling.
             *
             * @returns Promise that resolves once the extension has been uninstalled.
             */
            uninstall(extensionId: string, options?: {
                /**
                 * Whether to show a confirmation dialog before uninstalling.
                 */
                showConfirmDialog?: boolean;
            }): Promise<void>;
        }
    }
}
