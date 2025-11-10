import {
    describe,
    expect,
    it,
    vi,
    beforeEach,
} from 'vitest';

// Mock webextension-polyfill before any imports
vi.mock('webextension-polyfill', () => ({
    default: {
        action: {
            setBadgeText: vi.fn(),
            setBadgeBackgroundColor: vi.fn(),
            setBadgeTextColor: vi.fn(),
        },
        runtime: {
            onMessage: {
                addListener: vi.fn(),
            },
        },
    },
}));

// Import modules after mocks are set up
// eslint-disable-next-line import/first, import/order
import { MessageDispatcherService } from '../../../src/common/messaging/message-handler';
// eslint-disable-next-line import/first, import/order
import { MessageType } from '../../../src/common/messaging/message-types';
// eslint-disable-next-line import/first, import/order
import { BadgeService } from '../../../src/background/badge-service';
// eslint-disable-next-line import/first, import/order
import { ExtensionsUpdateStorage } from '../../../src/background/extensions-update-storage';
// eslint-disable-next-line import/first, import/order
import { RpcHandlers } from '../../../src/background/message-handlers';
// eslint-disable-next-line import/first, import/order
import { StorageAdapter } from '../../../src/background/storage-adapter';

class InMemoryStorageAdapter implements StorageAdapter {
    private data: Record<string, any> = {};

    async get(key: string): Promise<any> {
        return this.data[key] || null;
    }

    async set(key: string, value: any): Promise<void> {
        this.data[key] = value;
    }
}

describe('RpcHandlers', () => {
    let messageDispatcher: MessageDispatcherService;
    let extensionsUpdateStorage: ExtensionsUpdateStorage;
    let badgeService: BadgeService;
    let rpcHandlers: RpcHandlers;
    let storageAdapter: InMemoryStorageAdapter;
    let managementAdapter: any;
    let settingsStorage: any;

    beforeEach(() => {
        vi.clearAllMocks();

        storageAdapter = new InMemoryStorageAdapter();
        extensionsUpdateStorage = new ExtensionsUpdateStorage(storageAdapter);
        messageDispatcher = new MessageDispatcherService();
        badgeService = new BadgeService(extensionsUpdateStorage, messageDispatcher);

        managementAdapter = {
            get: vi.fn(),
            getAll: vi.fn(),
        };

        settingsStorage = {
            get: vi.fn().mockResolvedValue({}),
            update: vi.fn(),
            reset: vi.fn(),
            setExtensionMuted: vi.fn(),
        };

        rpcHandlers = new RpcHandlers(
            messageDispatcher,
            extensionsUpdateStorage,
            badgeService,
            managementAdapter,
            settingsStorage,
        );
    });

    describe('GetUpdates handler race condition', () => {
        it('should wait for initialization before returning updates', async () => {
            // Initialize storage with test data
            await storageAdapter.set(ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY, {
                'test-extension-id': {
                    currentVersion: '1.0.1',
                    updateHistory: [
                        {
                            version: '1.0.0',
                            detectedTimestampMs: Date.now() - 1000,
                            isRead: true,
                        },
                        {
                            version: '1.0.1',
                            detectedTimestampMs: Date.now(),
                            isRead: false,
                        },
                    ],
                },
            });

            // Initialize handlers (this registers message listeners)
            rpcHandlers.init();

            // Get the handler directly
            const handler = (messageDispatcher as any).handlers.get(MessageType.GetUpdates);

            // Trigger the handler (simulating message from popup)
            const result = await handler({ type: MessageType.GetUpdates });

            // Verify that we get the correct data, not empty object
            expect(result).toHaveProperty('test-extension-id');
            expect(result['test-extension-id']).toHaveProperty('currentVersion', '1.0.1');
            expect(result['test-extension-id'].updateHistory).toHaveLength(2);
        });

        it('should handle multiple concurrent GetUpdates requests during initialization', async () => {
            // Initialize storage with test data
            await storageAdapter.set(ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY, {
                'ext-1': {
                    currentVersion: '1.0.0',
                    updateHistory: [
                        {
                            version: '1.0.0',
                            detectedTimestampMs: Date.now(),
                        },
                    ],
                },
            });

            // Initialize handlers
            rpcHandlers.init();

            // Get the handler directly
            const handler = (messageDispatcher as any).handlers.get(MessageType.GetUpdates);

            // Trigger multiple concurrent requests before init completes
            const request1 = handler({ type: MessageType.GetUpdates });
            const request2 = handler({ type: MessageType.GetUpdates });
            const request3 = handler({ type: MessageType.GetUpdates });

            // Wait for all requests
            const [result1, result2, result3] = await Promise.all([request1, request2, request3]);

            // All should return the same correct data
            expect(result1).toHaveProperty('ext-1');
            expect(result2).toHaveProperty('ext-1');
            expect(result3).toHaveProperty('ext-1');
        });
    });

    describe('MarkAllAsRead handler', () => {
        it('should wait for initialization before marking updates as read', async () => {
            // Initialize storage with test data
            await storageAdapter.set(ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY, {
                'test-extension-id': {
                    currentVersion: '1.0.1',
                    updateHistory: [
                        {
                            version: '1.0.1',
                            detectedTimestampMs: Date.now(),
                            isRead: false,
                        },
                    ],
                },
            });

            // Initialize handlers
            rpcHandlers.init();

            // Get the handler directly
            const handler = (messageDispatcher as any).handlers.get(MessageType.MarkAllAsRead);

            // Trigger the handler (this should wait for init internally)
            await handler({ type: MessageType.MarkAllAsRead });

            // Verify that updates were marked as read
            const storage = extensionsUpdateStorage.getStorage();
            expect(storage).not.toBeNull();
            if (storage) {
                expect(storage['test-extension-id'].updateHistory[0].isRead).toBe(true);
            }
        });
    });

    describe('MarkUpdateAsRead handler', () => {
        it('should wait for initialization before marking specific update as read', async () => {
            // Initialize storage with test data
            await storageAdapter.set(ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY, {
                'test-extension-id': {
                    currentVersion: '1.0.1',
                    updateHistory: [
                        {
                            version: '1.0.0',
                            detectedTimestampMs: Date.now() - 1000,
                            isRead: true,
                        },
                        {
                            version: '1.0.1',
                            detectedTimestampMs: Date.now(),
                            isRead: false,
                        },
                    ],
                },
            });

            // Initialize handlers
            rpcHandlers.init();

            // Get the handler directly
            const handler = (messageDispatcher as any).handlers.get(MessageType.MarkUpdateAsRead);

            // Trigger the handler (this should wait for init internally)
            await handler({
                type: MessageType.MarkUpdateAsRead,
                extensionId: 'test-extension-id',
                version: '1.0.1',
            });

            // Verify that the specific update was marked as read
            const storage = extensionsUpdateStorage.getStorage();
            expect(storage).not.toBeNull();
            if (storage) {
                const unreadUpdate = storage['test-extension-id'].updateHistory.find((u) => u.version === '1.0.1');
                expect(unreadUpdate?.isRead).toBe(true);
            }
        });
    });
});
