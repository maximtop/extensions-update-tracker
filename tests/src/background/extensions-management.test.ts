import {
    describe,
    it,
    expect,
    vi,
} from 'vitest';

import { BadgeService } from '../../../src/background/badge-service';
import { ExtensionsManagement } from '../../../src/background/extensions-management';
import { ExtensionsUpdateStorage } from '../../../src/background/extensions-update-storage';
import { ManagementAdapter } from '../../../src/background/management-adapter';
import { NotificationService } from '../../../src/background/notification-service';

import type { StorageAdapter } from '../../../src/background/storage-adapter';

// Mock webextension-polyfill before importing modules that use it
vi.mock('webextension-polyfill', () => ({
    default: {
        storage: {
            sync: {
                get: vi.fn().mockResolvedValue({}),
                set: vi.fn().mockResolvedValue(undefined),
                remove: vi.fn().mockResolvedValue(undefined),
            },
            onChanged: {
                addListener: vi.fn(),
            },
        },
    },
}));

// In-memory StorageAdapter to simulate chrome.storage.local JSON persistence
class InMemoryStorageAdapter implements StorageAdapter {
    private store: Record<string, any>;

    constructor(initial: Record<string, any> = {}) {
        this.store = { ...initial };
    }

    async get(key: string) {
        return this.store[key];
    }

    async set(key: string, value: any) {
        this.store[key] = value;
    }
}

// Helper to create mock services
function createMockNotificationService(): NotificationService {
    return {
        showUpdateNotification: vi.fn(),
        clearNotification: vi.fn(),
        showWelcomeNotification: vi.fn(),
        clearAllNotifications: vi.fn(),
        hasActiveNotification: vi.fn().mockResolvedValue(false),
    } as any;
}

function createMockBadgeService(): BadgeService {
    return {
        refresh: vi.fn(),
        updateBadge: vi.fn(),
        clearBadge: vi.fn(),
    } as any;
}

