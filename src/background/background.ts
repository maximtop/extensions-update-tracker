/**
 * @file Background script entry point: wires up the services and starts them.
 */

import { MessageDispatcherService } from '../common/messaging/message-handler';

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

// Note: These constructors use TypeScript's parameter properties pattern (private params).
// While an options object pattern could improve readability, it would require significant
// refactoring of test files (18+ instances). The current pattern is idiomatic TypeScript.
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
 * Starts the services that must be ready before the background script can receive messages.
 */
const syncInit = () => {
    messageDispatcher.init();
    rpcHandlers.init();
};

/**
 * Loads persisted state and starts the services that depend on it.
 *
 * @returns Promise that resolves once settings and extension data have loaded.
 */
const asyncInit = async () => {
    await settingsStorage.load();
    await extensionsUpdateStorage.init();
    await extensionsManagement.init();
};

/**
 * Entry point called once on background script startup: runs the synchronous init
 * immediately and kicks off the asynchronous init without blocking the caller.
 */
const init = () => {
    syncInit();
    void asyncInit();
};

export { init };
