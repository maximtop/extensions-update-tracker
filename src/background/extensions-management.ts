import { Management } from 'webextension-polyfill';

import { Logger } from '../common/utils/logger';

import { BadgeService } from './badge-service';
import { ExtensionsUpdateStorage } from './extensions-update-storage';
import { ManagementAdapter } from './management-adapter';
import { NotificationService } from './notification-service';
import { notificationStateStorage } from './notification-state-storage';

/**
 * Manages extension lifecycle events and coordinates responses to extension updates.
 *
 * This service is the central coordinator for tracking browser extension updates.
 * It listens to extension installation, uninstallation, and state changes, then
 * orchestrates the appropriate responses through the notification and badge services.
 *
 * Key responsibilities:
 * - Listens for extension install/uninstall/disable events
 * - Reconciles stored versions with currently installed extensions
 * - Coordinates notifications for extension updates
 * - Triggers badge updates to reflect unread update counts
 * - Cleans up orphaned data for removed extensions
 */
export class ExtensionsManagement {
    private management: ManagementAdapter;

    private storage: ExtensionsUpdateStorage;

    private notificationService: NotificationService;

    private badgeService: BadgeService;

    /**
     * Creates an instance of ExtensionsManagement.
     *
     * @param management - Adapter for browser's extension management API
     * @param storage - Storage service for persisting extension update data
     * @param notificationService - Service for showing update notifications
     * @param badgeService - Service for updating the extension badge
     */
    constructor(
        management: ManagementAdapter,
        storage: ExtensionsUpdateStorage,
        notificationService: NotificationService,
        badgeService: BadgeService,
    ) {
        this.management = management;
        this.storage = storage;
        this.notificationService = notificationService;
        this.badgeService = badgeService;
    }

    /**
     * Initializes the service by registering event listeners and reconciling versions.
     *
     * Sets up listeners for:
     * - Extension installations (new installs and updates)
     * - Extension uninstallations
     * - Extension disable events
     *
     * Then reconciles currently installed extensions with stored data to detect
     * any missed updates and clean up orphaned data.
     *
     * Should be called once during background script initialization, after storage
     * has been initialized.
     *
     * @returns Promise that resolves when initialization is complete
     */
    async init(): Promise<void> {
        this.management.onInstalled.addListener(this.onInstalled);
        this.management.onUninstalled.addListener(this.onUninstalled);
        this.management.onDisabled.addListener(this.onDisabled);

        await this.reconcileVersions();
    }

    /**
     * Reconciles currently installed extensions with stored versions.
     *
     * This method performs a comprehensive sync between the browser's installed
     * extensions and the extension's internal storage. It serves multiple purposes:
     *
     * 1. Detects updates that occurred while the extension was inactive
     * 2. Records newly installed extensions
     * 3. Removes orphaned data for uninstalled extensions
     * 4. Cleans up invalid notification states
     * 5. Updates the badge to reflect current state
     *
     * This is called automatically by initAsync() during startup, but can also be
     * called manually if needed (e.g., for manual sync or testing).
     *
     * @returns Promise that resolves when reconciliation is complete
     */
    async reconcileVersions(): Promise<void> {
        Logger.info('Starting version reconciliation...');
        const installedExtensions = await this.management.getAll();
        const storedData = this.storage.getStorage();

        Logger.info(
            `Reconciling ${installedExtensions.length} installed extensions with stored data`,
        );

        // Create a Set of currently installed extension IDs for quick lookup
        const installedIds = new Set(installedExtensions.map((ext) => ext.id));

        // Check for updates in installed extensions
        for (const ext of installedExtensions) {
            const extId = ext.id;
            const extName = ext.name;
            const currentVersion = ext.version;
            const storedEntry = storedData?.[extId];

            // If not in storage at all, or version differs, record it
            if (!storedEntry || storedEntry.currentVersion !== currentVersion) {
                const previousVersion = storedEntry?.currentVersion;

                Logger.info(
                    `Reconciliation found change for ${extName} (${extId}): `
                    + `${previousVersion || 'new'} -> ${currentVersion}`,
                );

                await this.storage.saveInstalledInfo(ext);

                // Show notification for the update
                if (previousVersion) {
                    // Only show notification if there was a previous version (actual update)
                    Logger.info(
                        `Reconciliation triggering notification for ${extName}: `
                        + `${previousVersion} -> ${currentVersion}`,
                    );
                    await this.notificationService.showUpdateNotification(ext, previousVersion);
                } else {
                    Logger.info(
                        `Reconciliation found new extension ${extName}, not showing notification`,
                    );
                }
            }
        }

        // Clean up orphaned data for extensions that are no longer installed
        if (storedData) {
            for (const extensionId of Object.keys(storedData)) {
                if (!installedIds.has(extensionId)) {
                    Logger.info(`Cleaning up orphaned data for extension: ${extensionId}`);
                    await this.storage.removeExtension(extensionId);
                    await notificationStateStorage.clearState(extensionId);
                }
            }
        }

        // Clean up orphaned notification states (including invalid keys >32 chars)
        await notificationStateStorage.cleanupOrphanedStates(installedIds);

        // Update badge after reconciliation
        this.badgeService.refresh();
    }

