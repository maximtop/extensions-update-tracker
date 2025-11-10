import { MessageDispatcherService } from '../common/messaging/message-handler';
import { MessageType } from '../common/messaging/message-types';
import { getErrorMessage } from '../common/utils/error';
import { Logger } from '../common/utils/logger';

import { BadgeService } from './badge-service';
import { ExtensionsUpdateStorage } from './extensions-update-storage';
import { ManagementAdapter } from './management-adapter';
import { SettingsStorage } from './settings-storage';
import { storage } from './storage';

const LAST_CHECKED_KEY = 'last-checked-timestamp';

/**
 * Handles all message-based RPC calls from popup and options pages.
 * Encapsulates the registration and handling logic for inter-component communication.
 */
export class RpcHandlers {
    private initialized = false;

    constructor(
        private messageDispatcher: MessageDispatcherService,
        private extensionsUpdateStorage: ExtensionsUpdateStorage,
        private badgeService: BadgeService,
        private managementAdapter: ManagementAdapter,
        private settingsStorage: SettingsStorage,
    ) {}

    /**
     * Initialize and register all message handlers.
     * Must be called once during background script initialization.
     * Explicit initialization provides better control over the setup sequence.
     */
    init(): void {
        if (this.initialized) {
            Logger.warn('RpcHandlers already initialized, skipping');
            return;
        }

        this.registerMarkAllAsRead();
        this.registerGetUpdates();
        this.registerGetExtensionsInfo();
        this.registerMarkUpdateAsRead();
        this.registerGetSettings();
        this.registerUpdateSettings();
        this.registerResetSettings();
        this.registerSetExtensionMuted();
        this.registerGetLastCheckedTimestamp();
        this.registerSetLastCheckedTimestamp();

        this.initialized = true;
    }

    /**
     * Handler: Mark all updates as read across all extensions
     */
    private registerMarkAllAsRead(): void {
        this.messageDispatcher.on(MessageType.MarkAllAsRead, async () => {
            Logger.info('Received MarkAllAsRead message');
            await this.extensionsUpdateStorage.ensureInitialized();
            await this.extensionsUpdateStorage.markAllAsRead();
            // Refresh badge after marking all as read
            this.badgeService.refresh();
        });
    }

    /**
     * Handler: Get all extension updates from storage
     */
    private registerGetUpdates(): void {
        this.messageDispatcher.on(MessageType.GetUpdates, async () => {
            Logger.info('Received GetUpdates message');
            await this.extensionsUpdateStorage.ensureInitialized();
            const storageData = this.extensionsUpdateStorage.getStorage();
            return storageData || {};
        });
    }

    /**
     * Handler: Get multiple extensions metadata from browser management API
     */
    private registerGetExtensionsInfo(): void {
        this.messageDispatcher.on(MessageType.GetExtensionsInfo, async (message) => {
            if (message.type !== MessageType.GetExtensionsInfo) {
                return {};
            }

            Logger.info(`Received GetExtensionsInfo message for ${message.extensionIds.length} extension(s)`);

            const results: Record<string, any> = {};

            // Fetch all extension info in parallel
            await Promise.all(
                message.extensionIds.map(async (extensionId) => {
                    try {
                        const info = await this.managementAdapter.get(extensionId);
                        results[extensionId] = {
                            id: info.id,
                            name: info.name,
                            version: info.version,
                            enabled: info.enabled,
                            icons: info.icons,
                            description: info.description,
                            homepageUrl: info.homepageUrl,
                            installType: info.installType,
                        };
                    } catch (error) {
                        Logger.error(`Failed to get extension info for ${extensionId}:`, getErrorMessage(error));
                        // Don't include in results if fetch failed
                    }
                }),
            );

            return results;
        });
    }

    /**
     * Handler: Mark a specific update as read for a given extension
     */
    private registerMarkUpdateAsRead(): void {
        this.messageDispatcher.on(MessageType.MarkUpdateAsRead, async (message) => {
            if (message.type !== MessageType.MarkUpdateAsRead) {
                return;
            }

            const versionInfo = message.version || 'latest';
            Logger.info(`Received MarkUpdateAsRead message for ${message.extensionId} version ${versionInfo}`);

            await this.extensionsUpdateStorage.ensureInitialized();
            await this.extensionsUpdateStorage.markUpdateAsRead(message.extensionId, message.version);

            // Refresh badge after marking update as read
            this.badgeService.refresh();
        });
    }

    /**
     * Handler: Get current user settings
     */
    private registerGetSettings(): void {
        this.messageDispatcher.on(MessageType.GetSettings, async () => {
            Logger.info('Received GetSettings message');
            return this.settingsStorage.get();
        });
    }

    /**
     * Handler: Update user settings
     */
    private registerUpdateSettings(): void {
        this.messageDispatcher.on(MessageType.UpdateSettings, async (message) => {
            if (message.type !== MessageType.UpdateSettings) {
                return;
            }

            Logger.info('Received UpdateSettings message');
            await this.settingsStorage.update(message.settings);
        });
    }

    /**
     * Handler: Reset settings to defaults
     */
    private registerResetSettings(): void {
        this.messageDispatcher.on(MessageType.ResetSettings, async () => {
            Logger.info('Received ResetSettings message');
            await this.settingsStorage.reset();
        });
    }

    /**
     * Handler: Mute/unmute extension notifications
     */
    private registerSetExtensionMuted(): void {
        this.messageDispatcher.on(MessageType.SetExtensionMuted, async (message) => {
            if (message.type !== MessageType.SetExtensionMuted) {
                return;
            }

            Logger.info(`Received SetExtensionMuted message for ${message.extensionId}: ${message.muted}`);
            await this.settingsStorage.setExtensionMuted(message.extensionId, message.muted);
        });
    }

    /**
     * Handler: Get the last checked timestamp
     */
    private registerGetLastCheckedTimestamp(): void {
        this.messageDispatcher.on(MessageType.GetLastCheckedTimestamp, async () => {
            Logger.info('Received GetLastCheckedTimestamp message');
            const timestamp = await storage.get(LAST_CHECKED_KEY) as number | undefined;
            return timestamp || null;
        });
    }

    /**
     * Handler: Set the last checked timestamp
     */
    private registerSetLastCheckedTimestamp(): void {
        this.messageDispatcher.on(MessageType.SetLastCheckedTimestamp, async (message) => {
            if (message.type !== MessageType.SetLastCheckedTimestamp) {
                return;
            }

            Logger.info(`Received SetLastCheckedTimestamp message: ${message.timestamp}`);
            await storage.set(LAST_CHECKED_KEY, message.timestamp);
        });
    }
}
