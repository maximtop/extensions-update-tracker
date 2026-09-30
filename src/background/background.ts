/**
 * @file Background script entry point: wires up the services and starts them.
 */

import { MessageDispatcherService } from '../common/messaging/message-handler';
import { Logger } from '../common/utils/logger';

import { BadgeService } from './badge-service';
import { ExtensionsManagement } from './extensions-management';
import { ExtensionsUpdateStorage } from './extensions-update-storage';
import { managementAdapter } from './management-adapter';
import { RpcHandlers } from './message-handlers';
import { NotificationService } from './notification-service';
import { settingsStorage } from './settings-storage';
import { storage } from './storage';

const extensionsUpdateStorage = new ExtensionsUpdateStorage(storage);
const notificationService = new NotificationService(extensionsUpdateStorage);
const messageDispatcher = new MessageDispatcherService();
const badgeService = new BadgeService(extensionsUpdateStorage, messageDispatcher);

const extensionsManagement = new ExtensionsManagement(
    managementAdapter,
    extensionsUpdateStorage,
    notificationService,
    badgeService,
);

const rpcHandlers = new RpcHandlers(
    messageDispatcher,
    extensionsUpdateStorage,
    badgeService,
    managementAdapter,
    settingsStorage,
);

/**
 * Loads persisted settings and extension data.
 *
 * @returns Promise that resolves once settings and extension data have loaded.
 */
const loadStorage = async () => {
    await settingsStorage.load();
    await extensionsUpdateStorage.init();
};

/**
 * Entry point called once on background script startup: registers all listeners
 * synchronously and starts loading storage without blocking the caller.
 */
const init = () => {
    messageDispatcher.init();
    rpcHandlers.init();
    // Register lifecycle listeners before yielding so Firefox can wake an idle event page.
    extensionsManagement.init(loadStorage()).catch((error) => {
        Logger.error('Failed to initialize extension tracking:', error);
    });
};

export { init };