    /**
     * Handler for when an extension is installed or updated.
     *
     * This is triggered both for new installations and version updates.
     * For updates, it shows a notification (if the notification service is configured)
     * and updates the badge counter.
     *
     * @param info - Extension information from the browser management API
     */
    onInstalled = async (info: Management.ExtensionInfo) => {
        const extId = info.id;
        const extName = info.name;
        const currentVersion = info.version;
        const storedData = this.storage.getStorage();
        const storedEntry = storedData?.[extId];
        const previousVersion = storedEntry?.currentVersion;

        Logger.info(
            `onInstalled event - Extension: ${extName} (${extId}), `
            + `Previous version: ${previousVersion || 'N/A'}, `
            + `Current version: ${currentVersion}, `
            + `Is update: ${!!(previousVersion && previousVersion !== currentVersion)}`,
        );

        // Persist the snapshot of the installed extension
        await this.storage.saveInstalledInfo(info);

        // Show notification if this is an update (not first install)
        if (previousVersion && previousVersion !== currentVersion) {
            Logger.info(`Triggering notification for update: ${extName} ${previousVersion} -> ${currentVersion}`);
            await this.notificationService.showUpdateNotification(info, previousVersion);
        } else if (!previousVersion) {
            Logger.info(`First install detected for ${extName}, not showing update notification`);
        } else {
            Logger.info(`No version change for ${extName}, not showing notification`);
        }

        // Update badge
        this.badgeService.refresh();
    };

    /**
     * Handler for when an extension is uninstalled.
     *
     * Performs cleanup by:
     * - Removing stored update history
     * - Clearing notification states
     * - Updating the badge to reflect the new count
     *
     * @param info - Extension information from the browser management API
     */
    onUninstalled = async (info: Management.ExtensionInfo) => {
        const extensionId = info.id;
        Logger.info(`Extension uninstalled: ${extensionId}, cleaning up storage...`);

        // Remove stored update data
        await this.storage.removeExtension(extensionId);

        // Remove notification states
        await notificationStateStorage.clearState(extensionId);

        // Update badge after cleanup
        await this.badgeService.refresh();
    };

    /**
     * Handler for when an extension is disabled.
     *
     * When an extension is disabled, this method:
     * - Clears any existing update notification for that extension
     * - Re-shows the notification with a grayscale icon (visual indicator of disabled state)
     * - Updates notification buttons to show enable/uninstall actions
     *
     * This provides users with quick actions to either re-enable or uninstall
     * the disabled extension directly from the notification.
     *
     * @param info - Extension information from the browser management API
     */
    onDisabled = async (info: Management.ExtensionInfo) => {
        const extensionId = info.id;
        const extensionName = info.name;
        Logger.info(`Extension disabled: ${extensionName} (${extensionId})`);

        // Get the stored update data
        const storedData = this.storage.getStorage();
        const storedEntry = storedData?.[extensionId];

        Logger.info(
            `onDisabled debug - Extension: ${extensionName}, `
            + `Has stored entry: ${!!storedEntry}, `
            + `Update history length: ${storedEntry?.updateHistory?.length || 0}`,
        );

        // Only re-show notification if there's an active notification for this extension
        // This prevents showing notifications for old updates when the user disables an extension
        const activeNotification = await this.notificationService.hasActiveNotification(extensionId);

        if (!activeNotification) {
            Logger.info(
                `No active notification for ${extensionName}, skipping notification on disable event`,
            );
            return;
        }

        Logger.info(
            `Active notification exists for ${extensionName}, `
            + 're-showing with disabled state (grayscale icon)',
        );

        // Clear existing notification
        await this.notificationService.clearNotification(extensionId);

        // Re-show notification with grayscale icon and appropriate buttons
        if (storedEntry) {
            // Get the previous version from the most recent update history entry
            const updateHistory = storedEntry.updateHistory || [];
            const latestUpdate = updateHistory[updateHistory.length - 1];
            const previousVersion = latestUpdate?.previousVersion;

            // Show the notification with the disabled state
            // The notification service will automatically show grayscale icon and
            // enable/uninstall buttons for disabled extensions
            await this.notificationService.showUpdateNotification(info, previousVersion);
        }
    };
}