describe('management', () => {
    it('should subscribe to onInstalled event', async () => {
        const management: ManagementAdapter = {
            onInstalled: {
                addListener: vi.fn(),
            },
            onUninstalled: {
                addListener: vi.fn(),
            },
            onDisabled: {
                addListener: vi.fn(),
            },
            getAll: vi.fn().mockResolvedValue([]),
            get: vi.fn(),
        };

        const storageAdapter = new InMemoryStorageAdapter();
        const storageService = new ExtensionsUpdateStorage(storageAdapter);
        await storageService.init();
        const mockNotificationService = createMockNotificationService();
        const mockBadgeService = createMockBadgeService();

        const extensionsManagement = new ExtensionsManagement(
            management,
            storageService,
            mockNotificationService,
            mockBadgeService,
        );

        await extensionsManagement.init();

        expect(management.onInstalled.addListener).toHaveBeenCalled();
    });

    it('should subscribe to onUninstalled event', async () => {
        const management: ManagementAdapter = {
            onInstalled: {
                addListener: vi.fn(),
            },
            onUninstalled: {
                addListener: vi.fn(),
            },
            onDisabled: {
                addListener: vi.fn(),
            },
            getAll: vi.fn().mockResolvedValue([]),
            get: vi.fn(),
        };

        const storageAdapter = new InMemoryStorageAdapter();
        const storageService = new ExtensionsUpdateStorage(storageAdapter);
        await storageService.init();
        const mockNotificationService = createMockNotificationService();
        const mockBadgeService = createMockBadgeService();

        const extensionsManagement = new ExtensionsManagement(
            management,
            storageService,
            mockNotificationService,
            mockBadgeService,
        );

        await extensionsManagement.init();

        expect(management.onUninstalled.addListener).toHaveBeenCalled();
    });

    it('should subscribe to onDisabled event', async () => {
        const management: ManagementAdapter = {
            onInstalled: {
                addListener: vi.fn(),
            },
            onUninstalled: {
                addListener: vi.fn(),
            },
            onDisabled: {
                addListener: vi.fn(),
            },
            getAll: vi.fn().mockResolvedValue([]),
            get: vi.fn(),
        };

        const storageAdapter = new InMemoryStorageAdapter();
        const storageService = new ExtensionsUpdateStorage(storageAdapter);
        await storageService.init();
        const mockNotificationService = createMockNotificationService();
        const mockBadgeService = createMockBadgeService();

        const extensionsManagement = new ExtensionsManagement(
            management,
            storageService,
            mockNotificationService,
            mockBadgeService,
        );

        await extensionsManagement.init();

        expect(management.onDisabled.addListener).toHaveBeenCalled();
    });

    it('should add a new extension entry when storage already contains other entries', async () => {
        const addListenerMock = vi.fn();
        const management: ManagementAdapter = {
            onInstalled: {
                addListener: addListenerMock,
            },
            onUninstalled: {
                addListener: vi.fn(),
            },
            onDisabled: {
                addListener: vi.fn(),
            },
            getAll: vi.fn().mockResolvedValue([
                { id: 'existing-ext', name: 'Existing Extension', version: '2.0.0' },
            ]),
            get: vi.fn(),
        };

        const initialData = {
            'existing-ext': {
                currentVersion: '2.0.0',
                updateHistory: [] as Array<{
                    version: string;
                    detectedTimestampMs: number;
                }>,
            },
        };

        const storageAdapter = new InMemoryStorageAdapter({
            [ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY]: initialData,
        });

        const storageService = new ExtensionsUpdateStorage(storageAdapter);
        await storageService.init();

        const mockNotificationService = createMockNotificationService();
        const mockBadgeService = createMockBadgeService();

        const extensionsManagement = new ExtensionsManagement(
            management,
            storageService,
            mockNotificationService,
            mockBadgeService,
        );
        await extensionsManagement.init();

        const handler = addListenerMock.mock.calls[0][0];

        handler({
            id: 'new-ext',
            name: 'New Extension',
            version: '1.0.0',
        });

        await vi.waitFor(async () => {
            const persisted = await storageAdapter.get(
                ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY,
            );
            expect(persisted).toEqual(
                expect.objectContaining({
                    'existing-ext': initialData['existing-ext'],
                    'new-ext': expect.objectContaining({
                        currentVersion: '1.0.0',
                        updateHistory: [
                            expect.objectContaining({
                                version: '1.0.0',
                                detectedTimestampMs: expect.any(Number),
                            }),
                        ],
                    }),
                }),
            );
        });
    });

    it('should append a new version and update currentVersion', async () => {
        const addListenerMock = vi.fn();
        const management: ManagementAdapter = {
            onInstalled: {
                addListener: addListenerMock,
            },
            onUninstalled: {
                addListener: vi.fn(),
            },
            onDisabled: {
                addListener: vi.fn(),
            },
            getAll: vi.fn().mockResolvedValue([]),
            get: vi.fn(),
        };

        const storageAdapter = new InMemoryStorageAdapter({
            [ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY]: {},
        });

        const storageService = new ExtensionsUpdateStorage(storageAdapter);
        await storageService.init();

        const mockNotificationService = createMockNotificationService();
        const mockBadgeService = createMockBadgeService();

        const extensionsManagement = new ExtensionsManagement(
            management,
            storageService,
            mockNotificationService,
            mockBadgeService,
        );
        await extensionsManagement.init();

        const handler = addListenerMock.mock.calls[0][0];

        const EXT_ID = 'ext';
        handler({ id: EXT_ID, name: 'Ext', version: '1.0.0' });
        handler({ id: EXT_ID, name: 'Ext', version: '1.1.0' });

        await vi.waitFor(async () => {
            const persisted = await storageAdapter.get(
                ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY,
            );
            const VERSION_HISTORY_EXPECTED_LENGTH = 2;
            expect(persisted?.[EXT_ID]?.updateHistory?.length).toBe(VERSION_HISTORY_EXPECTED_LENGTH);
        });

        const persisted = await storageAdapter.get(
            ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY,
        );
        expect(persisted[EXT_ID].currentVersion).toBe('1.1.0');
        expect(persisted[EXT_ID].updateHistory.length).toBe(2);
        expect(persisted[EXT_ID].updateHistory[0].version).toBe('1.0.0');
        expect(persisted[EXT_ID].updateHistory[1].version).toBe('1.1.0');
    });

    it('should not duplicate same version; update timestamp of the latest entry', async () => {
        const addListenerMock = vi.fn();
        const management: ManagementAdapter = {
            onInstalled: {
                addListener: addListenerMock,
            },
            onUninstalled: {
                addListener: vi.fn(),
            },
            onDisabled: {
                addListener: vi.fn(),
            },
            getAll: vi.fn().mockResolvedValue([]),
            get: vi.fn(),
        };

        const storageAdapter = new InMemoryStorageAdapter({
            [ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY]: {},
        });

        const storageService = new ExtensionsUpdateStorage(storageAdapter);
        await storageService.init();

        const mockNotificationService = createMockNotificationService();
        const mockBadgeService = createMockBadgeService();

        const extensionsManagement = new ExtensionsManagement(
            management,
            storageService,
            mockNotificationService,
            mockBadgeService,
        );
        await extensionsManagement.init();

        const handler = addListenerMock.mock.calls[0][0];

        vi.useFakeTimers();
        vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
        handler({ id: 'dup', name: 'Dup', version: '1.0.0' });
        // Capture first persisted timestamp
        let firstTs = 0;
        await vi.waitFor(async () => {
            const persisted1 = await storageAdapter.get(
                ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY,
            );
            firstTs = persisted1?.dup?.updateHistory?.[0]?.detectedTimestampMs ?? 0;
            expect(firstTs).toBeGreaterThan(0);
        });

        vi.setSystemTime(new Date('2025-01-01T01:00:00Z'));
        handler({ id: 'dup', name: 'Dup', version: '1.0.0' });
        await vi.waitFor(async () => {
            const persisted2 = await storageAdapter.get(
                ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY,
            );
            // Should still have a single history entry with updated timestamp
            expect(persisted2.dup.updateHistory.length).toBe(1);
            const secondTs = persisted2.dup.updateHistory[0].detectedTimestampMs;
            expect(secondTs).toBeGreaterThan(firstTs);
        });
        vi.useRealTimers();
    });

    it('should trim update history to the last N entries', async () => {
        const addListenerMock = vi.fn();
        const management: ManagementAdapter = {
            onInstalled: {
                addListener: addListenerMock,
            },
            onUninstalled: {
                addListener: vi.fn(),
            },
            onDisabled: {
                addListener: vi.fn(),
            },
            getAll: vi.fn().mockResolvedValue([]),
            get: vi.fn(),
        };

        const storageAdapter = new InMemoryStorageAdapter({
            [ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY]: {},
        });

        // Override the max history limit to test trimming behavior
        (ExtensionsUpdateStorage as any).MAX_HISTORY_ENTRIES = 2;

        const storageService = new ExtensionsUpdateStorage(storageAdapter);
        await storageService.init();

        const mockNotificationService = createMockNotificationService();
        const mockBadgeService = createMockBadgeService();

        const extensionsManagement = new ExtensionsManagement(
            management,
            storageService,
            mockNotificationService,
            mockBadgeService,
        );
        await extensionsManagement.init();

        const handler = addListenerMock.mock.calls[0][0];

        handler({ id: 'trim', name: 'Trim', version: '1.0.0' });
        handler({ id: 'trim', name: 'Trim', version: '1.1.0' });
        handler({ id: 'trim', name: 'Trim', version: '1.2.0' });

        await vi.waitFor(async () => {
            const persisted = await storageAdapter.get(
                ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY,
            );
            // Should keep only the last 2 entries (1.1.0 and 1.2.0)
            expect(persisted.trim.updateHistory.length).toBeLessThanOrEqual(2);
            const versions = persisted.trim.updateHistory.map((e: any) => e.version);
            expect(versions).toContain('1.2.0');
        });
    });

    it('should write updated extension info to the storage', async () => {
        const addListenerMock = vi.fn();
        const management: ManagementAdapter = {
            onInstalled: {
                addListener: addListenerMock,
            },
            onUninstalled: {
                addListener: vi.fn(),
            },
            onDisabled: {
                addListener: vi.fn(),
            },
            getAll: vi.fn().mockResolvedValue([]),
            get: vi.fn(),
        };

        // Use in-memory storage adapter
        const storageAdapter = new InMemoryStorageAdapter({
            [ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY]: {},
        });

        const storageService = new ExtensionsUpdateStorage(storageAdapter);
        await storageService.init();

        const mockNotificationService = createMockNotificationService();
        const mockBadgeService = createMockBadgeService();

        const extensionsManagement = new ExtensionsManagement(
            management,
            storageService,
            mockNotificationService,
            mockBadgeService,
        );

        await extensionsManagement.init();

        const handler = addListenerMock.mock.calls[0][0];

        handler({
            id: 'test-extension',
            name: 'Test Extension',
            version: '1.0.0',
        });

        // Expect the storage to be updated with the new extension info
        await vi.waitFor(async () => {
            const persisted = await storageAdapter.get(
                ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY,
            );
            expect(persisted).toEqual(
                expect.objectContaining({
                    'test-extension': expect.objectContaining({
                        currentVersion: '1.0.0',
                        updateHistory: [
                            expect.objectContaining({
                                version: '1.0.0',
                                detectedTimestampMs: expect.any(Number),
                            }),
                        ],
                    }),
                }),
            );
        });
    });

    describe('reconcileVersions', () => {
        it('should detect and record new extensions not in storage', async () => {
            const management: ManagementAdapter = {
                onInstalled: {
                    addListener: vi.fn(),
                },
                onUninstalled: {
                    addListener: vi.fn(),
                },
                onDisabled: {
                    addListener: vi.fn(),
                },
                get: vi.fn(),
                getAll: vi.fn().mockResolvedValue([
                    { id: 'new-ext-1', name: 'New Ext 1', version: '1.0.0' },
                    { id: 'new-ext-2', name: 'New Ext 2', version: '2.0.0' },
                ]),
            };

            const storageAdapter = new InMemoryStorageAdapter({
                [ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY]: {},
            });

            const storageService = new ExtensionsUpdateStorage(storageAdapter);
            await storageService.init();

            const mockNotificationService = createMockNotificationService();
            const mockBadgeService = createMockBadgeService();

            const extensionsManagement = new ExtensionsManagement(
                management,
                storageService,
                mockNotificationService,
                mockBadgeService,
            );

            await extensionsManagement.reconcileVersions();

            const persisted = await storageAdapter.get(
                ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY,
            );

            expect(persisted['new-ext-1']).toEqual(
                expect.objectContaining({
                    currentVersion: '1.0.0',
                    updateHistory: [
                        expect.objectContaining({
                            version: '1.0.0',
                            detectedTimestampMs: expect.any(Number),
                        }),
                    ],
                }),
            );

            expect(persisted['new-ext-2']).toEqual(
                expect.objectContaining({
                    currentVersion: '2.0.0',
                    updateHistory: [
                        expect.objectContaining({
                            version: '2.0.0',
                            detectedTimestampMs: expect.any(Number),
                        }),
                    ],
                }),
            );
        });

        it('should detect missed version updates when extension was sleeping', async () => {
            const management: ManagementAdapter = {
                onInstalled: {
                    addListener: vi.fn(),
                },
                onUninstalled: {
                    addListener: vi.fn(),
                },
                onDisabled: {
                    addListener: vi.fn(),
                },
                get: vi.fn(),
                getAll: vi.fn().mockResolvedValue([
                    { id: 'updated-ext', name: 'Updated Ext', version: '2.0.0' },
                ]),
            };

            const storageAdapter = new InMemoryStorageAdapter({
                [ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY]: {
                    'updated-ext': {
                        currentVersion: '1.0.0',
                        updateHistory: [
                            {
                                version: '1.0.0',
                                detectedTimestampMs: Date.now() - 1000000,
                            },
                        ],
                    },
                },
            });

            const storageService = new ExtensionsUpdateStorage(storageAdapter);
            await storageService.init();

            const mockNotificationService = createMockNotificationService();
            const mockBadgeService = createMockBadgeService();

            const extensionsManagement = new ExtensionsManagement(
                management,
                storageService,
                mockNotificationService,
                mockBadgeService,
            );

            await extensionsManagement.reconcileVersions();

            const persisted = await storageAdapter.get(
                ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY,
            );

            expect(persisted['updated-ext'].currentVersion).toBe('2.0.0');
            expect(persisted['updated-ext'].updateHistory.length).toBe(2);
            expect(persisted['updated-ext'].updateHistory[0].version).toBe('1.0.0');
            expect(persisted['updated-ext'].updateHistory[1].version).toBe('2.0.0');
        });

        it('should not create duplicate entries when versions match', async () => {
            const management: ManagementAdapter = {
                onInstalled: {
                    addListener: vi.fn(),
                },
                onUninstalled: {
                    addListener: vi.fn(),
                },
                onDisabled: {
                    addListener: vi.fn(),
                },
                get: vi.fn(),
                getAll: vi.fn().mockResolvedValue([
                    { id: 'same-ext', name: 'Same Ext', version: '1.0.0' },
                ]),
            };

            const storageAdapter = new InMemoryStorageAdapter({
                [ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY]: {
                    'same-ext': {
                        currentVersion: '1.0.0',
                        updateHistory: [
                            {
                                version: '1.0.0',
                                detectedTimestampMs: Date.now() - 1000000,
                            },
                        ],
                    },
                },
            });

            const storageService = new ExtensionsUpdateStorage(storageAdapter);
            await storageService.init();

            const mockNotificationService = createMockNotificationService();
            const mockBadgeService = createMockBadgeService();

            const extensionsManagement = new ExtensionsManagement(
                management,
                storageService,
                mockNotificationService,
                mockBadgeService,
            );

            await extensionsManagement.reconcileVersions();

            const persisted = await storageAdapter.get(
                ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY,
            );

            // Should still have only one history entry
            expect(persisted['same-ext'].updateHistory.length).toBe(1);
            expect(persisted['same-ext'].currentVersion).toBe('1.0.0');
        });

        it('should handle mix of new, updated, and unchanged extensions', async () => {
            const management: ManagementAdapter = {
                onInstalled: {
                    addListener: vi.fn(),
                },
                onUninstalled: {
                    addListener: vi.fn(),
                },
                onDisabled: {
                    addListener: vi.fn(),
                },
                get: vi.fn(),
                getAll: vi.fn().mockResolvedValue([
                    { id: 'new-ext', name: 'New', version: '1.0.0' },
                    { id: 'updated-ext', name: 'Updated', version: '2.0.0' },
                    { id: 'unchanged-ext', name: 'Unchanged', version: '1.5.0' },
                ]),
            };

            const storageAdapter = new InMemoryStorageAdapter({
                [ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY]: {
                    'updated-ext': {
                        currentVersion: '1.0.0',
                        updateHistory: [
                            {
                                version: '1.0.0',
                                detectedTimestampMs: Date.now() - 1000000,
                            },
                        ],
                    },
                    'unchanged-ext': {
                        currentVersion: '1.5.0',
                        updateHistory: [
                            {
                                version: '1.5.0',
                                detectedTimestampMs: Date.now() - 1000000,
                            },
                        ],
                    },
                },
            });

            const storageService = new ExtensionsUpdateStorage(storageAdapter);
            await storageService.init();

            const mockNotificationService = createMockNotificationService();
            const mockBadgeService = createMockBadgeService();

            const extensionsManagement = new ExtensionsManagement(
                management,
                storageService,
                mockNotificationService,
                mockBadgeService,
            );

            await extensionsManagement.reconcileVersions();

            const persisted = await storageAdapter.get(
                ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY,
            );

            // New extension should be added
            expect(persisted['new-ext']).toEqual(
                expect.objectContaining({
                    currentVersion: '1.0.0',
                    updateHistory: expect.arrayContaining([
                        expect.objectContaining({ version: '1.0.0' }),
                    ]),
                }),
            );

            // Updated extension should have new version appended
            expect(persisted['updated-ext'].currentVersion).toBe('2.0.0');
            expect(persisted['updated-ext'].updateHistory.length).toBe(2);

            // Unchanged extension should remain the same
            expect(persisted['unchanged-ext'].currentVersion).toBe('1.5.0');
            expect(persisted['unchanged-ext'].updateHistory.length).toBe(1);
        });

        it('should handle empty storage on first reconciliation', async () => {
            const management: ManagementAdapter = {
                onInstalled: {
                    addListener: vi.fn(),
                },
                onUninstalled: {
                    addListener: vi.fn(),
                },
                onDisabled: {
                    addListener: vi.fn(),
                },
                get: vi.fn(),
                getAll: vi.fn().mockResolvedValue([
                    { id: 'ext-1', name: 'Ext 1', version: '1.0.0' },
                    { id: 'ext-2', name: 'Ext 2', version: '2.0.0' },
                ]),
            };

            const storageAdapter = new InMemoryStorageAdapter({
                [ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY]: {},
            });

            const storageService = new ExtensionsUpdateStorage(storageAdapter);
            await storageService.init();

            const mockNotificationService = createMockNotificationService();
            const mockBadgeService = createMockBadgeService();

            const extensionsManagement = new ExtensionsManagement(
                management,
                storageService,
                mockNotificationService,
                mockBadgeService,
            );

            await extensionsManagement.reconcileVersions();

            const persisted = await storageAdapter.get(
                ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY,
            );

            expect(Object.keys(persisted).length).toBe(2);
            expect(persisted['ext-1'].currentVersion).toBe('1.0.0');
            expect(persisted['ext-2'].currentVersion).toBe('2.0.0');
        });

        it('should clean up orphaned data for extensions that are no longer installed', async () => {
            const management: ManagementAdapter = {
                onInstalled: {
                    addListener: vi.fn(),
                },
                onUninstalled: {
                    addListener: vi.fn(),
                },
                onDisabled: {
                    addListener: vi.fn(),
                },
                get: vi.fn(),
                getAll: vi.fn().mockResolvedValue([
                    { id: 'ext-1', name: 'Ext 1', version: '1.0.0' },
                    // ext-2 and ext-3 are no longer installed
                ]),
            };

            const storageAdapter = new InMemoryStorageAdapter({
                [ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY]: {
                    'ext-1': {
                        currentVersion: '1.0.0',
                        updateHistory: [{ version: '1.0.0', detectedTimestampMs: Date.now() }],
                    },
                    'ext-2': {
                        currentVersion: '2.0.0',
                        updateHistory: [{ version: '2.0.0', detectedTimestampMs: Date.now() }],
                    },
                    'ext-3': {
                        currentVersion: '3.0.0',
                        updateHistory: [{ version: '3.0.0', detectedTimestampMs: Date.now() }],
                    },
                },
            });

            const storageService = new ExtensionsUpdateStorage(storageAdapter);
            await storageService.init();

            const mockNotificationService = createMockNotificationService();
            const mockBadgeService = createMockBadgeService();

            const extensionsManagement = new ExtensionsManagement(
                management,
                storageService,
                mockNotificationService,
                mockBadgeService,
            );

            await extensionsManagement.reconcileVersions();

            const persisted = await storageAdapter.get(
                ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY,
            );

            // Only ext-1 should remain
            expect(Object.keys(persisted).length).toBe(1);
            expect(persisted['ext-1']).toBeDefined();
            expect(persisted['ext-2']).toBeUndefined();
            expect(persisted['ext-3']).toBeUndefined();
        });
    });

    describe('onUninstalled', () => {
        it('should clean up storage data when extension is uninstalled', async () => {
            const onUninstalledListenerMock = vi.fn();
            const management: ManagementAdapter = {
                onInstalled: {
                    addListener: vi.fn(),
                },
                onUninstalled: {
                    addListener: onUninstalledListenerMock,
                },
                onDisabled: {
                    addListener: vi.fn(),
                },
                getAll: vi.fn().mockResolvedValue([
                    { id: 'ext-to-uninstall', name: 'Extension To Uninstall', version: '1.0.0' },
                    { id: 'ext-to-keep', name: 'Extension To Keep', version: '2.0.0' },
                ]),
                get: vi.fn(),
            };

            const storageAdapter = new InMemoryStorageAdapter({
                [ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY]: {
                    'ext-to-uninstall': {
                        currentVersion: '1.0.0',
                        updateHistory: [
                            {
                                version: '1.0.0',
                                detectedTimestampMs: Date.now(),
                            },
                        ],
                    },
                    'ext-to-keep': {
                        currentVersion: '2.0.0',
                        updateHistory: [
                            {
                                version: '2.0.0',
                                detectedTimestampMs: Date.now(),
                            },
                        ],
                    },
                },
            });

            const storageService = new ExtensionsUpdateStorage(storageAdapter);
            await storageService.init();

            const mockNotificationService = createMockNotificationService();
            const mockBadgeService = createMockBadgeService();

            const extensionsManagement = new ExtensionsManagement(
                management,
                storageService,
                mockNotificationService,
                mockBadgeService,
            );
            await extensionsManagement.init();

            const handler = onUninstalledListenerMock.mock.calls[0][0];

            // Trigger uninstall - pass ExtensionInfo object, not just string
            await handler({ id: 'ext-to-uninstall', name: 'Extension To Uninstall', version: '1.0.0' });

            // Wait for storage to be updated
            await vi.waitFor(async () => {
                const persisted = await storageAdapter.get(
                    ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY,
                );
                expect(persisted['ext-to-uninstall']).toBeUndefined();
            }, { timeout: 1000 });

            const persisted = await storageAdapter.get(
                ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY,
            );

            // Should remove the uninstalled extension data
            expect(persisted['ext-to-uninstall']).toBeUndefined();
            // Should keep other extensions
            expect(persisted['ext-to-keep']).toBeDefined();
            expect(persisted['ext-to-keep'].currentVersion).toBe('2.0.0');
        });

        it('should handle uninstalling extension that was not tracked', async () => {
            const onUninstalledListenerMock = vi.fn();
            const management: ManagementAdapter = {
                onInstalled: {
                    addListener: vi.fn(),
                },
                onUninstalled: {
                    addListener: onUninstalledListenerMock,
                },
                onDisabled: {
                    addListener: vi.fn(),
                },
                getAll: vi.fn().mockResolvedValue([
                    { id: 'tracked-ext', name: 'Tracked Extension', version: '1.0.0' },
                ]),
                get: vi.fn(),
            };

            const storageAdapter = new InMemoryStorageAdapter({
                [ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY]: {
                    'tracked-ext': {
                        currentVersion: '1.0.0',
                        updateHistory: [
                            {
                                version: '1.0.0',
                                detectedTimestampMs: Date.now(),
                            },
                        ],
                    },
                },
            });

            const storageService = new ExtensionsUpdateStorage(storageAdapter);
            await storageService.init();

            const mockNotificationService = createMockNotificationService();
            const mockBadgeService = createMockBadgeService();

            const extensionsManagement = new ExtensionsManagement(
                management,
                storageService,
                mockNotificationService,
                mockBadgeService,
            );
            await extensionsManagement.init();

            const handler = onUninstalledListenerMock.mock.calls[0][0];

            // Trigger uninstall for extension that was never tracked - pass ExtensionInfo object
            await handler({ id: 'never-tracked-ext', name: 'Never Tracked', version: '1.0.0' });

            const persisted = await storageAdapter.get(
                ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY,
            );

            // Should not throw error and should keep existing data
            expect(persisted['tracked-ext']).toBeDefined();
            expect(persisted['tracked-ext'].currentVersion).toBe('1.0.0');
        });
    });

    describe('onDisabled', () => {
        it('should clear and re-show notification when extension is disabled', async () => {
            const onDisabledListenerMock = vi.fn();
            const mockNotificationService = {
                clearNotification: vi.fn().mockResolvedValue(undefined),
                showUpdateNotification: vi.fn().mockResolvedValue(undefined),
                hasActiveNotification: vi.fn().mockResolvedValue(true), // Active notification exists
            };

            const management: ManagementAdapter = {
                onInstalled: {
                    addListener: vi.fn(),
                },
                onUninstalled: {
                    addListener: vi.fn(),
                },
                onDisabled: {
                    addListener: onDisabledListenerMock,
                },
                getAll: vi.fn().mockResolvedValue([
                    { id: 'disabled-ext', name: 'Disabled Extension', version: '2.0.0', enabled: false },
                ]),
                get: vi.fn(),
            };

            const storageAdapter = new InMemoryStorageAdapter({
                [ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY]: {
                    'disabled-ext': {
                        currentVersion: '2.0.0',
                        updateHistory: [
                            {
                                version: '1.0.0',
                                detectedTimestampMs: Date.now() - 1000000,
                            },
                            {
                                version: '2.0.0',
                                detectedTimestampMs: Date.now(),
                                previousVersion: '1.0.0',
                            },
                        ],
                    },
                },
            });

            const storageService = new ExtensionsUpdateStorage(storageAdapter);
            await storageService.init();

            const mockBadgeService = {
                refresh: vi.fn(),
            };

            const extensionsManagement = new ExtensionsManagement(
                management,
                storageService,
                mockNotificationService as any,
                mockBadgeService as any,
            );
            await extensionsManagement.init();

            const handler = onDisabledListenerMock.mock.calls[0][0];

            // Trigger disable with extension info
            await handler({
                id: 'disabled-ext',
                name: 'Disabled Extension',
                version: '2.0.0',
                enabled: false,
            });

            // Should clear the existing notification
            expect(mockNotificationService.clearNotification).toHaveBeenCalledWith('disabled-ext');

            // Should re-show notification with updated info (grayscale icon, enable/uninstall buttons)
            expect(mockNotificationService.showUpdateNotification).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'disabled-ext',
                    name: 'Disabled Extension',
                    version: '2.0.0',
                    enabled: false,
                }),
                '1.0.0',
            );
        });

        it('should handle disabling extension that has no stored update data', async () => {
            const onDisabledListenerMock = vi.fn();
            const mockNotificationService = {
                clearNotification: vi.fn().mockResolvedValue(undefined),
                showUpdateNotification: vi.fn().mockResolvedValue(undefined),
                hasActiveNotification: vi.fn().mockResolvedValue(false), // No active notification
            };

            const management: ManagementAdapter = {
                onInstalled: {
                    addListener: vi.fn(),
                },
                onUninstalled: {
                    addListener: vi.fn(),
                },
                onDisabled: {
                    addListener: onDisabledListenerMock,
                },
                getAll: vi.fn().mockResolvedValue([]),
                get: vi.fn(),
            };

            const storageAdapter = new InMemoryStorageAdapter({
                [ExtensionsUpdateStorage.EXTENSIONS_UPDATE_STORAGE_KEY]: {},
            });

            const storageService = new ExtensionsUpdateStorage(storageAdapter);
            await storageService.init();

            const mockBadgeService = {
                refresh: vi.fn(),
            };

            const extensionsManagement = new ExtensionsManagement(
                management,
                storageService,
                mockNotificationService as any,
                mockBadgeService as any,
            );
            await extensionsManagement.init();

            const handler = onDisabledListenerMock.mock.calls[0][0];

            // Trigger disable for extension with no stored data
            await handler({
                id: 'new-disabled-ext',
                name: 'New Disabled Extension',
                version: '1.0.0',
                enabled: false,
            });

            // Should check if there's an active notification
            expect(mockNotificationService.hasActiveNotification).toHaveBeenCalledWith('new-disabled-ext');

            // Should NOT clear or show notification since there's no active notification and no stored data
            expect(mockNotificationService.clearNotification).not.toHaveBeenCalled();
            expect(mockNotificationService.showUpdateNotification).not.toHaveBeenCalled();
        });
    });
});
