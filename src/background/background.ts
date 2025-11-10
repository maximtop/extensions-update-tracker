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

const syncInit = () => {
    messageDispatcher.init();
    rpcHandlers.init();
};

const asyncInit = async () => {
    await extensionsUpdateStorage.init();
    await extensionsManagement.init();
};

const init = () => {
    syncInit();
    asyncInit();
};

export { init };
